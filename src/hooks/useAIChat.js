import { useState, useCallback, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  DEFAULT_AI_PROVIDER,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENROUTER_MODEL,
} from "../config/aiKeys";

// ── Storage keys ────────────────────────────────────────────
const STORAGE_KEY_MSGS = "ict_ai_messages";
const STORAGE_KEY_RECENT_AI_QUERIES = "ict_ai_recent_queries";
const MAX_STORED_MSGS = 200; // max messages persisted to localStorage
const MAX_API_HISTORY = 8; // last N messages sent to model API per request (smaller = faster)
const MAX_CONTEXT_ROWS = 180; // cap row-level context to reduce token latency
const VALID_REPLY_MODES = new Set(["technical", "executive", "brief", "report"]);
const MAX_RECENT_AI_QUERIES = 8;

// ── API Key helpers ─────────────────────────────────────────
// Priority: build-time environment variables only.
const ENV_OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";
const ENV_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const ENV_ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || "";
const ENV_OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const ENV_AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || "";
const ENV_ANTHROPIC_MODEL = import.meta.env.VITE_ANTHROPIC_MODEL || "";
const ENV_OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || "";
const VALID_PROVIDERS = new Set(["openai", "gemini", "openrouter", "anthropic"]);
const PROVIDER_PRIORITY = ["openai", "gemini", "openrouter", "anthropic"];
const CONFIGURED_PROVIDER = String(ENV_AI_PROVIDER || DEFAULT_AI_PROVIDER || "").trim().toLowerCase();

function normalizeProvider(provider) {
  const normalized = String(provider || "").trim().toLowerCase();
  return VALID_PROVIDERS.has(normalized) ? normalized : "openai";
}

export function getAIProvider() {
  if (VALID_PROVIDERS.has(CONFIGURED_PROVIDER)) return CONFIGURED_PROVIDER;
  for (const provider of PROVIDER_PRIORITY) {
    if (hasAIKeyForProvider(provider)) return provider;
  }
  return "openai";
}

export function setAIProvider(provider) {
  return normalizeProvider(provider);
}

export function getProviderLabel(provider) {
  if (provider === "gemini") return "Google Gemini";
  if (provider === "openrouter") return "OpenRouter";
  if (provider === "anthropic") return "Anthropic";
  return "OpenAI";
}

function getAIKeyForProvider(provider) {
  const normalized = normalizeProvider(provider);
  if (normalized === "gemini") {
    return ENV_GEMINI_API_KEY.trim() || "";
  }
  if (normalized === "openrouter") {
    return ENV_OPENROUTER_API_KEY.trim() || "";
  }
  if (normalized === "anthropic") {
    return ENV_ANTHROPIC_API_KEY.trim() || "";
  }
  return ENV_OPENAI_API_KEY.trim() || "";
}

function hasAIKeyForProvider(provider) {
  return Boolean(getAIKeyForProvider(provider));
}

function resolveProviderWithKey(preferredProvider) {
  if (hasAIKeyForProvider(preferredProvider)) return preferredProvider;
  for (const provider of PROVIDER_PRIORITY) {
    if (provider !== preferredProvider && hasAIKeyForProvider(provider)) return provider;
  }
  return preferredProvider;
}

function getProviderRequestCandidates(preferredProvider) {
  const preferred = normalizeProvider(preferredProvider);
  const orderedProviders = [
    preferred,
    ...PROVIDER_PRIORITY.filter((provider) => provider !== preferred),
  ];
  const candidates = [];

  const add = (provider, apiKey) => {
    const trimmed = String(apiKey || "").trim();
    if (!trimmed) return;
    const exists = candidates.some((c) => c.provider === provider && c.apiKey === trimmed);
    if (!exists) candidates.push({ provider, apiKey: trimmed });
  };

  for (const provider of orderedProviders) {
    add(provider, getAIKeyForProvider(provider));
  }

  return candidates;
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
  return { key: key?.trim?.() || "", provider: normalizeProvider(provider) };
}

// Returns true if a key is available from build-time environment variables.
export function hasAnyAIKey() {
  return PROVIDER_PRIORITY.some((provider) => hasAIKeyForProvider(provider));
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

function loadRecentAIQueries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECENT_AI_QUERIES);
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((q) => typeof q === "string" && q.trim()).slice(0, MAX_RECENT_AI_QUERIES);
  } catch {
    return [];
  }
}

function saveRecentAIQuery(query) {
  const q = String(query || "").trim();
  if (q.length < 2) return;
  const existing = loadRecentAIQueries();
  const next = [q, ...existing.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT_AI_QUERIES);
  try {
    localStorage.setItem(STORAGE_KEY_RECENT_AI_QUERIES, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function getRecentAIQueries() {
  return loadRecentAIQueries();
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

function normalizeReplyMode(mode) {
  const normalized = String(mode || "").trim().toLowerCase();
  return VALID_REPLY_MODES.has(normalized) ? normalized : "technical";
}

function getReplyModeInstruction(mode) {
  const normalized = normalizeReplyMode(mode);
  if (normalized === "executive") {
    return `## ACTIVE RESPONSE MODE: EXECUTIVE
- Use decision-ready language for leaders.
- Keep output concise and high-signal.
- Prioritize business impact, risk, and priority ordering.
- Default length target: 5-10 lines unless user asks for detail.`;
  }

  if (normalized === "brief") {
    return `## ACTIVE RESPONSE MODE: BRIEF
- Keep responses short and direct.
- Use at most 3-6 bullets or a short paragraph.
- Include only the most important metric(s) and conclusion.
- Offer one optional follow-up question for deeper analysis.`;
  }

  if (normalized === "report") {
    return `## ACTIVE RESPONSE MODE: REPORT
- Produce a structured report for operational review.
- Use this exact section order:
  1) **Summary** (2-4 lines)
  2) **Key Metrics Table** (Markdown table with Metric | Value | Insight)
  3) **Findings** (3-6 concise bullets)
  4) **Risks & Gaps** (2-4 bullets)
  5) **Action Plan** (3 numbered actions with priority tags: High/Med/Low)
- Include exact numbers from inventory context.
- Keep language formal, clear, and implementation-focused.`;
  }

  return `## ACTIVE RESPONSE MODE: TECHNICAL
- Use precise technical writing and explicit evidence.
- Include exact counts, assumptions, and caveats where relevant.
- Use compact structure with clear labels and consistent terminology.`;
}

// ── System prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = (context, replyMode = "technical") => `You are an elite, highly accurate ICT Hardware Inventory Analyst & IT Asset Management Specialist for an educational institution. You have real-time access to the exact hardware inventory data provided below.

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
- Write in clear technical prose with short sentences and plain language.
- Start with a 1-line direct answer before details.
- Use this structure when applicable:
  1) **Summary**
  2) **Evidence from Inventory**
  3) **Recommendations**
- Use clean **Markdown tables** for multi-column item lists.
- Use concise bullets instead of long paragraphs.
- Use bold highlights for key metrics and thresholds.
- Avoid filler, repetition, hype language, and unnecessary adjectives.
- Define acronyms once when first used if not obvious.
- End complex responses with **1–3 Executive Action Steps**.
- If the user asks for technical writing, use precise terminology and consistent units.

${getReplyModeInstruction(replyMode)}

${context}`;

function isAuthError(errText) {
  const text = (errText || "").toLowerCase();
  return (
    text.includes("incorrect api key") ||
    text.includes("invalid api key") ||
    text.includes("api key invalid") ||
    text.includes("api_key") ||
    text.includes("api key") ||
    text.includes("invalid key") ||
    text.includes("unauthorized") ||
    text.includes("forbidden") ||
    text.includes("401") ||
    text.includes("403")
  );
}

function isQuotaOrCapacityError(errText) {
  const text = (errText || "").toLowerCase();
  return (
    text.includes("quota") ||
    text.includes("credit balance") ||
    text.includes("too many requests") ||
    text.includes("resource exhausted") ||
    text.includes("high demand") ||
    text.includes("rate limit") ||
    text.includes("429") ||
    text.includes("503")
  );
}

function toOpenAIHistory(messages) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_API_HISTORY)
    .map((m) => ({ role: m.role, content: m.content || " " }));
}

function toAnthropicHistory(messages) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_API_HISTORY)
    .map((m) => ({ role: m.role, content: [{ type: "text", text: m.content || " " }] }));
}

async function* createOpenAIStream({ apiKey, userText, systemPrompt, previousMessages }) {
  yield* createOpenAICompatibleStream({
    apiKey,
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    userText,
    systemPrompt,
    previousMessages,
    extraHeaders: {},
    providerName: "OpenAI",
  });
}

async function* createOpenAICompatibleStream({ apiKey, endpoint, model, userText, systemPrompt, previousMessages, extraHeaders, providerName }) {
  const body = {
    model,
    stream: true,
    temperature: 0.15,
    max_tokens: 1000,
    messages: [
      { role: "system", content: systemPrompt },
      ...toOpenAIHistory(previousMessages),
      { role: "user", content: userText },
    ],
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(extraHeaders || {}),
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
    throw new Error(`${providerName} request failed (${response.status}): ${details || response.statusText}`);
  }

  if (!response.body) {
    throw new Error(`${providerName} response did not include a stream body.`);
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

async function* createOpenRouterStream({ apiKey, userText, systemPrompt, previousMessages }) {
  const model = (ENV_OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL || "openai/gpt-4o-mini").trim();
  yield* createOpenAICompatibleStream({
    apiKey,
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model,
    userText,
    systemPrompt,
    previousMessages,
    extraHeaders: {
      "HTTP-Referer": window.location.origin,
      "X-Title": "ICT Hardware Inventory",
    },
    providerName: "OpenRouter",
  });
}

async function* createAnthropicStream({ apiKey, userText, systemPrompt, previousMessages }) {
  const model = (ENV_ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL || "claude-3-5-sonnet-latest").trim();
  const body = {
    model,
    max_tokens: 1000,
    temperature: 0.15,
    system: systemPrompt,
    messages: [...toAnthropicHistory(previousMessages), { role: "user", content: [{ type: "text", text: userText }] }],
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
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
    throw new Error(`Anthropic request failed (${response.status}): ${details || response.statusText}`);
  }

  const data = await response.json();
  const text = Array.isArray(data?.content)
    ? data.content.filter((c) => c?.type === "text").map((c) => c?.text || "").join("")
    : "";

  if (!text.trim()) {
    throw new Error("Anthropic response did not include text content.");
  }

  yield text;
}

async function* createGeminiStream({ apiKey, userText, systemPrompt, previousMessages }) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const recentMessages = previousMessages.slice(-MAX_API_HISTORY);
  const history = recentMessages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content || " " }],
  }));

  const candidateModels = [
    "gemini-3.8-flash",
    "gemini-3.1-pro-preview",
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
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
  // Messages are session-only so each app restart opens clean.
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading]  = useState(false);
  const [error, setError]          = useState(null);
  const abortRef = useRef(false);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    // Keep compatibility key clean so stale data doesn't reappear.
    localStorage.removeItem(STORAGE_KEY_MSGS);
  }, [messages]);

  const sendMessage = useCallback(async (userText, inventory, options = {}) => {
    const preferredProvider = getAIProvider();
    const providerCandidates = getProviderRequestCandidates(preferredProvider);

    if (providerCandidates.length === 0) {
      setError("no_key");
      return;
    }

    const userMsg = {
      role: "user",
      content: userText,
      timestamp: new Date(),
    };
    saveRecentAIQuery(userText);

    // Snapshot current messages BEFORE adding the new user message
    const prevMessages = messages; // closure captures current state
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    abortRef.current = false;

    try {
      // Build inventory context once per request
      const context = buildInventoryContext(inventory, userText);
      const replyMode = normalizeReplyMode(options.replyMode);
      const systemPrompt = SYSTEM_PROMPT(context, replyMode);

      // Add optimistic AI message placeholder
      const aiMsg = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
        streaming: true,
      };
      setMessages((prev) => [...prev, aiMsg]);

      let fullText = "";
      let streamSucceeded = false;
      let lastErr = null;
      let authFailureCount = 0;
      let quotaOrCapacityFailureCount = 0;

      for (const { provider, apiKey } of providerCandidates) {
        if (!apiKey) continue;

        let providerText = "";
        try {
          const stream =
            provider === "gemini"
              ? createGeminiStream({
                  apiKey,
                  userText,
                  systemPrompt,
                  previousMessages: prevMessages,
                })
              : provider === "anthropic"
              ? createAnthropicStream({
                  apiKey,
                  userText,
                  systemPrompt,
                  previousMessages: prevMessages,
                })
              : provider === "openrouter"
              ? createOpenRouterStream({
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
            providerText += chunkText;
            setMessages((prev) =>
              prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, content: providerText } : m
              )
            );
          }

          fullText = providerText;
          streamSucceeded = true;
          // Persist working provider so next request starts with it.
          setAIProvider(provider);
          break;
        } catch (err) {
          lastErr = err;
          const errText = `${err?.message || ""} ${err?.status || ""}`;
          if (isAuthError(errText)) {
            authFailureCount += 1;
          } else if (isQuotaOrCapacityError(errText)) {
            quotaOrCapacityFailureCount += 1;
          }
          // Do not fall back after partial generation to avoid mixed outputs.
          if (providerText.trim()) {
            throw err;
          }
        }
      }

      if (!streamSucceeded) {
        if (authFailureCount >= providerCandidates.length) {
          const authError = new Error("All configured provider keys were rejected.");
          authError.status = 401;
          throw authError;
        }
        if (quotaOrCapacityFailureCount >= providerCandidates.length) {
          const quotaError = new Error("All configured providers are currently limited by quota, billing, or temporary capacity.");
          quotaError.status = 429;
          throw quotaError;
        }
        throw lastErr || new Error("All configured providers failed.");
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
      const isQuotaError = isQuotaOrCapacityError(errText);

      setError(isKeyError ? "bad_key" : isQuotaError ? "quota_or_capacity" : "api_error");
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

  const addLocalMessage = useCallback((role, content) => {
    if (!content) return;
    setMessages((prev) => [
      ...prev,
      {
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  }, []);

  return {
    messages,
    isLoading,
    error,
    setError,
    sendMessage,
    addLocalMessage,
    clearChat,
    stopGeneration,
  };
}
