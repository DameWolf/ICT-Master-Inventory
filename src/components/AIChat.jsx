import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAIChat, hasAnyAIKey, getRecentAIQueries } from "../hooks/useAIChat";
import { useVoice } from "../hooks/useVoice";
import aiRobotIcon from "../assets/ai_assistant.png";
import "./AIChat.css";

const WakeSpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;
const WAKE_WORD_ENABLED_KEY = "ict_ai_wake_word_enabled";
const WAKE_PATTERNS = [
  /\bhey\s+rachel\b/i,
  /\bok(?:ay)?\s+rachel\b/i,
  /\brachel\b/i,
];
const WAKE_PREFIX_STRIP = /^(?:\s*(?:hey|ok(?:ay)?)\s+)?rachel\s*[,.:;-]*\s*/i;

const SUGGESTED_PROMPTS = [
  "📊 What's the overall health of our inventory?",
  "⚠️ Which departments have the most defective devices?",
  "🖥️ How many Computing Devices are functional?",
  "📅 Which purchase years have the most aging equipment?",
  "🔧 What should we prioritize for replacement?",
  "🏫 How does the campus device distribution look?",
  "📈 How does our functional rate compare to industry benchmarks?",
  "⏳ Which devices have exceeded their recommended lifecycle?",
  "💰 Give me a procurement priority list based on the data",
  "🔍 Are there any brands with unusually high defect rates?",
];

function TypingIndicator() {
  return (
    <div className="ai-typing-indicator" aria-label="AI Assistant is thinking">
      <span />
      <span />
      <span />
    </div>
  );
}

function MessageBubble({ message, onReplay, isSpeakingThis, onStopSpeaking, ttsSupported }) {
  const isUser = message.role === "user";

  // Simple markdown-like rendering: bold, bullets
  const renderContent = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    const elements = [];
    let i = 0;

    const formatInline = (str) => {
      if (!str) return "";
      return str
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/`(.*?)`/g, "<code class=\"ai-inline-code\">$1</code>")
        .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="ai-inline-img" />');
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect Table: line starts and ends with | or contains |
      if (trimmed.startsWith("|") && trimmed.endsWith("|") && lines[i + 1] && lines[i + 1].includes("|-")) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const headers = tableLines[0]
            .split("|")
            .slice(1, -1)
            .map((h) => h.trim());
          
          // Skip divider line (index 1)
          const rowLines = tableLines.slice(2);
          const rows = rowLines.map((r) =>
            r
              .split("|")
              .slice(1, -1)
              .map((cell) => cell.trim())
          );

          elements.push(
            <div key={`table-${i}`} className="ai-table-wrapper">
              <table className="ai-markdown-table">
                <thead>
                  <tr>
                    {headers.map((h, idx) => (
                      <th key={idx} dangerouslySetInnerHTML={{ __html: formatInline(h) }} />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // Detect Headings (### Header, ## Header, # Header)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2];
        const Tag = level === 1 ? "h3" : level === 2 ? "h4" : "h5";
        elements.push(
          <Tag key={`head-${i}`} className="ai-md-heading" dangerouslySetInnerHTML={{ __html: formatInline(title) }} />
        );
        i++;
        continue;
      }

      // Detect Bullets / Lists
      const isBullet = /^[-•*]\s+/.test(trimmed);
      const isNumbered = /^\d+\.\s+/.test(trimmed);

      if (isBullet || isNumbered) {
        const listItems = [];
        const isNum = isNumbered;
        while (i < lines.length) {
          const curTrim = lines[i].trim();
          if (isNum ? /^\d+\.\s+/.test(curTrim) : /^[-•*]\s+/.test(curTrim)) {
            const content = curTrim.replace(/^([-•*]|\d+\.)\s+/, "");
            listItems.push(content);
            i++;
          } else {
            break;
          }
        }
        const ListTag = isNum ? "ol" : "ul";
        elements.push(
          <ListTag key={`list-${i}`} className="ai-md-list">
            {listItems.map((item, idx) => (
              <li key={idx} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            ))}
          </ListTag>
        );
        continue;
      }

      // Regular Paragraph or Line Break
      if (trimmed) {
        elements.push(
          <p key={`p-${i}`} className="ai-md-p" dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
        );
      } else {
        elements.push(<br key={`br-${i}`} />);
      }
      i++;
    }

    return elements;
  };

  const time = message.timestamp
    ? message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`ai-message ${isUser ? "ai-message--user" : "ai-message--ai"}`}>
      {!isUser && (
        <div className="ai-avatar" aria-label="AI Assistant">
          <img src={aiRobotIcon} alt="AI Assistant" className="ai-avatar-robot-img" />
        </div>
      )}
      <div className="ai-bubble">
        <div className="ai-bubble-content">
          {message.content ? renderContent(message.content) : null}
          {message.streaming && !message.content && <TypingIndicator />}
        </div>
        <div className="ai-bubble-footer">
          <span className="ai-bubble-time">{time}</span>
          {!isUser && message.content && !message.streaming && ttsSupported && (
            <button
              className={`ai-speak-btn ${isSpeakingThis ? "ai-speak-btn--active" : ""}`}
              onClick={() => isSpeakingThis ? onStopSpeaking?.() : onReplay?.(message.content)}
              title={isSpeakingThis ? "Stop speaking" : "Read aloud"}
              aria-label={isSpeakingThis ? "Stop speaking" : "Read this message aloud"}
            >
              {isSpeakingThis ? (
                <>
                  <span className="ai-speak-wave">
                    <span /><span /><span />
                  </span>
                  ⏹
                </>
              ) : "🔊"}
            </button>
          )}
        </div>
      </div>
      {isUser && (
        <div className="ai-avatar ai-avatar--user" aria-label="You">
          👤
        </div>
      )}
    </div>
  );
}

function NoKeyScreen() {
  return (
    <div className="ai-nokey">
      <div className="ai-nokey-icon">🔑</div>
      <h3>AI is not configured</h3>
      <p>
        Add your provider and API key directly in src/config/aiKeys.js, then reload the app.
      </p>
    </div>
  );
}

const FAB_POS_KEY = "ict_ai_fab_pos";
const REPLY_MODE_KEY = "ict_ai_reply_mode";
const REPLY_MODES = [
  { value: "executive", label: "Executive" },
  { value: "technical", label: "Technical" },
  { value: "brief", label: "Brief" },
  { value: "report", label: "Report" },
];

function getStoredFabPos() {
  try {
    const data = window.localStorage.getItem(FAB_POS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

const VOICE_HELP_TEXT = `Voice commands:
- Find item <asset tag or keyword>
- Set status of <asset tag> to Functional|Defective|For Upgrade|For Replacement
- Assign user of <asset tag> to <name>
- Set department of <asset tag> to <department>
- Create item <device type> with asset tag <tag> (then say: confirm create)
- Delete item <asset tag> (then say: confirm delete)
- Say cancel to cancel a pending command`;

function normalizeStatusLabel(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;
  if (value === "functional") return "Functional";
  if (value === "defective") return "Defective";
  if (value === "for upgrade" || value === "upgrade") return "For Upgrade";
  if (value === "for replacement" || value === "replacement") return "For Replacement";
  return null;
}

export default function AIChat({
  inventory,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onRequireAuth,
}) {
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [recentAIQueries, setRecentAIQueries] = useState(() => getRecentAIQueries());
  const [replyMode, setReplyMode] = useState(
    () => window.localStorage.getItem(REPLY_MODE_KEY) || "technical"
  );
  const [hasKey, setHasKey] = useState(() => hasAnyAIKey());
  const [fabPos, setFabPos] = useState(getStoredFabPos);
  const [isDragging, setIsDragging] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => {
    try {
      return window.localStorage.getItem(WAKE_WORD_ENABLED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [pendingVoiceAction, setPendingVoiceAction] = useState(null);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState(-1);
  const [voiceMode, setVoiceMode] = useState(false); // true when user initiated via mic
  const { messages, isLoading, error, setError, sendMessage, addLocalMessage, clearChat, stopGeneration } =
    useAIChat();

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    sttSupported,
    isSpeaking,
    isSpeechPaused,
    speak,
    pauseSpeaking,
    resumeSpeaking,
    stopSpeaking,
    replayMessage,
    ttsSupported,
    voices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    speechRate,
    setSpeechRate,
    expressiveVoice,
    setExpressiveVoice,
    autoSpeak,
    setAutoSpeak,
    speechEngine,
    setSpeechEngine,
    elevenVoiceId,
    setElevenVoiceId,
    elevenStylePreset,
    setElevenStylePreset,
    elevenLabsAvailable,
    elevenLabsProfiles,
    elevenLabsStylePresets,
  } = useVoice();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const fabRef = useRef(null);
  const wakeRecognitionRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(WAKE_WORD_ENABLED_KEY, wakeWordEnabled ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }, [wakeWordEnabled]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && hasKey && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open, hasKey]);

  // Re-check key every time the panel opens
  useEffect(() => {
    if (open) {
      const key = hasAnyAIKey();
      setHasKey(key);
      if (!key) setError(null);
      else if (error === "no_key") setError(null);
    }
  }, [open]);

  useEffect(() => {
    window.localStorage.setItem(REPLY_MODE_KEY, replyMode);
  }, [replyMode]);

  // Handle dragging the Ask AI button anywhere on screen
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const btn = fabRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialLeft = rect.left;
    const initialTop = rect.top;
    let hasMoved = false;

    const onPointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!hasMoved && Math.hypot(dx, dy) > 4) {
        hasMoved = true;
        setIsDragging(true);
      }

      if (hasMoved) {
        let newX = initialLeft + dx;
        let newY = initialTop + dy;

        const maxX = window.innerWidth - rect.width - 10;
        const maxY = window.innerHeight - rect.height - 10;
        newX = Math.max(10, Math.min(newX, maxX));
        newY = Math.max(10, Math.min(newY, maxY));

        setFabPos({ x: newX, y: newY });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      if (hasMoved) {
        setTimeout(() => setIsDragging(false), 50);
        if (fabRef.current) {
          const finalRect = fabRef.current.getBoundingClientRect();
          const finalPos = { x: finalRect.left, y: finalRect.top };
          setFabPos(finalPos);
          localStorage.setItem(FAB_POS_KEY, JSON.stringify(finalPos));
        }
      } else {
        setOpen((v) => !v);
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const handleSend = useCallback(async () => {
    const text = inputVal.trim();
    if (!text || isLoading) return;
    setInputVal("");
    const prevMsgCount = messages.length;
    const handled = await handleVoiceOrCommandAction(text);
    if (!handled) {
      await sendMessage(text, inventory, { replyMode });
    }
    setRecentAIQueries(getRecentAIQueries());
  }, [inputVal, isLoading, sendMessage, inventory, messages.length, replyMode]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const findInventoryMatches = useCallback((queryText) => {
    const q = String(queryText || "").trim().toLowerCase();
    if (!q) return [];
    return (inventory || []).filter((item) => {
      const haystack = [
        item.assetTag,
        item.name,
        item.deviceType,
        item.department,
        item.assignedUser,
        item.campus,
        item.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [inventory]);

  const findSingleByAssetTag = useCallback((assetTagLike) => {
    const q = String(assetTagLike || "").trim().toLowerCase();
    if (!q) return null;
    return (inventory || []).find((item) => String(item.assetTag || "").trim().toLowerCase() === q) || null;
  }, [inventory]);

  const canMutate = useCallback(() => {
    if (!onRequireAuth) return true;
    return onRequireAuth();
  }, [onRequireAuth]);

  const executePendingVoiceAction = useCallback(async () => {
    if (!pendingVoiceAction) return true;

    if (!canMutate()) {
      addLocalMessage("assistant", "Sign in is required before editing inventory records.");
      return true;
    }

    if (pendingVoiceAction.type === "delete") {
      const item = pendingVoiceAction.payload?.item;
      if (!item || typeof onDeleteItem !== "function") {
        addLocalMessage("assistant", "Delete action is not available in this context.");
        return true;
      }
      await onDeleteItem(item.id);
      addLocalMessage("assistant", `Deleted ${item.assetTag || item.id} (${item.deviceType || item.name || "item"}).`);
      return true;
    }

    if (pendingVoiceAction.type === "create") {
      const draft = pendingVoiceAction.payload?.draft;
      if (!draft || typeof onAddItem !== "function") {
        addLocalMessage("assistant", "Create action is not available in this context.");
        return true;
      }
      const created = await onAddItem(draft);
      addLocalMessage(
        "assistant",
        `Created item ${created?.assetTag || draft.assetTag || "(no tag)"}: ${created?.deviceType || draft.deviceType || draft.name || "New Device"}.`
      );
      return true;
    }

    return false;
  }, [pendingVoiceAction, canMutate, addLocalMessage, onDeleteItem, onAddItem]);

  const handleVoiceOrCommandAction = useCallback(async (rawText) => {
    const originalText = String(rawText || "").trim();
    const text = originalText.replace(WAKE_PREFIX_STRIP, "").trim();
    if (!text) return false;

    const isCancel = /^(?:cancel|abort|stop|nevermind|never mind)$/i.test(text);
    if (isCancel && pendingVoiceAction) {
      addLocalMessage("user", originalText);
      setPendingVoiceAction(null);
      addLocalMessage("assistant", "Pending voice command canceled.");
      return true;
    }

    const isConfirm = /^(?:confirm|yes|proceed|confirm\s+delete|confirm\s+create)$/i.test(text);
    if (isConfirm && pendingVoiceAction) {
      addLocalMessage("user", originalText);
      await executePendingVoiceAction();
      setPendingVoiceAction(null);
      return true;
    }

    const findMatch = text.match(/^(?:find|search|look\s*up|show)\s+(?:item\s+)?(.+)$/i);
    if (findMatch) {
      const query = findMatch[1].trim();
      const matches = findInventoryMatches(query).slice(0, 6);
      addLocalMessage("user", originalText);
      if (matches.length === 0) {
        addLocalMessage("assistant", `No inventory items found for "${query}".`);
      } else {
        const lines = matches.map((m) => `- ${m.assetTag || "(no tag)"} | ${m.deviceType || m.name || "Unknown"} | ${m.status || "Unknown"} | ${m.department || "Unknown"}`);
        addLocalMessage("assistant", `Found ${matches.length} matching item(s):\n${lines.join("\n")}`);
      }
      return true;
    }

    const statusMatch = text.match(/^(?:set|update|change)\s+(?:the\s+)?status\s+(?:of\s+)?(.+?)\s+(?:to|as)\s+(.+)$/i);
    if (statusMatch) {
      const assetTag = statusMatch[1].trim();
      const status = normalizeStatusLabel(statusMatch[2]);
      addLocalMessage("user", originalText);
      if (!status) {
        addLocalMessage("assistant", `I couldn't map that status. Use Functional, Defective, For Upgrade, or For Replacement.\n\n${VOICE_HELP_TEXT}`);
        return true;
      }
      const item = findSingleByAssetTag(assetTag);
      if (!item) {
        addLocalMessage("assistant", `I couldn't find asset tag "${assetTag}".`);
        return true;
      }
      if (!canMutate()) {
        addLocalMessage("assistant", "Sign in is required before editing inventory records.");
        return true;
      }
      if (typeof onUpdateItem === "function") {
        await onUpdateItem(item.id, { status });
        addLocalMessage("assistant", `Updated ${item.assetTag || item.id} status to ${status}.`);
      } else {
        addLocalMessage("assistant", "Update action is not available in this context.");
      }
      return true;
    }

    const userAssignMatch = text.match(/^(?:assign|set)\s+(?:user|assigned\s+user)\s+(?:of\s+)?(.+?)\s+to\s+(.+)$/i);
    if (userAssignMatch) {
      const assetTag = userAssignMatch[1].trim();
      const assignedUser = userAssignMatch[2].trim();
      addLocalMessage("user", originalText);
      const item = findSingleByAssetTag(assetTag);
      if (!item) {
        addLocalMessage("assistant", `I couldn't find asset tag "${assetTag}".`);
        return true;
      }
      if (!canMutate()) {
        addLocalMessage("assistant", "Sign in is required before editing inventory records.");
        return true;
      }
      if (typeof onUpdateItem === "function") {
        await onUpdateItem(item.id, { assignedUser });
        addLocalMessage("assistant", `Updated ${item.assetTag || item.id} assigned user to ${assignedUser}.`);
      } else {
        addLocalMessage("assistant", "Update action is not available in this context.");
      }
      return true;
    }

    const departmentMatch = text.match(/^(?:set|change|update)\s+department\s+(?:of\s+)?(.+?)\s+to\s+(.+)$/i);
    if (departmentMatch) {
      const assetTag = departmentMatch[1].trim();
      const department = departmentMatch[2].trim();
      addLocalMessage("user", originalText);
      const item = findSingleByAssetTag(assetTag);
      if (!item) {
        addLocalMessage("assistant", `I couldn't find asset tag "${assetTag}".`);
        return true;
      }
      if (!canMutate()) {
        addLocalMessage("assistant", "Sign in is required before editing inventory records.");
        return true;
      }
      if (typeof onUpdateItem === "function") {
        await onUpdateItem(item.id, { department });
        addLocalMessage("assistant", `Updated ${item.assetTag || item.id} department to ${department}.`);
      } else {
        addLocalMessage("assistant", "Update action is not available in this context.");
      }
      return true;
    }

    const createMatch = text.match(/^(?:create|add)\s+(?:item\s+)?(.+?)\s+(?:with\s+asset\s+tag\s+|asset\s+tag\s+)([a-z0-9\-_/]+)(?:\s+confirm)?$/i);
    if (createMatch) {
      const deviceType = createMatch[1].trim();
      const assetTag = createMatch[2].trim();
      const immediateConfirm = /\bconfirm\b/i.test(text);
      addLocalMessage("user", originalText);

      if (!deviceType || !assetTag) {
        addLocalMessage("assistant", `Please include both device type and asset tag.\n\n${VOICE_HELP_TEXT}`);
        return true;
      }

      if (findSingleByAssetTag(assetTag)) {
        addLocalMessage("assistant", `Asset tag "${assetTag}" already exists.`);
        return true;
      }

      const fallbackCampus = (inventory || []).find((i) => i.campus)?.campus || "Main";
      const fallbackDept = (inventory || []).find((i) => i.department)?.department || "ICT";
      const draft = {
        name: deviceType,
        deviceType,
        category: "Computing Devices",
        tabCategory: "Computing Devices",
        campus: fallbackCampus,
        department: fallbackDept,
        assignedUser: "",
        status: "Functional",
        assetTag,
        yearPurchased: String(new Date().getFullYear()),
      };

      if (immediateConfirm) {
        if (!canMutate()) {
          addLocalMessage("assistant", "Sign in is required before editing inventory records.");
          return true;
        }
        if (typeof onAddItem === "function") {
          const created = await onAddItem(draft);
          addLocalMessage("assistant", `Created item ${created?.assetTag || assetTag}: ${created?.deviceType || deviceType}.`);
        } else {
          addLocalMessage("assistant", "Create action is not available in this context.");
        }
        return true;
      }

      setPendingVoiceAction({ type: "create", payload: { draft } });
      addLocalMessage(
        "assistant",
        `Ready to create item ${assetTag} (${deviceType}). Say "confirm create" to proceed or "cancel" to abort.`
      );
      return true;
    }

    const deleteMatch = text.match(/^(?:delete|remove)\s+(?:item\s+)?(.+?)(?:\s+confirm)?$/i);
    if (deleteMatch) {
      const assetTag = deleteMatch[1].trim();
      const immediateConfirm = /\bconfirm\b/i.test(text);
      addLocalMessage("user", originalText);
      const item = findSingleByAssetTag(assetTag);
      if (!item) {
        addLocalMessage("assistant", `I couldn't find asset tag "${assetTag}".`);
        return true;
      }

      if (immediateConfirm) {
        if (!canMutate()) {
          addLocalMessage("assistant", "Sign in is required before editing inventory records.");
          return true;
        }
        if (typeof onDeleteItem === "function") {
          await onDeleteItem(item.id);
          addLocalMessage("assistant", `Deleted ${item.assetTag || item.id} (${item.deviceType || item.name || "item"}).`);
        } else {
          addLocalMessage("assistant", "Delete action is not available in this context.");
        }
        return true;
      }

      setPendingVoiceAction({ type: "delete", payload: { item } });
      addLocalMessage(
        "assistant",
        `Ready to delete ${item.assetTag || item.id} (${item.deviceType || item.name || "item"}). Say "confirm delete" to proceed or "cancel" to abort.`
      );
      return true;
    }

    return false;
  }, [
    addLocalMessage,
    canMutate,
    executePendingVoiceAction,
    findInventoryMatches,
    findSingleByAssetTag,
    inventory,
    onAddItem,
    onDeleteItem,
    onUpdateItem,
    pendingVoiceAction,
  ]);

  // ── Voice: mic toggle ──
  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      // If there's a transcript, put it in the input
      const currentText = transcript || "";
      if (currentText.trim()) {
        setInputVal(currentText.trim());
      }
    } else {
      setVoiceMode(true);
      startListening((finalText) => {
        // Auto-send when speech ends
        if (finalText.trim() && !isLoading) {
          setInputVal("");
          handleVoiceOrCommandAction(finalText.trim()).then((handled) => {
            if (!handled) {
              sendMessage(finalText.trim(), inventory, { replyMode }).finally(() => {
                setRecentAIQueries(getRecentAIQueries());
              });
              return;
            }
            setRecentAIQueries(getRecentAIQueries());
          });
        }
      });
    }
  }, [isListening, stopListening, startListening, transcript, isLoading, sendMessage, inventory, replyMode, handleVoiceOrCommandAction]);

  useEffect(() => {
    if (!wakeWordEnabled || !WakeSpeechRecognition || !sttSupported) {
      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.stop();
        } catch {}
        wakeRecognitionRef.current = null;
      }
      return;
    }

    // Avoid running wake detector while actively dictating.
    if (isListening) {
      if (wakeRecognitionRef.current) {
        try {
          wakeRecognitionRef.current.stop();
        } catch {}
        wakeRecognitionRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const recognition = new WakeSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      if (cancelled) return;
      const result = event.results?.[event.results.length - 1]?.[0]?.transcript || "";
      const heard = String(result).trim();
      if (!heard) return;

      const woke = WAKE_PATTERNS.some((pattern) => pattern.test(heard));
      if (!woke) return;

      setOpen(true);
      setVoiceMode(true);

      if (!isLoading) {
        try {
          recognition.stop();
        } catch {}
        wakeRecognitionRef.current = null;
        setTimeout(() => {
          startListening((finalText) => {
            if (finalText.trim() && !isLoading) {
              setInputVal("");
              handleVoiceOrCommandAction(finalText.trim()).then((handled) => {
                if (!handled) {
                  sendMessage(finalText.trim(), inventory, { replyMode }).finally(() => {
                    setRecentAIQueries(getRecentAIQueries());
                  });
                  return;
                }
                setRecentAIQueries(getRecentAIQueries());
              });
            }
          });
        }, 260);
      }
    };

    recognition.onerror = () => {
      // Speech engines can produce transient errors; auto-restart below.
    };

    recognition.onend = () => {
      if (cancelled) return;
      // Keep wake-word listener alive while enabled.
      setTimeout(() => {
        if (!cancelled && wakeWordEnabled && !isListening && wakeRecognitionRef.current === recognition) {
          try {
            recognition.start();
          } catch {
            // ignore restart failures
          }
        }
      }, 450);
    };

    wakeRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // ignore start errors (often due to permission not yet granted)
    }

    return () => {
      cancelled = true;
      if (wakeRecognitionRef.current === recognition) {
        wakeRecognitionRef.current = null;
      }
      try {
        recognition.stop();
      } catch {}
    };
  }, [wakeWordEnabled, sttSupported, isListening, isLoading, startListening, sendMessage, inventory, replyMode, handleVoiceOrCommandAction]);

  // ── Update input with live transcript ──
  useEffect(() => {
    if (isListening) {
      const liveText = ((transcript || "") + " " + (interimTranscript || "")).trim();
      if (liveText) setInputVal(liveText);
    }
  }, [transcript, interimTranscript, isListening]);

  // ── Auto-speak AI responses when voice mode is active ──
  const prevMsgCountRef = useRef(messages.length);
  useEffect(() => {
    if (
      autoSpeak &&
      voiceMode &&
      messages.length > prevMsgCountRef.current &&
      messages.length >= 2
    ) {
      const lastMsg = messages[messages.length - 1];
      if (
        lastMsg.role === "assistant" &&
        lastMsg.content &&
        !lastMsg.streaming
      ) {
        setSpeakingMsgIndex(messages.length - 1);
        speak(lastMsg.content);
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, autoSpeak, voiceMode, speak]);

  // ── Track when speaking finishes ──
  useEffect(() => {
    if (!isSpeaking && speakingMsgIndex >= 0) {
      setSpeakingMsgIndex(-1);
    }
  }, [isSpeaking, speakingMsgIndex]);

  // ── Replay handler for individual messages ──
  const handleReplay = useCallback((text) => {
    speak(text);
  }, [speak]);

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setSpeakingMsgIndex(-1);
  }, [stopSpeaking]);

  const handleSuggest = (prompt) => {
    setInputVal(prompt.replace(/^[^\s]+\s/, "")); // strip leading emoji
    inputRef.current?.focus();
  };

  const showSuggestions = messages.length === 0 && hasKey;

  // Compute inline styles for button and panel position
  const fabStyle = fabPos
    ? {
        left: `${fabPos.x}px`,
        top: `${fabPos.y}px`,
        bottom: "auto",
        right: "auto",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
      }
    : { cursor: isDragging ? "grabbing" : "grab", userSelect: "none", touchAction: "none" };

  const getPanelStyle = () => {
    if (isExpanded) return {};
    if (!fabPos || !fabRef.current) return {};
    const rect = fabRef.current.getBoundingClientRect();
    const isBottomHalf = fabPos.y > window.innerHeight / 2;
    const isRightHalf = fabPos.x > window.innerWidth / 2;

    const style = {};
    if (isBottomHalf) {
      style.bottom = `${window.innerHeight - fabPos.y + 12}px`;
      style.top = "auto";
    } else {
      style.top = `${fabPos.y + rect.height + 12}px`;
      style.bottom = "auto";
    }

    if (isRightHalf) {
      style.right = `${window.innerWidth - fabPos.x - rect.width}px`;
      style.left = "auto";
    } else {
      style.left = `${fabPos.x}px`;
      style.right = "auto";
    }
    return style;
  };

  return (
    <>
      {/* Floating Avatar Button (Draggable & Animated) */}
      <button
        ref={fabRef}
        style={fabStyle}
        onPointerDown={handlePointerDown}
        className={`ai-avatar-fab ${open ? "ai-avatar-fab--open" : ""} ${isDragging ? "ai-avatar-fab--dragging" : ""}`}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        id="ai-chat-fab"
        title="🤖 Drag me anywhere • Click to Ask Chit!"
      >
        <div className="ai-avatar-glow-ring" />
        <div className="ai-avatar-img-wrap">
          {open ? (
            <span className="ai-avatar-close-icon">✕</span>
          ) : (
            <img src={aiRobotIcon} alt="AI Assistant" className="ai-avatar-img" draggable={false} />
          )}
        </div>
        {!open && messages.length > 0 && (
          <span className="ai-fab-badge">{messages.filter((m) => m.role === "assistant").length}</span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <>
          {isExpanded && <div className="ai-panel-overlay" onClick={() => setIsExpanded(false)} aria-hidden="true" />}
          <div
            className={`ai-panel ${isExpanded ? "ai-panel--expanded" : ""}`}
            style={getPanelStyle()}
            ref={panelRef}
            role="dialog"
            aria-label="AI Assistant"
            aria-modal={isExpanded ? "true" : "false"}
          >
          {/* Header */}
          <div className="ai-panel-header">
            <div className="ai-header-left">
              <div className="ai-header-avatar">
                <img src={aiRobotIcon} alt="AI Assistant" className="ai-header-robot-img" />
              </div>
              <div>
                <div className="ai-header-title">AI Assistant</div>
                <div className="ai-header-sub">
                  Powered by embedded AI provider configuration
                  {messages.length > 0 && (
                    <span className="ai-memory-badge">🧠 {messages.length} msgs remembered</span>
                  )}
                </div>
              </div>
            </div>
            <div className="ai-header-actions">
              <button
                className={`ai-icon-btn ai-expand-btn ${isExpanded ? "ai-icon-btn--active" : ""}`}
                onClick={() => setIsExpanded((v) => !v)}
                title={isExpanded ? "Restore size" : "Expand and center"}
                aria-label={isExpanded ? "Restore chat size" : "Expand chat"}
              >
                {isExpanded ? "Restore" : "Expand"}
              </button>
              {ttsSupported && (
                <button
                  className={`ai-icon-btn ${voiceSettingsOpen ? "ai-icon-btn--active" : ""}`}
                  onClick={() => setVoiceSettingsOpen((v) => !v)}
                  title="Voice settings"
                  aria-label="Voice settings"
                >
                  🎙️
                </button>
              )}
              {ttsSupported && isSpeaking && (
                <button
                  className="ai-icon-btn"
                  onClick={isSpeechPaused ? resumeSpeaking : pauseSpeaking}
                  title={isSpeechPaused ? "Resume AI voice" : "Pause AI voice"}
                  aria-label={isSpeechPaused ? "Resume AI voice" : "Pause AI voice"}
                >
                  {isSpeechPaused ? "▶ Voice" : "⏸ Voice"}
                </button>
              )}
              {ttsSupported && isSpeaking && (
                <button
                  className="ai-icon-btn ai-icon-btn--active"
                  onClick={handleStopSpeaking}
                  title="Stop or pause AI voice"
                  aria-label="Stop AI voice"
                >
                  ⏹ Voice
                </button>
              )}
              {messages.length > 0 && (
                <button
                  className="ai-icon-btn"
                  onClick={clearChat}
                  title="Clear memory (delete all chat history)"
                  aria-label="Clear memory"
                >
                  🗑️
                </button>
              )}
              <button
                className="ai-icon-btn"
                onClick={() => {
                  setOpen(false);
                  setIsExpanded(false);
                }}
                title="Close"
                aria-label="Close chat panel"
                id="ai-chat-close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Voice Settings Dropdown */}
          {voiceSettingsOpen && (
            <div className="ai-voice-settings">
              <div className="ai-voice-settings-row">
                <label className="ai-voice-label">Speech engine</label>
                <select
                  className="ai-voice-select"
                  value={speechEngine}
                  onChange={(e) => setSpeechEngine(e.target.value)}
                >
                  <option value="browser">Browser voice</option>
                  <option value="elevenlabs" disabled={!elevenLabsAvailable}>
                    ElevenLabs premium {!elevenLabsAvailable ? "(API key required)" : ""}
                  </option>
                </select>
              </div>

              {speechEngine === "elevenlabs" && elevenLabsAvailable && (
                <>
                  <div className="ai-voice-settings-row">
                    <label className="ai-voice-label">Premium voice</label>
                    <select
                      className="ai-voice-select"
                      value={elevenVoiceId}
                      onChange={(e) => setElevenVoiceId(e.target.value)}
                    >
                      {elevenLabsProfiles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ai-voice-settings-row">
                    <label className="ai-voice-label">Voice style</label>
                    <select
                      className="ai-voice-select"
                      value={elevenStylePreset}
                      onChange={(e) => setElevenStylePreset(e.target.value)}
                    >
                      {elevenLabsStylePresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="ai-voice-settings-row">
                <label className="ai-voice-label">Voice</label>
                <select
                  className="ai-voice-select"
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  disabled={speechEngine === "elevenlabs"}
                >
                  {voices
                    .filter((v) => v.lang.startsWith("en"))
                    .map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                </select>
              </div>
              <div className="ai-voice-settings-row">
                <label className="ai-voice-label">Speed</label>
                <div className="ai-voice-rate-control">
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="ai-voice-slider"
                  />
                  <span className="ai-voice-rate-val">{speechRate.toFixed(1)}x</span>
                </div>
              </div>
              <div className="ai-voice-settings-row">
                <label className="ai-voice-label">Auto-speak</label>
                <button
                  className={`ai-voice-toggle ${autoSpeak ? "ai-voice-toggle--on" : ""}`}
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  aria-label="Toggle auto-speak"
                >
                  <span className="ai-voice-toggle-track">
                    <span className="ai-voice-toggle-thumb" />
                  </span>
                  {autoSpeak ? "On" : "Off"}
                </button>
              </div>
              <div className="ai-voice-settings-row">
                <label className="ai-voice-label">Natural voice</label>
                <button
                  className={`ai-voice-toggle ${expressiveVoice ? "ai-voice-toggle--on" : ""}`}
                  onClick={() => setExpressiveVoice(!expressiveVoice)}
                  aria-label="Toggle natural voice variation"
                >
                  <span className="ai-voice-toggle-track">
                    <span className="ai-voice-toggle-thumb" />
                  </span>
                  {expressiveVoice ? "On" : "Off"}
                </button>
              </div>
              <div className="ai-voice-settings-row">
                <label className="ai-voice-label">Wake word</label>
                <button
                  className={`ai-voice-toggle ${wakeWordEnabled ? "ai-voice-toggle--on" : ""}`}
                  onClick={() => setWakeWordEnabled((v) => !v)}
                  aria-label="Toggle wake word detection"
                  disabled={!sttSupported}
                >
                  <span className="ai-voice-toggle-track">
                    <span className="ai-voice-toggle-thumb" />
                  </span>
                  {wakeWordEnabled ? "On" : "Off"}
                </button>
              </div>
              {!sttSupported && (
                <div className="ai-voice-compat-warn">
                  ⚠️ Speech-to-text requires Chrome or Edge browser
                </div>
              )}
              {sttSupported && wakeWordEnabled && (
                <div className="ai-voice-compat-warn">
                  👂 Wake mode active: say "Hey Rachel"
                </div>
              )}
              {!elevenLabsAvailable && (
                <div className="ai-voice-compat-warn">
                  ℹ️ For premium voice, set EMBEDDED_ELEVENLABS_API_KEY in src/config/aiKeys.js
                </div>
              )}
            </div>
          )}

          {/* Body */}
          <div className="ai-panel-body">
            {!hasKey ? (
              <NoKeyScreen />
            ) : (
              <>
                {/* Welcome / suggestions */}
                {showSuggestions && (
                  <div className="ai-welcome">
                    <div className="ai-welcome-icon">
                      <img src={aiRobotIcon} alt="AI Assistant" className="ai-welcome-robot-img" />
                    </div>
                    <p className="ai-welcome-title">Hello! I'm your AI Assistant for ICT inventory.</p>
                    <p className="ai-welcome-sub">
                      Ask me anything about your {inventory?.length?.toLocaleString() || "–"} devices. Try a suggestion:
                    </p>
                    <div className="ai-suggestions">
                      {SUGGESTED_PROMPTS.map((p) => (
                        <button
                          key={p}
                          className="ai-suggest-chip"
                          onClick={() => handleSuggest(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    {recentAIQueries.length > 0 && (
                      <div className="ai-recent-prompts">
                        <p className="ai-recent-prompts-label">Recent searches</p>
                        <div className="ai-recent-prompts-chips">
                          {recentAIQueries.slice(0, 6).map((q) => (
                            <button
                              key={q}
                              className="ai-suggest-chip ai-suggest-chip--recent"
                              onClick={() => {
                                setInputVal(q);
                                inputRef.current?.focus();
                              }}
                              title={q}
                            >
                              {q.length > 48 ? `${q.slice(0, 48)}...` : q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message list */}
                {messages.length > 0 && (
                  <div className="ai-messages">
                    {messages.map((msg, i) => (
                      <MessageBubble
                        key={i}
                        message={msg}
                        onReplay={handleReplay}
                        isSpeakingThis={isSpeaking && speakingMsgIndex === i}
                        onStopSpeaking={handleStopSpeaking}
                        ttsSupported={ttsSupported}
                      />
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <div className="ai-message ai-message--ai">
                        <div className="ai-avatar">
                          <img src={aiRobotIcon} alt="AI Assistant" className="ai-avatar-robot-img" />
                        </div>
                        <div className="ai-bubble">
                          <div className="ai-bubble-content">
                            <TypingIndicator />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Error banners */}
                {error === "bad_key" && (
                  <div className="ai-error-banner">
                    ❌ The embedded API key was rejected by the provider. Update src/config/aiKeys.js.
                  </div>
                )}
                {error === "api_error" && (
                  <div className="ai-error-banner ai-error-banner--warn">
                    ⚠️ Request failed. Verify the embedded key/provider in src/config/aiKeys.js, and check internet access or API quota.
                  </div>
                )}
                {error === "quota_or_capacity" && (
                  <div className="ai-error-banner ai-error-banner--warn">
                    ⚠️ AI request blocked by provider quota, low credits, or temporary high demand. Add a backup key/provider in src/config/aiKeys.js (for example OpenRouter) and try again.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input bar */}
          {hasKey && (
            <div className="ai-panel-footer">
              {/* Listening indicator bar */}
              {isListening && (
                <div className="ai-listening-bar">
                  <div className="ai-listening-pulse" />
                  <span className="ai-listening-label">🎤 Listening… speak now</span>
                  <button
                    className="ai-listening-cancel"
                    onClick={() => { stopListening(); setInputVal(""); }}
                    title="Cancel"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="ai-reply-mode-row" role="group" aria-label="Reply style">
                <span className="ai-reply-mode-label">Style</span>
                <div className="ai-reply-mode-switch">
                  {REPLY_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      className={`ai-reply-mode-btn ${replyMode === mode.value ? "ai-reply-mode-btn--active" : ""}`}
                      onClick={() => setReplyMode(mode.value)}
                      aria-pressed={replyMode === mode.value}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ai-input-wrap">
                {sttSupported && (
                  <button
                    className={`ai-mic-btn ${isListening ? "ai-mic-btn--active" : ""}`}
                    onClick={handleMicToggle}
                    disabled={isLoading}
                    aria-label={isListening ? "Stop listening" : "Start voice input"}
                    title={isListening ? "Stop listening" : "🎤 Speak to AI"}
                    id="ai-mic-btn"
                  >
                    {isListening ? (
                      <span className="ai-mic-recording">
                        <span className="ai-mic-dot" />
                      </span>
                    ) : "🎤"}
                  </button>
                )}
                <textarea
                  ref={inputRef}
                  className={`ai-input ${isListening ? "ai-input--listening" : ""}`}
                  placeholder={isListening ? "Listening…" : "Ask about your inventory…"}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  id="ai-chat-input"
                  aria-label="Type your question"
                  readOnly={isListening}
                />
                {isLoading ? (
                  <button
                    className="ai-send-btn ai-send-btn--stop"
                    onClick={stopGeneration}
                    aria-label="Stop generation"
                    title="Stop"
                  >
                    ⏹
                  </button>
                ) : (
                  <button
                    className="ai-send-btn"
                    onClick={handleSend}
                    disabled={!inputVal.trim() || isListening}
                    aria-label="Send message"
                    title="Send (Enter)"
                    id="ai-send-btn"
                  >
                    ➤
                  </button>
                )}
              </div>
              <p className="ai-footer-note">
                {isSpeaking ? "🔊 AI is speaking…" : "AI can make mistakes. Verify critical data in the inventory table."}
              </p>
            </div>
          )}
          </div>
        </>
      )}
    </>
  );
}
