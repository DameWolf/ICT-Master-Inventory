import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAIChat, getAIKey, setAIKey } from "../hooks/useAIChat";
import aiRobotIcon from "../assets/ai_assistant.png";
import "./AIChat.css";

const SUGGESTED_PROMPTS = [
  "📊 What's the overall health of our inventory?",
  "⚠️ Which departments have the most defective devices?",
  "🖥️ How many Computing Devices are functional?",
  "📅 Which purchase years have the most aging equipment?",
  "🔧 What should we prioritize for replacement?",
  "🏫 How does the campus device distribution look?",
];

function TypingIndicator() {
  return (
    <div className="ai-typing-indicator" aria-label="AI is thinking">
      <span />
      <span />
      <span />
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  // Simple markdown-like rendering: bold, bullets
  const renderContent = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Bold: **text**
      const boldified = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      const isBullet = /^[-•]\s/.test(line.trim());
      if (isBullet) {
        return (
          <li
            key={i}
            dangerouslySetInnerHTML={{ __html: boldified.replace(/^[-•]\s/, "") }}
          />
        );
      }
      return line.trim() ? (
        <p key={i} dangerouslySetInnerHTML={{ __html: boldified }} />
      ) : (
        <br key={i} />
      );
    });
  };

  const time = message.timestamp
    ? message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className={`ai-message ${isUser ? "ai-message--user" : "ai-message--ai"}`}>
      {!isUser && (
        <div className="ai-avatar" aria-label="AI">
          <img src={aiRobotIcon} alt="AI" className="ai-avatar-robot-img" />
        </div>
      )}
      <div className="ai-bubble">
        <div className="ai-bubble-content">
          {message.content ? renderContent(message.content) : null}
          {message.streaming && !message.content && <TypingIndicator />}
        </div>
        <span className="ai-bubble-time">{time}</span>
      </div>
      {isUser && (
        <div className="ai-avatar ai-avatar--user" aria-label="You">
          👤
        </div>
      )}
    </div>
  );
}

function NoKeyScreen({ onOpenSettings }) {
  return (
    <div className="ai-nokey">
      <div className="ai-nokey-icon">🔑</div>
      <h3>Set up your Gemini API Key</h3>
      <p>
        To use the AI assistant, add your free Google Gemini API key in Settings.
        Your key is stored only in this browser.
      </p>
      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="ai-nokey-link"
      >
        Get a free API key →
      </a>
      <button className="ai-nokey-btn" onClick={onOpenSettings} id="ai-open-settings">
        ⚙️ Open Settings
      </button>
    </div>
  );
}

const FAB_POS_KEY = "ict_ai_fab_pos";

function getStoredFabPos() {
  try {
    const data = localStorage.getItem(FAB_POS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

export default function AIChat({ inventory, onOpenSettings }) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [hasKey, setHasKey] = useState(() => Boolean(getAIKey()));
  const [fabPos, setFabPos] = useState(getStoredFabPos);
  const [isDragging, setIsDragging] = useState(false);
  const { messages, isLoading, error, setError, sendMessage, clearChat, stopGeneration } =
    useAIChat();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const fabRef = useRef(null);

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
      const key = Boolean(getAIKey());
      setHasKey(key);
      if (!key) setError(null);
      else if (error === "no_key") setError(null);
    }
  }, [open]);

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
    await sendMessage(text, inventory);
  }, [inputVal, isLoading, sendMessage, inventory]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggest = (prompt) => {
    setInputVal(prompt.replace(/^[^\s]+\s/, "")); // strip leading emoji
    inputRef.current?.focus();
  };

  const handleOpenSettings = () => {
    setOpen(false);
    onOpenSettings?.();
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
      {/* Floating Chat Button (Draggable) */}
      <button
        ref={fabRef}
        style={fabStyle}
        onPointerDown={handlePointerDown}
        className={`ai-fab ${open ? "ai-fab--open" : ""} ${isDragging ? "ai-fab--dragging" : ""}`}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        id="ai-chat-fab"
        title="Drag anywhere to move • Click to open"
      >
        {open ? (
          <span className="ai-fab-icon">✕</span>
        ) : (
          <img src={aiRobotIcon} alt="AI" className="ai-fab-robot-icon" draggable={false} />
        )}
        {!open && <span className="ai-fab-label">Ask AI</span>}
        {!open && messages.length > 0 && (
          <span className="ai-fab-badge">{messages.filter((m) => m.role === "assistant").length}</span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="ai-panel" style={getPanelStyle()} ref={panelRef} role="dialog" aria-label="AI Inventory Assistant">
          {/* Header */}
          <div className="ai-panel-header">
            <div className="ai-header-left">
              <div className="ai-header-avatar">
                <img src={aiRobotIcon} alt="AI Assistant" className="ai-header-robot-img" />
              </div>
              <div>
                <div className="ai-header-title">ICT Inventory AI</div>
                <div className="ai-header-sub">
                  Powered by Google Gemini
                  {messages.length > 0 && (
                    <span className="ai-memory-badge">🧠 {messages.length} msgs remembered</span>
                  )}
                </div>
              </div>
            </div>
            <div className="ai-header-actions">
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
                onClick={() => setOpen(false)}
                title="Close"
                aria-label="Close chat panel"
                id="ai-chat-close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="ai-panel-body">
            {!hasKey ? (
              <NoKeyScreen onOpenSettings={handleOpenSettings} />
            ) : (
              <>
                {/* Welcome / suggestions */}
                {showSuggestions && (
                  <div className="ai-welcome">
                    <div className="ai-welcome-icon">
                      <img src={aiRobotIcon} alt="AI Assistant" className="ai-welcome-robot-img" />
                    </div>
                    <p className="ai-welcome-title">Hello! I'm your ICT Inventory Assistant.</p>
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
                  </div>
                )}

                {/* Message list */}
                {messages.length > 0 && (
                  <div className="ai-messages">
                    {messages.map((msg, i) => (
                      <MessageBubble key={i} message={msg} />
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === "user" && (
                      <div className="ai-message ai-message--ai">
                        <div className="ai-avatar">
                          <img src={aiRobotIcon} alt="AI" className="ai-avatar-robot-img" />
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
                    ❌ Invalid API key. <button onClick={handleOpenSettings}>Update in Settings →</button>
                  </div>
                )}
                {error === "api_error" && (
                  <div className="ai-error-banner ai-error-banner--warn">
                    ⚠️ Request failed. This usually means your Gemini API key is missing or invalid.
                    <br />
                    <button onClick={handleOpenSettings}>⚙️ Add API Key in Settings →</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input bar */}
          {hasKey && (
            <div className="ai-panel-footer">
              <div className="ai-input-wrap">
                <textarea
                  ref={inputRef}
                  className="ai-input"
                  placeholder="Ask about your inventory…"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  id="ai-chat-input"
                  aria-label="Type your question"
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
                    disabled={!inputVal.trim()}
                    aria-label="Send message"
                    title="Send (Enter)"
                    id="ai-send-btn"
                  >
                    ➤
                  </button>
                )}
              </div>
              <p className="ai-footer-note">AI can make mistakes. Verify critical data in the inventory table.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
