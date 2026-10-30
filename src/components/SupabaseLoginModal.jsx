import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import "./SettingsModal.css";

export default function SupabaseLoginModal({ onClose, onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      onAuthenticated?.();
      onClose();
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h2 className="settings-title">🔐 Supabase Admin Login</h2>
            <p className="settings-subtitle">Authenticate to edit inventory data in Supabase</p>
          </div>
          <button className="modal-close" onClick={onClose} id="supabase-login-close">✕</button>
        </div>

        <div className="settings-body">
          <div className="settings-field">
            <label className="settings-label">Email</label>
            <input
              className="settings-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">Password</label>
            <input
              className="settings-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <div className="status-banner status-err">❌ {error}</div>}
        </div>

        <div className="settings-actions">
          <button className="btn-test" onClick={handleSignIn} disabled={loading || !supabase}>
            {loading ? "Signing in…" : "Login"}
          </button>
          <button className="btn-save-settings" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
