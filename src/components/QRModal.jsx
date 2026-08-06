import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import logoImg from "../assets/logo.jpg";
import { getCategoryMeta } from "../data/inventoryData";
import "./QRModal.css";

/**
 * Builds ultra-compact low-density payload string.
 * Keeping string length short (<30 chars) ensures QR matrix is coarse (21x21 modules),
 * making it easily scannable even on tiny 1-inch physical device stickers.
 */
export function buildQRPayload(item) {
  const tag = item.assetTag ? item.assetTag.toString().trim() : "";
  const id  = item.id ? item.id.toString() : "";
  // Format: ICT:ASSET_TAG:ID or fallback URL/tag
  return `ICT:${tag || id}:${id}`;
}

/**
 * Miniaturized Device Asset Tag Sticker component.
 * Supports preset sizes: "mini" (1.25" sticker), "standard" (2" sticker), "badge" (3" badge)
 */
export function QRCard({ item, preset = "standard", overrideSize }) {
  const meta    = getCategoryMeta(item.category);
  const payload = buildQRPayload(item);
  const dept    = item.department || item.campus || "ICT";
  const device  = item.deviceType || item.name || "Device";
  const tag     = item.assetTag   ? `#${item.assetTag}` : `#ID-${item.id}`;

  let qrSize = 130;
  if (preset === "mini")     qrSize = 90;
  if (preset === "standard") qrSize = 130;
  if (preset === "badge")    qrSize = 170;
  if (overrideSize)          qrSize = overrideSize;

  return (
    <div className={`qr-card qr-card-${preset}`}>
      {/* Top Banner */}
      <div className="qrc-header">
        <img src={logoImg} alt="ICT" className="qrc-logo" />
        <div className="qrc-header-text">
          <span className="qrc-sys-name">ICT HARDWARE ASSET</span>
          <span
            className="qrc-cat-badge"
            style={{ background: meta.color + "22", color: meta.color, borderColor: meta.color + "55" }}
          >
            {meta.icon} {item.category}
          </span>
        </div>
      </div>

      {/* QR Code Container */}
      <div className="qrc-qr-wrap">
        <QRCodeSVG
          value={payload}
          size={qrSize}
          level="M"
          includeMargin={false}
          imageSettings={
            qrSize >= 120
              ? {
                  src: logoImg,
                  x: undefined,
                  y: undefined,
                  height: Math.round(qrSize * 0.18),
                  width:  Math.round(qrSize * 0.18),
                  excavate: true,
                }
              : undefined
          }
        />
      </div>

      {/* Main Asset Info */}
      <div className="qrc-caption">
        <span className="qrc-tag">{tag}</span>
        <span className="qrc-dept">{dept}</span>
      </div>

      {/* Device & User Info */}
      <div className="qrc-device-row">
        <span className="qrc-icon">{meta.icon}</span>
        <span className="qrc-device-name">{device}</span>
      </div>

      {preset !== "mini" && (
        <div className="qrc-details">
          {item.campus && (
            <div className="qrc-detail-item">
              <span className="qrc-dl">Campus</span>
              <span className="qrc-dv">{item.campus}</span>
            </div>
          )}
          {item.assignedUser && (
            <div className="qrc-detail-item">
              <span className="qrc-dl">Assigned</span>
              <span className="qrc-dv">{item.assignedUser}</span>
            </div>
          )}
          {item.status && (
            <div className="qrc-detail-item">
              <span className="qrc-dl">Status</span>
              <span
                className="qrc-dv qrc-status"
                style={{
                  color:
                    item.status === "Functional"
                      ? "#22c55e"
                      : item.status === "Defective"
                      ? "#ef4444"
                      : "#f59e0b",
                }}
              >
                {item.status}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="qrc-footer">PROPERTY OF ICT INVENTORY</div>
    </div>
  );
}

/**
 * Full-screen modal to preview single asset sticker and print.
 */
export default function QRModal({ item, onClose }) {
  const printRef = useRef(null);
  const [preset, setPreset] = useState("standard"); // "mini" | "standard" | "badge"

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Sticker - ${item.assetTag || item.id} - ${item.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #ffffff;
              padding: 20px;
            }
            .qr-card {
              background: #ffffff;
              border-radius: 12px;
              padding: 14px 16px;
              width: ${preset === "mini" ? "180px" : preset === "standard" ? "240px" : "300px"};
              border: 2px solid #800020;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              text-align: center;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .qrc-header { display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center; border-bottom: 1px solid #e5dcca; padding-bottom: 6px; }
            .qrc-logo { width: 26px; height: 26px; border-radius: 50%; border: 1px solid #ffd700; }
            .qrc-header-text { display: flex; flex-direction: column; gap: 1px; }
            .qrc-sys-name { font-size: 9px; font-weight: 900; color: #800020; letter-spacing: 0.5px; }
            .qrc-cat-badge { font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 10px; border: 1px solid; }
            .qrc-qr-wrap { padding: 6px; background: #fff; border-radius: 8px; border: 1px solid #d4af37; margin: 2px 0; }
            .qrc-caption { display: flex; flex-direction: column; align-items: center; gap: 1px; }
            .qrc-tag { font-size: 15px; font-weight: 900; color: #800020; letter-spacing: 0.5px; }
            .qrc-dept { font-size: 11px; font-weight: 700; color: #2b0f19; }
            .qrc-device-row { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #5c3545; }
            .qrc-details { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; width: 100%; background: #faf7f2; border-radius: 6px; padding: 6px; font-size: 9px; }
            .qrc-dl { font-size: 8px; font-weight: 700; color: #7a5866; text-transform: uppercase; }
            .qrc-dv { font-size: 10px; font-weight: 700; color: #2b0f19; }
            .qrc-footer { font-size: 8px; font-weight: 800; color: #800020; letter-spacing: 0.5px; margin-top: 2px; }
            @media print {
              body { padding: 0; background: none; }
              .qr-card { box-shadow: none; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  return (
    <div className="qr-modal-backdrop" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="qr-modal-header">
          <h2 className="qr-modal-title">🏷️ Device Asset Sticker</h2>
          <div className="qr-modal-actions">
            <button className="btn-qr-print" onClick={handlePrint} title="Print Sticker">
              🖨️ Print Sticker
            </button>
            <button className="btn-qr-close" onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        {/* Sticker Size Preset Selector */}
        <div className="qr-size-selector">
          <span className="qrs-size-label">Sticker Size:</span>
          <button
            className={`size-btn ${preset === "mini" ? "active" : ""}`}
            onClick={() => setPreset("mini")}
          >
            📏 Mini (1.25")
          </button>
          <button
            className={`size-btn ${preset === "standard" ? "active" : ""}`}
            onClick={() => setPreset("standard")}
          >
            🏷️ Standard (2")
          </button>
          <button
            className={`size-btn ${preset === "badge" ? "active" : ""}`}
            onClick={() => setPreset("badge")}
          >
            🎴 Badge (3")
          </button>
        </div>

        {/* Sticker Card Preview */}
        <div ref={printRef} className="qr-preview-container">
          <QRCard item={item} preset={preset} />
        </div>

        <p className="qr-modal-hint">
          Low-density QR code optimized for crisp printing on small device labels.
        </p>
      </div>
    </div>
  );
}
