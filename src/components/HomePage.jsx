import React, { useState, useMemo } from "react";
import { CATEGORIES } from "../data/inventoryData";
import logoImg from "../assets/logo.jpg";
import heroIllustration from "../assets/hero_it_illustration.png";
import "./HomePage.css";

export default function HomePage({
  inventory = [],
  onSelectCategory,
  onViewDashboard,
  onViewAllTable,
  onScannerOpen,
  onBatchQrOpen,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mousePos, setMousePos] = useState({ x: 50, y: 50, parallaxX: 0, parallaxY: 0 });
  const [tiltCards, setTiltCards] = useState({});

  const total          = inventory.length;
  const functional     = inventory.filter((i) => i.status === "Functional").length;
  const forReplacement = inventory.filter((i) => i.status === "For Replacement").length;
  const forUpgrade     = inventory.filter((i) => i.status === "For Upgrade").length;
  const defective      = inventory.filter((i) => i.status === "Defective").length;

  const funcPct = total > 0 ? Math.round((functional / total) * 100) : 0;

  // Track mouse coordinates for background spotlight glow & 3D parallax offset
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    const parallaxX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const parallaxY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

    setMousePos({ x, y, parallaxX, parallaxY });
  };

  // 3D Magnetic card tilt effect on mouse move over category cards
  const handleCardMouseMove = (e, catName) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = Math.round(((y - centerY) / centerY) * -12);
    const rotateY = Math.round(((x - centerX) / centerX) * 12);
    setTiltCards((prev) => ({ ...prev, [catName]: { rotateX, rotateY } }));
  };

  const handleCardMouseLeave = (catName) => {
    setTiltCards((prev) => ({ ...prev, [catName]: { rotateX: 0, rotateY: 0 } }));
  };

  // Quick search filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES;
    const q = searchQuery.toLowerCase();
    return CATEGORIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.icon.includes(q)
    );
  }, [searchQuery]);

  return (
    <div
      className="home-page"
      onMouseMove={handleMouseMove}
      style={{
        "--spotlight-x": `${mousePos.x}%`,
        "--spotlight-y": `${mousePos.y}%`,
        "--parallax-x": mousePos.parallaxX,
        "--parallax-y": mousePos.parallaxY,
      }}
    >
      {/* ── Interactive 3D Background Illustration Canvas ── */}
      <div className="home-bg-illustration-layer">
        <img
          src={heroIllustration}
          alt="Interactive 3D IT Infrastructure"
          className="bg-it-img"
        />
        <div className="bg-gradient-overlay" />
      </div>

      {/* Background Interactive Spotlight Glow Overlay */}
      <div className="home-spotlight-layer" />

      {/* ── Hero Banner Section ── */}
      <section className="home-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <img src={logoImg} alt="ICT Logo" className="hero-badge-logo" />
            <span className="hero-badge-text">INSTITUTIONAL ICT ASSET MANAGEMENT</span>
          </div>

          <h1 className="hero-title">
            Smart &amp; Interactive <br />
            <span className="hero-title-gradient">ICT Hardware Inventory</span>
          </h1>

          <p className="hero-subtitle">
            Live Google Sheets sync · Comprehensive hardware tracking · QR asset tag scanner &amp; multi-sticker printing.
          </p>

          {/* Quick Action Launcher Buttons */}
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={onViewAllTable} id="home-btn-explore">
              🖥️ Browse Hardware ({total.toLocaleString()})
            </button>
            <button className="btn-hero-secondary" onClick={onScannerOpen} id="home-btn-scanner">
              📷 Scan QR Code
            </button>
            <button className="btn-hero-secondary" onClick={onViewDashboard} id="home-btn-dashboard">
              📊 Analytics Dashboard
            </button>
            <button className="btn-hero-accent" onClick={onBatchQrOpen} id="home-btn-stickers">
              🏷️ Print QR Stickers
            </button>
          </div>

          {/* Live Key Metrics */}
          <div className="hero-metrics-row">
            <div className="hm-pill total">
              <span className="hm-val">{total.toLocaleString()}</span>
              <span className="hm-lbl">Total Devices</span>
            </div>
            <div className="hm-pill ok">
              <span className="hm-val">{functional.toLocaleString()}</span>
              <span className="hm-lbl">{funcPct}% Functional</span>
            </div>
            <div className="hm-pill warn">
              <span className="hm-val">{forUpgrade + forReplacement}</span>
              <span className="hm-lbl">Needs Attention</span>
            </div>
            <div className="hm-pill bad">
              <span className="hm-val">{defective.toLocaleString()}</span>
              <span className="hm-lbl">Defective</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Category Explorer Section ── */}
      <section className="home-explorer">
        <div className="explorer-header">
          <div>
            <h2 className="explorer-title">Explore 12 Hardware Categories</h2>
            <p className="explorer-sub">Hover over any category card to inspect 3D magnetic lighting</p>
          </div>

          {/* Quick Search */}
          <div className="explorer-search-wrap">
            <span className="es-icon">🔍</span>
            <input
              className="explorer-search-input"
              placeholder="Filter categories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="es-clear" onClick={() => setSearchQuery("")}>✕</button>
            )}
          </div>
        </div>

        {/* 3D Magnetic Category Cards Grid */}
        <div className="home-cat-grid">
          {filteredCategories.map((cat) => {
            const count = inventory.filter(
              (i) => i.category === cat.name || i.tabCategory === cat.name
            ).length;
            const funcCount = inventory.filter(
              (i) =>
                (i.category === cat.name || i.tabCategory === cat.name) &&
                i.status === "Functional"
            ).length;
            const pct = count > 0 ? Math.round((funcCount / count) * 100) : 0;
            const tilt = tiltCards[cat.name] || { rotateX: 0, rotateY: 0 };

            return (
              <div
                key={cat.name}
                className="home-cat-card"
                onMouseMove={(e) => handleCardMouseMove(e, cat.name)}
                onMouseLeave={() => handleCardMouseLeave(cat.name)}
                onClick={() => onSelectCategory(cat.name)}
                style={{
                  "--cat-color": cat.color,
                  transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${
                    tilt.rotateX !== 0 ? 1.04 : 1
                  })`,
                }}
              >
                <div className="hcc-top">
                  <span className="hcc-icon-wrap" style={{ background: cat.color + "22", borderColor: cat.color + "44" }}>
                    <span className="hcc-icon">{cat.icon}</span>
                  </span>
                  <span className="hcc-count-badge">{count.toLocaleString()} units</span>
                </div>

                <h3 className="hcc-name">{cat.name}</h3>

                <div className="hcc-health-row">
                  <span
                    className="hcc-health-pct"
                    style={{ color: pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444" }}
                  >
                    {pct}% functional
                  </span>
                  <span className="hcc-arrow">Browse →</span>
                </div>

                <div className="hcc-bar-track">
                  <div
                    className="hcc-bar-fill"
                    style={{
                      width: `${Math.min(100, (count / Math.max(1, total)) * 100 * 3)}%`,
                      background: cat.color,
                    }}
                  />
                </div>

                {/* Subtle Neon Card Edge Highlight */}
                <div className="hcc-glow-edge" style={{ background: cat.color }} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
