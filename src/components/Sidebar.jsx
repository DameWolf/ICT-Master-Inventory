import React from "react";
import { STATUS_COLORS, CATEGORIES } from "../data/inventoryData";
import logoImg from "../assets/logo.jpg";
import "./Sidebar.css";

export default function Sidebar({ selectedCategory, onSelectCategory, inventory, isOpen, onClose, lastSynced, onSync }) {

  const totalDevices = inventory.length;
  const functional   = inventory.filter((i) => i.status === "Functional").length;
  const defective    = inventory.filter((i) => i.status === "Defective").length;

  const getCategoryCount = (catName) =>
    inventory.filter((i) => i.category === catName || i.tabCategory === catName).length;

  const formatSynced = (date) => {
    if (!date) return null;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "open" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src={logoImg} alt="ICT Logo" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #ffd700", background: "#fff" }} />
            <div>
              <h1 className="sidebar-title">ICT Hardware</h1>
              <p className="sidebar-subtitle">Inventory Management</p>
            </div>
          </div>
        </div>

        {/* Live sync indicator */}
        <div className="sidebar-sync">
          <div className="sync-badge">
            <span className="sync-dot" />
            <span className="sync-label">
              {lastSynced ? `Synced ${formatSynced(lastSynced)}` : "Loading…"}
            </span>
          </div>
          <button className="sync-btn" onClick={onSync} id="btn-sync" title="Sync from Google Sheets">
            🔄
          </button>
        </div>

        <div className="sidebar-stats">
          <div className="stat-pill">
            <span className="stat-pill-number">{totalDevices.toLocaleString()}</span>
            <span className="stat-pill-label">Total</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-number" style={{ color: STATUS_COLORS.Functional }}>{functional.toLocaleString()}</span>
            <span className="stat-pill-label">Functional</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-number" style={{ color: STATUS_COLORS.Defective }}>{defective.toLocaleString()}</span>
            <span className="stat-pill-label">Defective</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${selectedCategory === null ? "active" : ""}`}
            onClick={() => { onSelectCategory(null); onClose(); }}
            id="nav-all"
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Dashboard</span>
            <span className="nav-badge">{totalDevices.toLocaleString()}</span>
          </button>

          {/* Strictly the 12 Main ICT Hardware Categories */}
          <div className="nav-section-label">Hardware Categories</div>
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.name);
            return (
              <button
                key={cat.name}
                className={`nav-item ${selectedCategory === cat.name ? "active" : ""}`}
                onClick={() => { onSelectCategory(cat.name); onClose(); }}
                id={`nav-cat-${cat.name.replace(/\s+/g, "-").toLowerCase()}`}
                style={selectedCategory === cat.name ? { borderLeftColor: cat.color } : {}}
              >
                <span className="nav-icon">{cat.icon}</span>
                <span className="nav-label">{cat.name}</span>
                <span className="nav-badge" style={selectedCategory === cat.name ? { background: cat.color } : {}}>
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-footer-text">ICT Hardware Inventory System</p>
        </div>
      </aside>
    </>
  );
}
