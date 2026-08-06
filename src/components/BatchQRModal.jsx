import React, { useState, useRef, useMemo } from "react";
import { QRCard } from "./QRModal";
import { CATEGORIES } from "../data/inventoryData";
import "./BatchQRModal.css";

export default function BatchQRModal({ items = [], onClose }) {
  const printRef = useRef(null);

  const [selectedIds, setSelectedIds] = useState(() => new Set(items.slice(0, 12).map((i) => i.id)));
  const [catFilter,   setCatFilter]   = useState("All");
  const [campusFilter, setCampusFilter] = useState("All");
  const [preset,     setPreset]      = useState("mini"); // "mini" | "standard" | "badge"

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat    = catFilter === "All" || item.category === catFilter;
      const matchCampus = campusFilter === "All" || item.campus === campusFilter;
      return matchCat && matchCampus;
    });
  }, [items, catFilter, campusFilter]);

  // Selected items array
  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const handlePrintSheet = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const cols = preset === "mini" ? 4 : preset === "standard" ? 3 : 2;

    const w = window.open("", "_blank");
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ICT Asset Tag Stickers Sheet (${selectedItems.length} Stickers)</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              background: #ffffff;
              padding: 15mm;
            }
            .batch-sticker-grid {
              display: grid;
              grid-template-columns: repeat(${cols}, 1fr);
              gap: 8mm 6mm;
              justify-items: center;
            }
            .qr-card {
              background: #ffffff;
              border-radius: 10px;
              padding: 10px;
              width: ${preset === "mini" ? "170px" : preset === "standard" ? "220px" : "280px"};
              border: 1.5px solid #800020;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 6px;
              text-align: center;
              page-break-inside: avoid;
            }
            .qrc-header { display: flex; align-items: center; gap: 6px; width: 100%; justify-content: center; border-bottom: 1px solid #e5dcca; padding-bottom: 4px; }
            .qrc-logo { width: 22px; height: 22px; border-radius: 50%; border: 1px solid #ffd700; }
            .qrc-header-text { display: flex; flex-direction: column; gap: 1px; }
            .qrc-sys-name { font-size: 8px; font-weight: 900; color: #800020; letter-spacing: 0.4px; }
            .qrc-cat-badge { font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 8px; border: 1px solid; }
            .qrc-qr-wrap { padding: 4px; background: #fff; border-radius: 6px; border: 1px solid #d4af37; }
            .qrc-caption { display: flex; flex-direction: column; align-items: center; gap: 1px; }
            .qrc-tag { font-size: 13px; font-weight: 900; color: #800020; letter-spacing: 0.4px; }
            .qrc-dept { font-size: 10px; font-weight: 700; color: #2b0f19; }
            .qrc-device-row { display: flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #5c3545; }
            .qrc-details { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 100%; background: #faf7f2; border-radius: 4px; padding: 4px; font-size: 8px; }
            .qrc-dl { font-size: 7px; font-weight: 700; color: #7a5866; text-transform: uppercase; }
            .qrc-dv { font-size: 9px; font-weight: 700; color: #2b0f19; }
            .qrc-footer { font-size: 7px; font-weight: 800; color: #800020; letter-spacing: 0.4px; }
            @media print {
              body { padding: 8mm; background: none; }
              @page { size: auto; margin: 5mm; }
            }
          </style>
        </head>
        <body>
          <div className="batch-sticker-grid">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 350);
  };

  return (
    <div className="batch-qr-backdrop" onClick={onClose}>
      <div className="batch-qr-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="batch-qr-header">
          <div>
            <h2 className="batch-qr-title">🖨️ Batch Print Device Asset Stickers</h2>
            <p className="batch-qr-sub">Select devices to generate a printable sticker grid sheet</p>
          </div>
          <button className="batch-qr-close" onClick={onClose}>✕</button>
        </div>

        {/* Controls Bar */}
        <div className="batch-qr-controls">
          <div className="bq-filter-group">
            <select
              className="bq-select"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="All">All Categories ({items.length})</option>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>

            <select
              className="bq-select"
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
            >
              <option value="All">All Campuses</option>
              <option value="Main">Main Campus</option>
              <option value="RNP">RNP</option>
              <option value="Paseo">Paseo</option>
            </select>
          </div>

          <div className="bq-size-group">
            <span className="bq-size-label">Sticker Size:</span>
            <button
              className={`bq-size-btn ${preset === "mini" ? "active" : ""}`}
              onClick={() => setPreset("mini")}
            >
              Mini (1.25")
            </button>
            <button
              className={`bq-size-btn ${preset === "standard" ? "active" : ""}`}
              onClick={() => setPreset("standard")}
            >
              Standard (2")
            </button>
            <button
              className={`bq-size-btn ${preset === "badge" ? "active" : ""}`}
              onClick={() => setPreset("badge")}
            >
              Badge (3")
            </button>
          </div>
        </div>

        {/* Selection summary & Toggle All */}
        <div className="batch-qr-bar">
          <label className="bq-check-label">
            <input
              type="checkbox"
              checked={selectedIds.size > 0 && selectedIds.size === filteredItems.length}
              onChange={toggleSelectAll}
            />
            <span>Select All Filtered ({filteredItems.length})</span>
          </label>
          <span className="bq-selected-count">
            Selected: <strong>{selectedIds.size}</strong> devices
          </span>
        </div>

        {/* Device Picker List */}
        <div className="batch-device-list">
          {filteredItems.map((item) => {
            const isSel = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`batch-device-item ${isSel ? "selected" : ""}`}
                onClick={() => toggleSelect(item.id)}
              >
                <input type="checkbox" checked={isSel} onChange={() => {}} />
                <span className="bdi-tag">{item.assetTag ? `#${item.assetTag}` : `#ID-${item.id}`}</span>
                <span className="bdi-name">{item.name}</span>
                <span className="bdi-dept">{item.department || item.campus}</span>
              </div>
            );
          })}
        </div>

        {/* Hidden Printable Sheet Grid */}
        <div style={{ display: "none" }}>
          <div ref={printRef}>
            {selectedItems.map((item) => (
              <QRCard key={item.id} item={item} preset={preset} />
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="batch-qr-actions">
          <button className="bq-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="bq-btn-print"
            disabled={selectedItems.length === 0}
            onClick={handlePrintSheet}
          >
            🖨️ Print Sticker Sheet ({selectedItems.length})
          </button>
        </div>

      </div>
    </div>
  );
}
