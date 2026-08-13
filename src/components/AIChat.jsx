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

export default function AIChat({ inventory, onOpenSettings }) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [hasKey, setHasKey] = useState(() => Boolean(getAIKey()));
  const { messages, isLoading, error, setError, sendMessage, clearChat, stopGeneration } =
    useAIChat();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

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

  // Re-check key when panel opens (user might have just set it)
  useEffect(() => {
    if (open) {
      setHasKey(Boolean(getAIKey()));
      if (error === "no_key" || error === "bad_key") setError(null);
    }
  }, [open, setError, error]);

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

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`ai-fab ${open ? "ai-fab--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        id="ai-chat-fab"
        title="AI Inventory Assistant"
      >
        {open ? (
          <span className="ai-fab-icon">✕</span>
        ) : (
          <img src={aiRobotIcon} alt="AI" className="ai-fab-robot-icon" />
        )}
        {!open && <span className="ai-fab-label">Ask AI</span>}
        {!open && messages.length > 0 && (
          <span className="ai-fab-badge">{messages.filter((m) => m.role === "assistant").length}</span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="ai-panel" ref={panelRef} role="dialog" aria-label="AI Inventory Assistant">
          {/* Header */}
          <div className="ai-panel-header">
            <div className="ai-header-left">
              <div className="ai-header-avatar">
                <img src={aiRobotIcon} alt="AI Assistant" className="ai-header-robot-img" />
              </div>
              <div>
                <div className="ai-header-title">ICT Inventory AI</div>
                <div className="ai-header-sub">Powered by Gemini 2.0 Flash</div>
              </div>
            </div>
            <div className="ai-header-actions">
              {messages.length > 0 && (
                <button
                  className="ai-icon-btn"
                  onClick={clearChat}
                  title="Clear chat"
                  aria-label="Clear conversation"
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
                  <div className="ai-error-banner">
                    ⚠️ Request failed. Check your internet connection and try again.
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
