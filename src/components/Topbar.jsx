import React, { useState, useRef, useEffect } from "react";
import { CATEGORIES, STATUS_COLORS } from "../data/inventoryData";
import logoImg from "../assets/logo.jpg";
import "./Topbar.css";

// Group the 12 categories into 4 nav dropdown groups
const NAV_GROUPS = [
  {
    label: "Computing & Storage",
    icon: "🖥️",
    categories: ["Computing Devices", "Storage Devices", "Embedded Systems", "Wearable Devices"],
  },
  {
    label: "Network & Comm",
    icon: "📡",
    categories: ["Networking Equipment", "Communication Devices"],
  },
  {
    label: "Input & Output",
    icon: "⌨️",
    categories: ["Input Devices", "Output Devices", "Peripheral Devices"],
  },
  {
    label: "Security & Other",
    icon: "🔒",
    categories: ["Security Devices", "Specialized Devices", "Other ICT Hardware"],
  },
];

function DropdownMenu({ group, selectedCategory, onSelectCategory, inventory, isOpen, onToggle }) {
  const ref = useRef(null);

  const getCategoryCount = (name) =>
    inventory.filter((i) => i.category === name || i.tabCategory === name).length;

  const cats = CATEGORIES.filter((c) => group.categories.includes(c.name));
  const isActive = cats.some((c) => c.name === selectedCategory);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onToggle(null);
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onToggle]);

  return (
    <div className={`nav-dropdown-wrap ${isOpen ? "open" : ""} ${isActive ? "active-group" : ""}`} ref={ref}>
      <button
        className="nav-dropdown-trigger"
        onClick={() => onToggle(isOpen ? null : group.label)}
        id={`nav-group-${group.label.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <span className="nd-icon">{group.icon}</span>
        <span className="nd-label">{group.label}</span>
        <span className="nd-chevron">{isOpen ? "▲" : "▼"}</span>
      </button>

      <div className="nav-dropdown-panel">
        <div className="ndp-arrow" />
        <div className="ndp-inner">
          {cats.map((cat) => {
            const count = getCategoryCount(cat.name);
            return (
              <button
                key={cat.name}
                className={`ndp-item ${selectedCategory === cat.name ? "selected" : ""}`}
                onClick={() => { onSelectCategory(cat.name); onToggle(null); }}
                id={`nav-cat-${cat.name.replace(/\s+/g, "-").toLowerCase()}`}
                style={selectedCategory === cat.name ? { borderLeftColor: cat.color, background: cat.color + "18" } : {}}
              >
                <span className="ndp-cat-icon">{cat.icon}</span>
                <span className="ndp-cat-name">{cat.name}</span>
                <span className="ndp-cat-count" style={selectedCategory === cat.name ? { background: cat.color, color: "#fff" } : {}}>
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


export default function Topbar({
  selectedCategory, onSelectCategory, onHome, onDashboard, onSettings, onScannerOpen,
  inventory = [], lastSynced, onSync, darkMode, onToggleDarkMode, activeView,
}) {
  const [openGroup, setOpenGroup] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const formatSynced = (date) =>
    date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  const functional = inventory.filter((i) => i.status === "Functional").length;
  const defective  = inventory.filter((i) => i.status === "Defective").length;
  const total      = inventory.length;

  return (
    <header className="topbar">
      {/* ── Brand ── */}
      <div className="topbar-brand" onClick={onHome} role="button" tabIndex={0} style={{ cursor: "pointer" }}>
        <img src={logoImg} alt="ICT Logo" className="topbar-logo-img" />
        <div className="topbar-brand-text">
          <span className="topbar-brand-name">ICT Hardware</span>
          <span className="topbar-brand-sub">Inventory Management</span>
        </div>
      </div>

      {/* ── Desktop Nav ── */}
      <nav className="topbar-nav">
        <button
          className={`nav-home-btn ${activeView === "home" && !selectedCategory ? "active" : ""}`}
          onClick={onHome}
          id="nav-home"
        >
          🏠 <span>Home</span>
        </button>

        <button
          className={`nav-home-btn ${activeView === "dashboard" && !selectedCategory ? "active" : ""}`}
          onClick={onDashboard}
          id="nav-dashboard"
        >
          📊 <span>Dashboard</span>
        </button>

        {NAV_GROUPS.map((group) => (
          <DropdownMenu
            key={group.label}
            group={group}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            inventory={inventory}
            isOpen={openGroup === group.label}
            onToggle={setOpenGroup}
          />
        ))}
      </nav>

      {/* ── Right side ── */}
      <div className="topbar-right">
        {/* Dark Mode Switcher */}
        <button
          className={`theme-toggle-btn ${darkMode ? "dark" : "light"}`}
          onClick={onToggleDarkMode}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          id="btn-theme-toggle"
        >
          <span className="tt-icon">{darkMode ? "🌙" : "☀️"}</span>
          <span className="tt-label">{darkMode ? "Dark" : "Light"}</span>
        </button>

        {/* Live stats mini-pills */}
        <div className="topbar-mini-stats">
          <span className="tms-pill total">{total.toLocaleString()} total</span>
          <span className="tms-pill ok">{functional.toLocaleString()} ok</span>
          <span className="tms-pill bad">{defective.toLocaleString()} defective</span>
        </div>

        {/* Sync */}
        <div className="topbar-sync-area">
          <div className="topbar-badge">
            <span className="topbar-badge-dot" />
            {lastSynced ? `Synced ${formatSynced(lastSynced)}` : "Live"}
          </div>
          {onSync && (
            <button className="topbar-sync-btn" onClick={onSync} title="Refresh from Google Sheets" id="btn-sync">
              🔄
            </button>
          )}
        </div>

        {/* QR Scanner button */}
        {onScannerOpen && (
          <button
            className="topbar-scanner-btn"
            onClick={onScannerOpen}
            id="btn-qr-scanner"
            title="Scan QR Code"
          >
            📷 <span className="scanner-btn-label">Scan QR</span>
          </button>
        )}

        <button className="settings-btn" onClick={onSettings} id="btn-settings" title="Settings">
          ⚙️
        </button>
        <div className="topbar-avatar" title="Admin">A</div>
      </div>

      {/* ── Mobile hamburger ── */}
      <button className="mobile-menu-btn" onClick={() => setMobileOpen((o) => !o)} id="menu-toggle">
        <span /><span /><span />
      </button>

      {/* ── Mobile dropdown ── */}
      {mobileOpen && (
        <div className="mobile-nav-panel">
          <button className="mobile-nav-item" onClick={() => { onHome(); setMobileOpen(false); }}>🏠 Home</button>
          <button className="mobile-nav-item" onClick={() => { onDashboard(); setMobileOpen(false); }}>📊 Dashboard</button>
          <button className="mobile-nav-item" onClick={() => { onToggleDarkMode(); setMobileOpen(false); }}>
            {darkMode ? "☀️ Switch to Light Mode" : "🌙 Switch to Dark Mode"}
          </button>
          {onScannerOpen && (
            <button className="mobile-nav-item mobile-scan-btn" onClick={() => { onScannerOpen(); setMobileOpen(false); }}>
              📷 Scan QR Code
            </button>
          )}
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              className={`mobile-nav-item ${selectedCategory === cat.name ? "active" : ""}`}
              onClick={() => { onSelectCategory(cat.name); setMobileOpen(false); }}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

