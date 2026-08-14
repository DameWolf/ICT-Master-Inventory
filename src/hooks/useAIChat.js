import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Storage keys ────────────────────────────────────────────
const STORAGE_KEY_API    = "ict_ai_key";
const STORAGE_KEY_MSGS   = "ict_ai_messages";
const MAX_STORED_MSGS    = 200;   // max messages persisted to localStorage
const MAX_API_HISTORY    = 20;    // last N messages sent to Gemini API per request

// ── API Key helpers ─────────────────────────────────────────
export function getAIKey() {
  return localStorage.getItem(STORAGE_KEY_API) || "";
}
export function setAIKey(key) {
  localStorage.setItem(STORAGE_KEY_API, key.trim());
}

// ── Message persistence ─────────────────────────────────────
function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MSGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Rehydrate timestamps back to Date objects
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  try {
    // Only persist the most recent MAX_STORED_MSGS messages
    const toStore = messages.slice(-MAX_STORED_MSGS);
    localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(toStore));
  } catch {
    // Quota exceeded — silently skip
  }
}

// ── Inventory context builder ────────────────────────────────
/**
 * Builds a rich, two-part context:
 *   1. Aggregate statistics (always included)
 *   2. Full device-level compact TSV (all items, token-efficient)
 *
 * Gemini Flash has a 1M token window, so including all items is safe
 * and gives the model the ability to answer precise per-item questions.
 */
function buildInventoryContext(inventory) {
  if (!inventory || inventory.length === 0) return "No inventory data available.";

  const total = inventory.length;
  const byStatus   = {};
  const byCategory = {};
  const byDept     = {};
  const byCampus   = {};
  const byYear     = {};
  const byDevType  = {};

  for (const item of inventory) {
    const status  = item.status   || "Unknown";
    const cat     = item.category || "Unknown";
    const dept    = item.department || "Unknown";
    const campus  = item.campus   || "Unknown";
    const year    = item.yearPurchased || "Unknown";
    const devType = item.deviceType || item.name || "Unknown";

    byStatus[status] = (byStatus[status] || 0) + 1;

    if (!byCategory[cat]) byCategory[cat] = { total: 0, functional: 0, defective: 0, forReplacement: 0, forUpgrade: 0 };
    byCategory[cat].total++;
    if (status === "Functional")       byCategory[cat].functional++;
    if (status === "Defective")        byCategory[cat].defective++;
    if (status === "For Replacement")  byCategory[cat].forReplacement++;
    if (status === "For Upgrade")      byCategory[cat].forUpgrade++;

    if (!byDept[dept]) byDept[dept] = { total: 0, functional: 0, defective: 0, forReplacement: 0 };
    byDept[dept].total++;
    if (status === "Functional")       byDept[dept].functional++;
    if (status === "Defective")        byDept[dept].defective++;
    if (status === "For Replacement")  byDept[dept].forReplacement++;

    byCampus[campus]  = (byCampus[campus]  || 0) + 1;
    byYear[year]      = (byYear[year]      || 0) + 1;
    byDevType[devType]= (byDevType[devType]|| 0) + 1;
  }

  const functional     = byStatus["Functional"]      || 0;
  const defective      = byStatus["Defective"]       || 0;
  const forReplacement = byStatus["For Replacement"] || 0;
  const forUpgrade     = byStatus["For Upgrade"]     || 0;
  const funcPct = total > 0 ? Math.round((functional / total) * 100) : 0;

  // ── Aggregate stats ──────────────────────────────────────
  const catLines = Object.entries(byCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, d]) => {
      const pct = d.total > 0 ? Math.round((d.functional / d.total) * 100) : 0;
      return `  ${cat}: ${d.total} total | ${d.functional} functional (${pct}%) | ${d.defective} defective | ${d.forReplacement} for replacement | ${d.forUpgrade} for upgrade`;
    })
    .join("\n");

  const deptLines = Object.entries(byDept)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([d, s]) => {
      const pct = s.total > 0 ? Math.round((s.functional / s.total) * 100) : 0;
      return `  ${d}: ${s.total} total | ${s.functional} functional (${pct}%) | ${s.defective} defective | ${s.forReplacement} for replacement`;
    })
    .join("\n");

  const campusLines = Object.entries(byCampus)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `  ${c}: ${n} units`)
    .join("\n");

  const yearLines = Object.entries(byYear)
    .filter(([y]) => y && y !== "Unknown" && /^\d{4}$/.test(y))
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([y, c]) => `  ${y}: ${c} units`)
    .join("\n");

  const topDevTypes = Object.entries(byDevType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([d, c]) => `  ${d}: ${c} units`)
    .join("\n");

  // ── Full device-level data (compact TSV) ────────────────
  // Columns: assetTag | category | deviceType | status | department | campus | yearPurchased | brand | model
  const tsvHeader = "assetTag\tcategory\tdeviceType\tstatus\tdepartment\tcampus\tyearPurchased\tbrand\tmodel";
  const tsvRows = inventory
    .map((i) =>
      [
        i.assetTag       || "",
        i.category       || "",
        i.deviceType     || i.name || "",
        i.status         || "",
        i.department     || "",
        i.campus         || "",
        i.yearPurchased  || "",
        i.brand          || "",
        i.model          || "",
      ]
        .map((v) => String(v).replace(/\t/g, " "))
        .join("\t")
    )
    .join("\n");

  return `=== INVENTORY STATISTICS ===
Total devices: ${total.toLocaleString()}
Functional: ${functional.toLocaleString()} (${funcPct}%)
Defective: ${defective.toLocaleString()}
For Replacement: ${forReplacement.toLocaleString()}
For Upgrade: ${forUpgrade.toLocaleString()}

BY CATEGORY (total | functional | defective | for_replacement | for_upgrade):
${catLines}

BY DEPARTMENT (total | functional | defective | for_replacement):
${deptLines}

BY CAMPUS:
${campusLines}

BY PURCHASE YEAR:
${yearLines || "  No year data available"}

TOP DEVICE TYPES:
${topDevTypes}

=== FULL DEVICE LIST (TAB-SEPARATED) ===
${tsvHeader}
${tsvRows}`;
}

// ── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = (context) => `You are an expert ICT Hardware Inventory Assistant for a school institution. You have full, real-time access to the complete hardware inventory data below — every single device record is included in the FULL DEVICE LIST section.

Your capabilities:
- Answer precise questions about specific asset tags, devices, departments, or campuses
- Compute counts, percentages, and breakdowns on demand
- Identify trends in purchasing years and flag aging equipment
- Provide evidence-based procurement and lifecycle recommendations

Rules:
- Always derive numbers directly from the data — never estimate or hallucinate
- When asked about a specific department, campus, category, or device type, look it up in the FULL DEVICE LIST
- Cross-reference the aggregate stats with the full list when needed for accuracy
- For recommendations, combine data-driven findings with IT asset management best practices
- Be concise unless the user asks for a detailed breakdown
- Remember and build on previous questions in this conversation for context-aware answers

${context}`;

// ── Hook ─────────────────────────────────────────────────────
export function useAIChat() {
  // Load persisted messages on first mount
  const [messages, setMessages] = useState(() => loadMessages());
  const [isLoading, setIsLoading]  = useState(false);
  const [error, setError]          = useState(null);
  const abortRef = useRef(false);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  const sendMessage = useCallback(async (userText, inventory) => {
    const apiKey = getAIKey();
    if (!apiKey) {
      setError("no_key");
      return;
    }

    const userMsg = {
      role: "user",
      content: userText,
      timestamp: new Date(),
    };

    // Snapshot current messages BEFORE adding the new user message
    const prevMessages = messages; // closure captures current state
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    abortRef.current = false;

    try {
      // Build inventory context once per request
      const context = buildInventoryContext(inventory);
      const systemPrompt = SYSTEM_PROMPT(context);

      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        systemInstruction: systemPrompt,
      });

      // Send only the last MAX_API_HISTORY messages to the API
      // to control token usage while still giving the AI meaningful memory
      const recentMessages = prevMessages.slice(-MAX_API_HISTORY);
      const history = recentMessages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content || " " }],
      }));

      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.3,
        },
      });

      // Add optimistic AI message placeholder
      const aiMsg = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Stream the response
      const result = await chat.sendMessageStream(userText);

      let fullText = "";
      for await (const chunk of result.stream) {
        if (abortRef.current) break;
        fullText += chunk.text();
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: fullText } : m
          )
        );
      }

      // Mark streaming done
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, streaming: false } : m
        )
      );
    } catch (err) {
      const errText = err?.message || "";
      const isKeyError =
        errText.includes("API_KEY") ||
        errText.includes("API key") ||
        errText.includes("401") ||
        errText.includes("403");
      setError(isKeyError ? "bad_key" : "api_error");
      // Remove the optimistic AI placeholder, keep the user message
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && last?.streaming
          ? prev.slice(0, -1)
          : prev;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY_MSGS);
    setError(null);
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, setError, sendMessage, clearChat, stopGeneration };
}
