import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import logoImg from "../assets/logo.jpg";
import { getCategoryMeta } from "../data/inventoryData";
import "./QRModal.css";

/**
 * Builds the text payload encoded inside the QR code.
 * Compact but human-readable when scanned.
 */
function buildQRPayload(item) {
  const lines = [
    `ICT Hardware Inventory`,
    `────────────────────────`,
    `Device: ${item.deviceType || item.name || "—"}`,
    `Category: ${item.category || "—"}`,
    `Asset Tag: ${item.assetTag || "—"}`,
    `Campus: ${item.campus || "—"}`,
    `Department: ${item.department || "—"}`,
    `Assigned To: ${item.assignedUser || "—"}`,
    `Status: ${item.status || "—"}`,
    `Year: ${item.yearPurchased || "—"}`,
  ];

  // Category-specific extras
  if (item.processor) lines.push(`Processor: ${item.processor}`);
  if (item.ram)       lines.push(`RAM: ${item.ram}`);
  if (item.os)        lines.push(`OS: ${item.os}`);
  if (item.storage)   lines.push(`Storage: ${item.storage}`);
  if (item.brand)     lines.push(`Brand: ${item.brand}`);
  if (item.modelNo)   lines.push(`Model: ${item.modelNo}`);

  return lines.join("\n");
}

/**
 * A single printable QR card — exported so it can be embedded in the
 * detail drawer too (without the modal chrome).
 */
export function QRCard({ item, size = 180 }) {
  const meta    = getCategoryMeta(item.category);
  const payload = buildQRPayload(item);
  const dept    = item.department || item.campus || "—";
  const device  = item.deviceType || item.name || "Device";
  const tag     = item.assetTag   ? `#${item.assetTag}` : "";

  return (
    <div className="qr-card">
      {/* Header */}
      <div className="qrc-header">
        <img src={logoImg} alt="ICT" className="qrc-logo" />
        <div className="qrc-header-text">
          <span className="qrc-sys-name">ICT Hardware Inventory</span>
          <span className="qrc-cat-badge" style={{ background: meta.color + "22", color: meta.color, borderColor: meta.color + "55" }}>
            {meta.icon} {item.category}
          </span>
        </div>
      </div>

      {/* QR Code */}
      <div className="qrc-qr-wrap">
        <QRCodeSVG
          value={payload}
          size={size}
          level="H"
          includeMargin={true}
          imageSettings={{
            src: logoImg,
            x: undefined,
            y: undefined,
            height: Math.round(size * 0.16),
            width:  Math.round(size * 0.16),
            excavate: true,
          }}
        />
      </div>

      {/* Caption — department/office is the main caption */}
      <div className="qrc-caption">
        <span className="qrc-dept">{dept}</span>
        {tag && <span className="qrc-tag">{tag}</span>}
      </div>

      {/* Device info row */}
      <div className="qrc-device-row">
        <span className="qrc-icon">{meta.icon}</span>
        <span className="qrc-device-name">{device}</span>
      </div>

      {/* Details grid */}
      <div className="qrc-details">
        {item.campus && (
          <div className="qrc-detail-item">
            <span className="qrc-dl">Campus</span>
            <span className="qrc-dv">{item.campus}</span>
          </div>
        )}
        {item.assignedUser && (
          <div className="qrc-detail-item">
            <span className="qrc-dl">Assigned To</span>
            <span className="qrc-dv">{item.assignedUser}</span>
          </div>
        )}
        {item.status && (
          <div className="qrc-detail-item">
            <span className="qrc-dl">Status</span>
            <span className="qrc-dv qrc-status" style={{ color: item.status === "Functional" ? "#22c55e" : item.status === "Defective" ? "#ef4444" : "#f59e0b" }}>
              {item.status}
            </span>
          </div>
        )}
        {item.yearPurchased && (
          <div className="qrc-detail-item">
            <span className="qrc-dl">Year</span>
            <span className="qrc-dv">{item.yearPurchased}</span>
          </div>
        )}
      </div>

      <div className="qrc-footer">Scan to view full device record</div>
    </div>
  );
}

/**
 * Full-screen modal that shows the QR card with a Print button.
 * Opens when the user clicks the QR icon in the actions column.
 */
export default function QRModal({ item, onClose }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <html>
        <head>
          <title>QR – ${item.deviceType || item.name} – ${item.department}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f9f6f0; }
            .qr-card { background: #fff; border-radius: 20px; padding: 28px 24px; max-width: 320px; width: 100%; box-shadow: 0 4px 24px rgba(128,0,32,0.15); border: 1px solid #e5dcca; display: flex; flex-direction: column; align-items: center; gap: 14px; }
            .qrc-header { display: flex; align-items: center; gap: 10px; width: 100%; }
            .qrc-logo { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #ffd700; }
            .qrc-header-text { display: flex; flex-direction: column; gap: 3px; }
            .qrc-sys-name { font-size: 13px; font-weight: 800; color: #800020; }
            .qrc-cat-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: 1px solid; display: inline-block; }
            .qrc-qr-wrap { padding: 10px; background: #fff; border-radius: 12px; border: 2px solid #e5dcca; }
            .qrc-caption { text-align: center; }
            .qrc-dept { font-size: 20px; font-weight: 900; color: #800020; display: block; }
            .qrc-tag { font-size: 12px; font-weight: 600; color: #7a5866; }
            .qrc-device-row { display: flex; align-items: center; gap: 8px; }
            .qrc-icon { font-size: 18px; }
            .qrc-device-name { font-size: 14px; font-weight: 700; color: #2b0f19; }
            .qrc-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; background: #faf7f2; border-radius: 10px; padding: 12px; }
            .qrc-detail-item { display: flex; flex-direction: column; gap: 2px; }
            .qrc-dl { font-size: 9px; font-weight: 700; color: #7a5866; text-transform: uppercase; letter-spacing: 0.5px; }
            .qrc-dv { font-size: 12px; font-weight: 700; color: #2b0f19; }
            .qrc-footer { font-size: 10px; color: #7a5866; text-align: center; font-style: italic; }
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
        {/* Modal header */}
        <div className="qr-modal-header">
          <h2 className="qr-modal-title">📱 Device QR Code</h2>
          <div className="qr-modal-actions">
            <button className="btn-qr-print" onClick={handlePrint} title="Print QR Card">
              🖨️ Print
            </button>
            <button className="btn-qr-close" onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        {/* The card itself */}
        <div ref={printRef}>
          <QRCard item={item} size={200} />
        </div>

        <p className="qr-modal-hint">Scan with any QR reader to view full device details</p>
      </div>
    </div>
  );
}
