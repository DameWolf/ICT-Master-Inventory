import React, { useState } from "react";
import { getAppsScriptUrl, setAppsScriptUrl, pingAppsScript } from "../hooks/useAppsScript";
import { getAIKey, setAIKey } from "../hooks/useAIChat";
import "./SettingsModal.css";

export default function SettingsModal({ onClose }) {
  const [url, setUrl]         = useState(getAppsScriptUrl);
  const [status, setStatus]   = useState(null);
  const [errMsg, setErrMsg]   = useState("");
  const [aiKey, setAiKeyLocal]  = useState(getAIKey);
  const [showKey, setShowKey]   = useState(false);

  const handleSave = () => {
    setAppsScriptUrl(url.trim());
    setAIKey(aiKey);
    onClose();
  };

  const handleTest = async () => {
    if (!url.trim()) { setStatus("error"); setErrMsg("Please enter a URL first."); return; }
    setStatus("testing");
    setErrMsg("");
    try {
      await pingAppsScript(url.trim());
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setErrMsg(e.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h2 className="settings-title">⚙️ Settings</h2>
            <p className="settings-subtitle">Configure Google Sheets write-back</p>
          </div>
          <button className="modal-close" onClick={onClose} id="settings-close">✕</button>
        </div>

        <div className="settings-body">
          {/* Step 1 */}
          <div className="setup-step">
            <div className="step-num">1</div>
            <div className="step-content">
              <p className="step-title">Open your Google Sheet → <strong>Extensions → Apps Script</strong></p>
              <p className="step-desc">Paste the contents of <code>AppsScript.gs</code> into the script editor and save (Ctrl+S).</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="setup-step">
            <div className="step-num">2</div>
            <div className="step-content">
              <p className="step-title">Click <strong>Deploy → New Deployment</strong></p>
              <p className="step-desc">
                Type: <strong>Web App</strong> · Execute as: <strong>Me</strong> · Who has access: <strong>Anyone</strong>
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="setup-step">
            <div className="step-num">3</div>
            <div className="step-content">
              <p className="step-title">Paste the <strong>Web App URL</strong> below</p>
            </div>
          </div>

          <div className="settings-field">
            <label className="settings-label">Apps Script Web App URL</label>
            <input
              className="settings-input"
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setStatus(null); }}
              id="settings-url-input"
            />
          </div>

          {/* Connection status */}
          {status === "ok" && (
            <div className="status-banner status-ok">✅ Connected! Apps Script is responding correctly.</div>
          )}
          {status === "error" && (
            <div className="status-banner status-err">❌ {errMsg || "Could not connect. Check the URL and deployment settings."}</div>
          )}
          {status === "testing" && (
            <div className="status-banner status-testing">⏳ Testing connection…</div>
          )}

          <div className="settings-note">
            💡 Your URL is stored only in this browser's local storage. Edits made in the app will update the Google Sheet in real-time.
          </div>

          {/* ── AI Assistant Section ── */}
          <div className="settings-divider" />

          <div className="settings-section-title">✨ AI Assistant (Google Gemini)</div>

          <div className="settings-field">
            <label className="settings-label">Gemini API Key</label>
            <div className="settings-key-wrap">
              <input
                className="settings-input"
                type={showKey ? "text" : "password"}
                placeholder="AIza…"
                value={aiKey}
                onChange={(e) => setAiKeyLocal(e.target.value)}
                id="settings-ai-key-input"
                autoComplete="off"
              />
              <button
                className="settings-show-key"
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="settings-note">
            🔑 Get a free API key at{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="settings-link"
            >
              aistudio.google.com
            </a>. Your key is stored locally and never sent to any server other than Google.
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn-test" onClick={handleTest} id="btn-test-connection" disabled={status === "testing"}>
            {status === "testing" ? "Testing…" : "🔌 Test Connection"}
          </button>
          <button className="btn-save-settings" onClick={handleSave} id="btn-save-settings">
            💾 Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
