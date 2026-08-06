import React, { useState } from "react";
import logoImg from "../assets/logo.jpg";
import bgPanoramic from "../assets/hero_it_bg_panoramic.png";
import "./HomePage.css";

export default function HomePage({
  inventory = [],
  onViewDashboard,
  onViewAllTable,
  onScannerOpen,
  onBatchQrOpen,
}) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50, parallaxX: 0, parallaxY: 0 });

  const total          = inventory.length;
  const functional     = inventory.filter((i) => i.status === "Functional").length;
  const forReplacement = inventory.filter((i) => i.status === "For Replacement").length;
  const forUpgrade     = inventory.filter((i) => i.status === "For Upgrade").length;
  const defective      = inventory.filter((i) => i.status === "Defective").length;

  const funcPct = total > 0 ? Math.round((functional / total) * 100) : 0;

  // Track mouse coordinates for interactive 3D parallax & cursor spotlight
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    const parallaxX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const parallaxY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

    setMousePos({ x, y, parallaxX, parallaxY });
  };

  return (
    <div
      className="home-page full-bg-home"
      onMouseMove={handleMouseMove}
      style={{
        "--spotlight-x": `${mousePos.x}%`,
        "--spotlight-y": `${mousePos.y}%`,
        "--parallax-x": mousePos.parallaxX,
        "--parallax-y": mousePos.parallaxY,
      }}
    >
      {/* ── Full-Screen Panoramic Animated 3D IT Background ── */}
      <div className="home-full-bg-layer">
        <img
          src={bgPanoramic}
          alt="Full-Screen 3D IT Infrastructure Background"
          className="full-bg-it-img"
        />

        {/* Animated Cyber Nodes & Signal Rings */}
        <div className="cyber-node node-1" />
        <div className="cyber-node node-2" />
        <div className="cyber-node node-3" />
        <div className="pulse-ring ring-1" />
        <div className="pulse-ring ring-2" />

        {/* Vignette & Contrast Gradients */}
        <div className="full-bg-gradient-overlay" />
      </div>

      {/* Background Cursor Spotlight Glow */}
      <div className="home-spotlight-layer" />

      {/* ── Hero Content Card ── */}
      <section className="home-hero-center">
        <div className="hero-glass-card">
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

          {/* Live Key Metrics Row */}
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
    </div>
  );
}
