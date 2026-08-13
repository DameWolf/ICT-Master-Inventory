import { useState, useCallback, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const STORAGE_KEY = "ict_ai_key";

export function getAIKey() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function setAIKey(key) {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

/**
 * Build a compact but rich inventory context string for the system prompt.
 * Keeps token count low while providing enough data for accurate answers.
 */
function buildInventoryContext(inventory) {
  if (!inventory || inventory.length === 0) return "No inventory data available.";

  const total = inventory.length;
  const byStatus = {};
  const byCategory = {};
  const byDept = {};
  const byCampus = {};
  const byYear = {};
  const byDevType = {};

  for (const item of inventory) {
    const status = item.status || "Unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;

    const cat = item.category || "Unknown";
    if (!byCategory[cat]) byCategory[cat] = { total: 0, functional: 0 };
    byCategory[cat].total++;
    if (status === "Functional") byCategory[cat].functional++;

    const dept = item.department || "Unknown";
    byDept[dept] = (byDept[dept] || 0) + 1;

    const campus = item.campus || "Unknown";
    byCampus[campus] = (byCampus[campus] || 0) + 1;

    const year = item.yearPurchased || "Unknown";
    byYear[year] = (byYear[year] || 0) + 1;

    const devType = item.deviceType || item.name || "Unknown";
    byDevType[devType] = (byDevType[devType] || 0) + 1;
  }

  const functional = byStatus["Functional"] || 0;
  const defective = byStatus["Defective"] || 0;
  const forReplacement = byStatus["For Replacement"] || 0;
  const forUpgrade = byStatus["For Upgrade"] || 0;
  const funcPct = total > 0 ? Math.round((functional / total) * 100) : 0;

  // Top 10 departments
  const topDepts = Object.entries(byDept)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([d, c]) => `  - ${d}: ${c} units`)
    .join("\n");

  // All categories
  const catLines = Object.entries(byCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, d]) => {
      const pct = d.total > 0 ? Math.round((d.functional / d.total) * 100) : 0;
      return `  - ${cat}: ${d.total} units (${pct}% functional)`;
    })
    .join("\n");

  // Campus breakdown
  const campusLines = Object.entries(byCampus)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `  - ${c}: ${n} units`)
    .join("\n");

  // Top device types
  const topDevTypes = Object.entries(byDevType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([d, c]) => `  - ${d}: ${c} units`)
    .join("\n");

  // Year distribution
  const yearLines = Object.entries(byYear)
    .filter(([y]) => y && y !== "Unknown" && /^\d{4}$/.test(y))
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([y, c]) => `  - ${y}: ${c} units`)
    .join("\n");

  // Sample of defective/at-risk items (up to 10)
  const atRisk = inventory
    .filter((i) => i.status === "Defective" || i.status === "For Replacement")
    .slice(0, 10)
    .map((i) => `  - [${i.status}] ${i.deviceType || i.name} | ${i.category} | ${i.department || "N/A"} | ${i.campus || "N/A"} | Tag: ${i.assetTag || "N/A"}`)
    .join("\n");

  return `INVENTORY SUMMARY:
- Total devices: ${total.toLocaleString()}
- Functional: ${functional.toLocaleString()} (${funcPct}%)
- Defective: ${defective.toLocaleString()}
- For Replacement: ${forReplacement.toLocaleString()}
- For Upgrade: ${forUpgrade.toLocaleString()}

BY CATEGORY:
${catLines}

BY CAMPUS:
${campusLines}

TOP DEPARTMENTS (by device count):
${topDepts}

TOP DEVICE TYPES:
${topDevTypes}

PURCHASE YEAR DISTRIBUTION:
${yearLines || "  - No year data available"}

SAMPLE OF AT-RISK DEVICES (Defective/For Replacement):
${atRisk || "  - None found"}`;
}

const SYSTEM_PROMPT = (context) => `You are an expert ICT Hardware Inventory Assistant for a school institution. You have access to the live inventory data below. Answer questions accurately, concisely, and helpfully based on this data.

When asked about counts, percentages, or statistics — use the data provided. When asked for recommendations, use your knowledge of IT asset management best practices. Keep responses clear and well-structured. Use bullet points or short paragraphs.

LIVE INVENTORY DATA:
${context}

Guidelines:
- Be concise — aim for 3–6 sentences or a short list unless a detailed breakdown is requested.
- If data is not available for a specific query, say so clearly.
- For procurement or upgrade recommendations, base your advice on the age, status, and volume of devices.
- You can mention specific departments, categories, or campuses when relevant.
- Do not hallucinate numbers — only use figures from the data above.`;

export function useAIChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);

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
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);
    abortRef.current = false;

    try {
      const context = buildInventoryContext(inventory);
      const systemPrompt = SYSTEM_PROMPT(context);

      const genAI = new GoogleGenerativeAI(apiKey);

      // systemInstruction MUST go in getGenerativeModel, not startChat
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemPrompt,
      });

      // Build chat history from existing messages only (NOT the current user message)
      // messages here is the snapshot before setState ran, so it's correct
      const history = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content || " " }],
      }));

      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.4,
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
        const chunkText = chunk.text();
        fullText += chunkText;
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
      // Remove the optimistic AI placeholder if it was added, keep the user message
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
    setError(null);
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current = true;
    setIsLoading(false);
  }, []);

  return { messages, isLoading, error, setError, sendMessage, clearChat, stopGeneration };
}
