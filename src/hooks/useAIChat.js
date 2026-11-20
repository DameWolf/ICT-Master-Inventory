import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { EMBEDDED_OPENAI_API_KEY, EMBEDDED_GEMINI_API_KEY } from "../config/aiKeys";

// ── Storage keys ────────────────────────────────────────────
const STORAGE_KEY_PROVIDER = "ict_ai_provider";
const STORAGE_KEY_OPENAI = "ict_ai_key_openai";
const STORAGE_KEY_GEMINI = "ict_ai_key";
const STORAGE_KEY_MSGS = "ict_ai_messages";
const MAX_STORED_MSGS = 200; // max messages persisted to localStorage
const MAX_API_HISTORY = 8; // last N messages sent to model API per request (smaller = faster)
const MAX_CONTEXT_ROWS = 180; // cap row-level context to reduce token latency

// ── API Key helpers ─────────────────────────────────────────
// Priority: env variable (baked in at build) → localStorage (user-configured)
const ENV_OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";
const ENV_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const VALID_PROVIDERS = new Set(["openai", "gemini"]);

export function getAIProvider() {
  const stored = (localStorage.getItem(STORAGE_KEY_PROVIDER) || "").trim().toLowerCase();
  if (VALID_PROVIDERS.has(stored)) return stored;
  return "openai";
}

export function setAIProvider(provider) {
  const normalized = String(provider || "").trim().toLowerCase();
  if (VALID_PROVIDERS.has(normalized)) {
    localStorage.setItem(STORAGE_KEY_PROVIDER, normalized);
  }
}

export function getProviderLabel(provider) {
  return provider === "gemini" ? "Google Gemini" : "OpenAI";
}

function getAIKeyForProvider(provider) {
  if (provider === "gemini") {
    const embeddedGemini = EMBEDDED_GEMINI_API_KEY.trim();
    return embeddedGemini || ENV_GEMINI_API_KEY.trim() || localStorage.getItem(STORAGE_KEY_GEMINI)?.trim() || "";
  }
  const embeddedOpenAI = EMBEDDED_OPENAI_API_KEY.trim();
  return embeddedOpenAI || ENV_OPENAI_API_KEY.trim() || localStorage.getItem(STORAGE_KEY_OPENAI)?.trim() || "";
}

function hasAIKeyForProvider(provider) {
  return Boolean(getAIKeyForProvider(provider));
}

function resolveProviderWithKey(preferredProvider) {
  if (hasAIKeyForProvider(preferredProvider)) return preferredProvider;
  if (preferredProvider !== "openai" && hasAIKeyForProvider("openai")) return "openai";
  if (preferredProvider !== "gemini" && hasAIKeyForProvider("gemini")) return "gemini";
  return preferredProvider;
}

export function getAIKey(provider = null) {
  const chosenProvider = provider || resolveProviderWithKey(getAIProvider());
  if (VALID_PROVIDERS.has(chosenProvider)) {
    return getAIKeyForProvider(chosenProvider);
  }
  const providerWithKey = resolveProviderWithKey(getAIProvider());
  return getAIKeyForProvider(providerWithKey);
}
export function setAIKey(key, provider = getAIProvider()) {
  const trimmedKey = key.trim();
  const storageKey = provider === "gemini" ? STORAGE_KEY_GEMINI : STORAGE_KEY_OPENAI;
  if (trimmedKey) {
    localStorage.setItem(storageKey, trimmedKey);
  } else {
    localStorage.removeItem(storageKey);
  }
}

// Returns true if a key is available from ANY source (env OR localStorage)
export function hasAnyAIKey() {
  return hasAIKeyForProvider("openai") || hasAIKeyForProvider("gemini");
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
 * Builds a fast context with aggregate stats always included, and row-level
 * data included only when the query likely needs specific item lookup.
 */
function buildInventoryContext(inventory, userText = "") {
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

  const query = String(userText || "").toLowerCase();
  const needsItemRows = /\b(which|list|show|find|specific|asset|tag|serial|model|devices?|items?)\b/.test(query);

  const queryTerms = query
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3)
    .slice(0, 8);

  const filteredRows = needsItemRows
    ? inventory.filter((item) => {
        if (queryTerms.length === 0) return true;
        const haystack = [
          item.assetTag,
          item.category,
          item.deviceType,
          item.name,
          item.status,
          item.department,
          item.campus,
          item.yearPurchased,
          item.brand,
          item.model,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return queryTerms.some((term) => haystack.includes(term));
      })
    : [];

  const selectedRows = (needsItemRows ? filteredRows : []).slice(0, MAX_CONTEXT_ROWS);

  const tsvHeader = "assetTag\tcategory\tdeviceType\tstatus\tdepartment\tcampus\tyearPurchased\tbrand\tmodel";
  const tsvRows = selectedRows
    .map((i) =>
      [
        i.assetTag || "",
        i.category || "",
        i.deviceType || i.name || "",
        i.status || "",
        i.department || "",
        i.campus || "",
        i.yearPurchased || "",
        i.brand || "",
        i.model || "",
      ]
        .map((v) => String(v).replace(/\t/g, " "))
        .join("\t")
    )
    .join("\n");

  const rowSection = needsItemRows
    ? `

=== SCOPED DEVICE LIST (TAB-SEPARATED RECORDS) ===
Matched rows: ${filteredRows.length} | Included rows: ${selectedRows.length} | Inventory total: ${total}
${selectedRows.length < filteredRows.length ? "NOTE: Rows were truncated for speed. Ask to \"show more\" or refine filters (department/status/campus/brand)." : ""}
${tsvHeader}
${tsvRows}`
    : "\n\n=== DEVICE LIST OMITTED FOR SPEED ===\nRow-level records are excluded for analytical questions. Ask for specific devices to include matching rows.";

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
${topDevTypes}${rowSection}`;
}

// ── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = (context) => `You are an elite, highly accurate ICT Hardware Inventory Analyst & IT Asset Management Specialist for an educational institution. You have real-time access to the exact hardware inventory data provided below.

## ACCURACY & DATA-GROUNDING MANDATES
1. **Zero Hallucination Policy**: Base ALL numerical counts, lists, asset tags, and statistics strictly on the provided context sections.
2. **Pre-Calculated Stats Primacy**: Always use the PRE-CALCULATED INVENTORY STATISTICS section for category, department, brand, and status counts to ensure 100% mathematical precision.
3. **Specific Item Searches**: When a SCOPED DEVICE LIST section is present, use it for item-level answers and list the assetTags, deviceTypes, brands, and models from that section only.
4. **Truncation Honesty**: If SCOPED DEVICE LIST says rows were truncated, explicitly tell the user and ask whether to fetch a refined list (department/status/campus/brand) for complete item-level accuracy.
5. **Honest Limitations**: If requested data (e.g. serial numbers, specific room numbers) is absent from the dataset, state clearly: "That specific detail is not present in the active inventory database."

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

function isAuthError(errText) {
  const text = (errText || "").toLowerCase();
  return (
    text.includes("api_key") ||
    text.includes("api key") ||
    text.includes("invalid key") ||
    text.includes("not valid") ||
    text.includes("unauthorized") ||
    text.includes("forbidden") ||
    text.includes("401") ||
    text.includes("403")
  );
}

function toOpenAIHistory(messages) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_API_HISTORY)
    .map((m) => ({ role: m.role, content: m.content || " " }));
}

async function* createOpenAIStream({ apiKey, userText, systemPrompt, previousMessages }) {
  const body = {
    model: "gpt-4o-mini",
    stream: true,
    temperature: 0.15,
    max_tokens: 1000,
    messages: [
      { role: "system", content: systemPrompt },
      ...toOpenAIHistory(previousMessages),
      { role: "user", content: userText },
    ],
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let details = "";
    try {
      const json = await response.json();
      details = json?.error?.message || "";
    } catch {
      details = "";
    }
    throw new Error(`OpenAI request failed (${response.status}): ${details || response.statusText}`);
  }

  if (!response.body) {
    throw new Error("OpenAI response did not include a stream body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith("data:")) continue;

      const data = line.slice(5).trim();
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        const token = parsed?.choices?.[0]?.delta?.content;
        if (typeof token === "string" && token) {
          yield token;
        }
      } catch {
        // Ignore malformed SSE chunks and continue streaming
      }
    }
  }
}

async function* createGeminiStream({ apiKey, userText, systemPrompt, previousMessages }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const recentMessages = previousMessages.slice(-MAX_API_HISTORY);
  const history = recentMessages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content || " " }],
  }));

  const candidateModels = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-pro-latest",
  ];

  let result = null;
  let lastErr = null;
  for (const modelName of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });

      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.15,
        },
      });

      result = await chat.sendMessageStream(userText);
      if (result) break;
    } catch (err) {
      lastErr = err;
      if (isAuthError(`${err?.message || ""} ${err?.status || ""}`)) {
        throw err;
      }
    }
  }

  if (!result) {
    throw lastErr || new Error("All Gemini models failed to initialize.");
  }

  for await (const chunk of result.stream) {
    yield chunk.text();
  }
}

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
    const preferredProvider = getAIProvider();
    const activeProvider = resolveProviderWithKey(preferredProvider);
    const apiKey = getAIKeyForProvider(activeProvider);

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
      const context = buildInventoryContext(inventory, userText);
      const systemPrompt = SYSTEM_PROMPT(context);

      // Add optimistic AI message placeholder
      const aiMsg = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };
      setMessages((prev) => [...prev, aiMsg]);

      let fullText = "";
      const stream =
        activeProvider === "gemini"
          ? createGeminiStream({
              apiKey,
              userText,
              systemPrompt,
              previousMessages: prevMessages,
            })
          : createOpenAIStream({
              apiKey,
              userText,
              systemPrompt,
              previousMessages: prevMessages,
            });

      for await (const chunkText of stream) {
        if (abortRef.current) break;
        fullText += chunkText;
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: fullText } : m
          )
        );
      }

      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, streaming: false } : m
        )
      );
    } catch (err) {
      console.error("AI API Error:", err);
      const errText = `${err?.message || ""} ${err?.status || ""}`;
      const isKeyError = isAuthError(errText);

      setError(isKeyError ? "bad_key" : "api_error");
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

  return {
    messages,
    isLoading,
    error,
    setError,
    sendMessage,
    clearChat,
    stopGeneration,
  };
}
