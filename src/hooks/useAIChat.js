import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ── Storage keys ────────────────────────────────────────────
const STORAGE_KEY_API    = "ict_ai_key";
const STORAGE_KEY_MSGS   = "ict_ai_messages";
const MAX_STORED_MSGS    = 200;   // max messages persisted to localStorage
const MAX_API_HISTORY    = 20;    // last N messages sent to Gemini API per request

// ── API Key helpers ─────────────────────────────────────────
// Priority: env variable (baked in at build) → localStorage (user-configured)
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

export function getAIKey() {
  // Use the env key first (baked in at build time); fall back to user-saved key
  return ENV_API_KEY || localStorage.getItem(STORAGE_KEY_API) || "";
}
export function setAIKey(key) {
  localStorage.setItem(STORAGE_KEY_API, key.trim());
}

// Returns true if a key is available from ANY source (env OR localStorage)
export function hasAnyAIKey() {
  return Boolean(ENV_API_KEY || localStorage.getItem(STORAGE_KEY_API));
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
  const byBrand    = {};
  const byDevType  = {};
  const currentYear = new Date().getFullYear();

  for (const item of inventory) {
    const status  = item.status   || "Unknown";
    const cat     = item.category || "Unknown";
    const dept    = item.department || "Unknown";
    const campus  = item.campus   || "Unknown";
    const year    = item.yearPurchased || "Unknown";
    const brand   = item.brand || "Unspecified";
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

    if (!byBrand[brand]) byBrand[brand] = { total: 0, functional: 0, defective: 0, forReplacement: 0 };
    byBrand[brand].total++;
    if (status === "Functional")       byBrand[brand].functional++;
    if (status === "Defective")        byBrand[brand].defective++;
    if (status === "For Replacement")  byBrand[brand].forReplacement++;

    byCampus[campus]  = (byCampus[campus]  || 0) + 1;
    byYear[year]      = (byYear[year]      || 0) + 1;
    byDevType[devType]= (byDevType[devType]|| 0) + 1;
  }

  const functional     = byStatus["Functional"]      || 0;
  const defective      = byStatus["Defective"]       || 0;
  const forReplacement = byStatus["For Replacement"] || 0;
  const forUpgrade     = byStatus["For Upgrade"]     || 0;
  const funcPct = total > 0 ? Math.round((functional / total) * 100) : 0;

  // Age calculation
  let over5Years = 0;
  let over3Years = 0;
  Object.entries(byYear).forEach(([y, count]) => {
    const numericYear = parseInt(y, 10);
    if (!isNaN(numericYear)) {
      const age = currentYear - numericYear;
      if (age >= 5) over5Years += count;
      if (age >= 3) over3Years += count;
    }
  });

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

  const brandLines = Object.entries(byBrand)
    .filter(([b]) => b !== "Unspecified")
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 15)
    .map(([b, s]) => {
      const defPct = s.total > 0 ? Math.round((s.defective / s.total) * 100) : 0;
      return `  ${b}: ${s.total} total | ${s.functional} functional | ${s.defective} defective (${defPct}% defect rate) | ${s.forReplacement} for replacement`;
    })
    .join("\n");

  const campusLines = Object.entries(byCampus)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `  ${c}: ${n} units`)
    .join("\n");

  const yearLines = Object.entries(byYear)
    .filter(([y]) => y && y !== "Unknown" && /^\d{4}$/.test(y))
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([y, c]) => `  ${y}: ${c} units (${currentYear - Number(y)} years old)`)
    .join("\n");

  const topDevTypes = Object.entries(byDevType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([d, c]) => `  ${d}: ${c} units`)
    .join("\n");

  // ── Full device-level data (compact TSV) ────────────────
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

  return `=== PRE-CALCULATED INVENTORY STATISTICS ===
Total devices: ${total.toLocaleString()}
Functional: ${functional.toLocaleString()} (${funcPct}%)
Defective: ${defective.toLocaleString()} (${total > 0 ? Math.round((defective / total) * 100) : 0}%)
For Replacement: ${forReplacement.toLocaleString()}
For Upgrade: ${forUpgrade.toLocaleString()}
Aging Fleet: ${over5Years} devices are 5+ years old (${total > 0 ? Math.round((over5Years / total) * 100) : 0}%), ${over3Years} devices are 3+ years old.

BY CATEGORY (total | functional | defective | for_replacement | for_upgrade):
${catLines}

BY DEPARTMENT (total | functional | defective | for_replacement):
${deptLines}

BY BRAND & RELIABILITY (total | functional | defective | defect_rate | for_replacement):
${brandLines || "  No brand data available"}

BY CAMPUS:
${campusLines}

BY PURCHASE YEAR & AGE:
${yearLines || "  No year data available"}

TOP DEVICE TYPES:
${topDevTypes}

=== FULL DEVICE LIST (TAB-SEPARATED RECORDS) ===
${tsvHeader}
${tsvRows}`;
}

// ── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = (context) => `You are an elite, highly accurate ICT Hardware Inventory Analyst & IT Asset Management Specialist for an educational institution. You have real-time access to the exact hardware inventory data provided below.

## ACCURACY & DATA-GROUNDING MANDATES
1. **Zero Hallucination Policy**: Base ALL numerical counts, lists, asset tags, and statistics strictly on the provided PRE-CALCULATED INVENTORY STATISTICS and FULL DEVICE LIST.
2. **Pre-Calculated Stats Primacy**: Always use the PRE-CALCULATED INVENTORY STATISTICS section for category, department, brand, and status counts to ensure 100% mathematical precision.
3. **Specific Item Searches**: When asked for specific devices (e.g., "Which items are defective in IT Dept?"), search through the FULL DEVICE LIST table lines and list the actual assetTags, deviceTypes, brands, and models.
4. **Honest Limitations**: If requested data (e.g. serial numbers, specific room numbers) is absent from the dataset, state clearly: "That specific detail is not present in the active inventory database."

## ANALYTICAL & COMPARATIVE CAPABILITIES
When asked for insights, executive reports, or recommendations, provide deep analysis:
- **Hardware Lifecycles**: Workstations/Desktops (5 yrs), Laptops (3-4 yrs), Servers (5-7 yrs), Network Switches (7-10 yrs), Monitors (7 yrs).
- **Health Benchmark Targets**: Functional target ≥ 85%. Defective rate alarm > 10%. Replacement backlog alarm > 15%.
- **DepEd / EdTech Guidelines**: Recommend 1:2 computer-to-student ratio for labs, multi-year replacement cycles, and standardization on reliable brands.
- **Brand Reliability Analysis**: Flag brands that have an abnormally high defect rate based on the brand breakdown.

## FORMATTING & OUTPUT RULES
- Use clean **Markdown tables** when presenting item lists or multi-column data.
- Use bold highlights (\`**word**\`) for key metrics.
- Use clear sections with subheadings (\`### Section\`).
- End complex responses with **1–3 Executive Action Steps**.

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

      // Models to try in order of preference & compatibility
      const CANDIDATE_MODELS = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-flash-latest",
        "gemini-2.0-flash-exp",
      ];

      const recentMessages = prevMessages.slice(-MAX_API_HISTORY);
      const history = recentMessages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content || " " }],
      }));

      // Add optimistic AI message placeholder
      const aiMsg = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };
      setMessages((prev) => [...prev, aiMsg]);

      let result = null;
      let lastErr = null;

      // Try candidate models in order until one succeeds
      for (const modelName of CANDIDATE_MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
          });

          const chat = model.startChat({
            history,
            generationConfig: {
              maxOutputTokens: 2048,
              temperature: 0.2,
            },
          });

          result = await chat.sendMessageStream(userText);
          // If stream initialization succeeds, break out of retry loop
          if (result) break;
        } catch (err) {
          lastErr = err;
          const errText = err?.message || "";
          // If it's a key error (401/403/API_KEY_INVALID), don't try other models
          if (
            errText.includes("API_KEY") ||
            errText.includes("API key") ||
            errText.includes("401") ||
            errText.includes("403")
          ) {
            throw err;
          }
          // Otherwise, continue loop to try next model name
        }
      }

      if (!result) {
        throw lastErr || new Error("All Gemini models failed to initialize.");
      }

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
      console.error("Gemini AI Error:", err);
      const errText = err?.message || "";
      const isKeyError =
        errText.includes("API_KEY") ||
        errText.includes("API key") ||
        errText.includes("401") ||
        errText.includes("403") ||
        errText.includes("invalid key") ||
        errText.includes("not valid");

      setError(isKeyError ? "bad_key" : "api_error");
      // Remove optimistic AI placeholder, keep user message
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
