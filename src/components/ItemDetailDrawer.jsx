import React, { useState, useCallback } from "react";
import { STATUS_COLORS, getCategoryMeta, CATEGORIES } from "../data/inventoryData";
import { getAppsScriptUrl, updateSheetRow } from "../hooks/useAppsScript";
import {
  PROCESSOR_OPTIONS, RAM_OPTIONS, OS_OPTIONS, STORAGE_OPTIONS,
  OFFICE_TYPE_OPTIONS, DEPARTMENT_OPTIONS, YEAR_OPTIONS, DEVICE_TYPE_OPTIONS,
} from "../data/specOptions";
import { QRCard } from "./QRModal";
import "./ItemDetailDrawer.css";
import "./QRModal.css";

const STATUSES   = ["Functional", "For Upgrade", "For Replacement", "Defective"];
const CAMPUSES   = ["Main", "RNP", "Paseo"];
const USER_TYPES = ["Staff", "Faculty", "Student", "Dean/Principal/Head"];
const USAGES     = ["Browser", "Software App", "Browser & Software App"];

/* ─────────────────────────────────────────────────────────────
   EditField — renders a read-only row OR an editable input/select
   Props:
     label      : string
     icon       : string (emoji)
     fieldKey   : key in editValues
     value      : current item value (read mode)
     isEditing  : bool
     editValues : { [fieldKey]: string }
     onChange   : (key, value) => void
     type       : "text" | "number"
     options    : string[] → renders <select>
     datalistId : string   → renders <input list="datalistId"> with <datalist>
     datalist   : string[] → the options for the datalist
───────────────────────────────────────────────────────────── */
function EditField({
  label, icon, fieldKey, value, isEditing, editValues, onChange,
  type = "text", options, datalistId, datalist,
}) {
  if (!isEditing) {
    return (
      <div className="drawer-field">
        <div className="field-label-row">
          <span className="field-icon">{icon}</span>
          <span className="field-label">{label}</span>
        </div>
        <div className="field-value-row">
          <span className="field-text">{value || "—"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="drawer-field drawer-field-editing">
      <div className="field-label-row">
        <span className="field-icon">{icon}</span>
        <span className="field-label">{label}</span>
      </div>
      <div className="field-value-row">
        {/* Pure dropdown (fixed choices) */}
        {options && !datalistId && (
          <select
            className="edit-input edit-select"
            value={editValues[fieldKey] || ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
          >
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}

        {/* Searchable datalist (suggestions + free text) */}
        {datalistId && datalist && (
          <>
            <input
              className="edit-input"
              type={type}
              list={datalistId}
              value={editValues[fieldKey] ?? ""}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              placeholder={`Type or choose ${label.toLowerCase()}…`}
              autoComplete="off"
            />
            <datalist id={datalistId}>
              {datalist.map((o) => <option key={o} value={o} />)}
            </datalist>
          </>
        )}

        {/* Plain text / number */}
        {!options && !datalistId && (
          <input
            className="edit-input"
            type={type}
            value={editValues[fieldKey] ?? ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}…`}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ItemDetailDrawer
───────────────────────────────────────────────────────────── */
export default function ItemDetailDrawer({ item, onClose, onLocalUpdate, onDelete, onAddToast }) {
  if (!item) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [editValues, setEditValues] = useState({});

  const meta        = getCategoryMeta(item.category);
  const catColor    = meta.color;
  const statusColor = STATUS_COLORS[item.status] || "#64748b";
  const cur         = isEditing ? { ...item, ...editValues } : item;
  const curStatColor = STATUS_COLORS[cur.status] || "#64748b";

  const startEdit = () => {
    setEditValues({
      name:          item.name          || "",
      campus:        item.campus         || "",
      officeType:    item.officeType     || "",
      department:    item.department     || "",
      userType:      item.userType       || "",
      yearPurchased: item.yearPurchased  || "",
      usage:         item.usage          || "",
      processor:     item.processor      || "",
      ram:           item.ram            || "",
      os:            item.os             || "",
      storage:       item.storage        || "",
      storageExtra:  item.storageExtra   || "",
      assetTag:      item.assetTag       || "",
      assignedUser:  item.assignedUser   || "",
      status:        item.status         || "Functional",
      remarks:       item.remarks        || "",
    });
    setIsEditing(true);
  };

  const cancelEdit = () => { setEditValues({}); setIsEditing(false); };

  const handleChange = useCallback((field, value) => {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updatedItem  = { ...item, ...editValues };
    onLocalUpdate(item.id, editValues);             // optimistic update

    const appsScriptUrl = getAppsScriptUrl();
    const sheetRowIndex = item.id + 1;              // +1 because header is row 1

    try {
      if (!appsScriptUrl) {
        onAddToast({ type: "info", message: "Local update saved. Open ⚙️ Settings to enable Google Sheets sync." });
      } else {
        onAddToast({ type: "loading", message: "Saving to Google Sheets…", duration: 8000 });
        await updateSheetRow(appsScriptUrl, sheetRowIndex, updatedItem);
        onAddToast({ type: "success", message: "✅ Google Sheets updated successfully!" });
      }
      setIsEditing(false);
      setEditValues({});
    } catch (err) {
      onAddToast({ type: "error", message: `❌ Sheets sync failed: ${err.message}` });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => { onDelete(item.id); onClose(); };

  const fp = { isEditing, editValues, onChange: handleChange };

  return (
    <>
      <div className="drawer-backdrop" onClick={isEditing ? undefined : onClose} />
      <aside className="detail-drawer" style={{ "--cat-color": catColor }}>
        <div className="drawer-accent-bar" style={{ background: catColor }} />

        {/* ── Header ── */}
        <div className="drawer-header">
          <div className="drawer-icon-wrap" style={{ background: catColor + "22", borderColor: catColor + "44" }}>
            <span className="drawer-cat-icon">{getCategoryMeta(cur.name || cur.category).icon}</span>
          </div>
          <div className="drawer-title-group">
            {isEditing ? (
              <>
                <input
                  className="edit-input edit-title-input"
                  list="dl-device-type"
                  value={editValues.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Device type…"
                />
                <datalist id="dl-device-type">
                  {DEVICE_TYPE_OPTIONS.map((o) => <option key={o} value={o} />)}
                </datalist>
              </>
            ) : (
              <h2 className="drawer-item-name">{item.name}</h2>
            )}
            <p className="drawer-item-cat">{cur.campus || item.campus} · {cur.department || item.department}</p>
          </div>
          {!isEditing && (
            <button className="drawer-close" onClick={onClose} id="drawer-close" aria-label="Close">✕</button>
          )}
        </div>

        {/* ── Status Banner ── */}
        <div
          className="drawer-status-banner"
          style={{ background: curStatColor + "15", borderColor: curStatColor + "40" }}
        >
          <span className="status-dot-lg" style={{ background: curStatColor }} />
          {isEditing ? (
            <select
              className="edit-input edit-status-select"
              value={editValues.status || item.status}
              onChange={(e) => handleChange("status", e.target.value)}
              style={{ color: curStatColor }}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <span className="drawer-status-text" style={{ color: statusColor }}>{item.status}</span>
          )}
          {cur.assignedUser && !isEditing && (
            <span className="drawer-user-pill">👤 {cur.assignedUser}</span>
          )}
        </div>

        {/* ── Edit mode banner ── */}
        {isEditing && (
          <div className="edit-mode-banner">
            ✏️ Edit mode — changes sync to Google Sheets on save
          </div>
        )}

        {/* ── Fields ── */}
        <div className="drawer-fields">

          {/* Classification */}
          <div className="drawer-field-group">
            <div className="drawer-group-title">Classification</div>
            <EditField label="Hardware Category" icon="🏷️" fieldKey="category"
              value={item.category || item.tabCategory}
              options={CATEGORIES.map((c) => c.name)}
              {...fp} />
            <EditField label="Device Type" icon="🖥️" fieldKey="deviceType"
              value={item.deviceType || item.name}
              datalistId="dl-device-type" datalist={DEVICE_TYPE_OPTIONS}
              {...fp} />
            <EditField label="Year Purchased" icon="📅" fieldKey="yearPurchased"
              value={item.yearPurchased}
              datalistId="dl-year" datalist={YEAR_OPTIONS}
              {...fp} />
          </div>

          {/* ─── Computing Devices: Processor/RAM/OS/Storage ─── */}
          {item.category === "Computing Devices" && (
            <div className="drawer-field-group">
              <div className="drawer-group-title">Device Specs</div>
              <EditField label="Processor"        icon="⚙️" fieldKey="processor"   value={item.processor}    datalistId="dl-processor" datalist={PROCESSOR_OPTIONS}        {...fp} />
              <EditField label="RAM"              icon="🧠" fieldKey="ram"          value={item.ram}          datalistId="dl-ram"       datalist={RAM_OPTIONS}             {...fp} />
              <EditField label="Operating System" icon="🪟" fieldKey="os"           value={item.os}           datalistId="dl-os"        datalist={OS_OPTIONS}              {...fp} />
              <EditField label="Storage"          icon="💾" fieldKey="storage"      value={item.storage}      datalistId="dl-storage"   datalist={STORAGE_OPTIONS}         {...fp} />
              <EditField label="Extra Disk"       icon="🗄️" fieldKey="storageExtra" value={item.storageExtra} datalistId="dl-extra"     datalist={["N/A",...STORAGE_OPTIONS]} {...fp} />
              <EditField label="Usage"            icon="🖱️" fieldKey="usage"        value={item.usage}        options={USAGES}                                             {...fp} />
            </div>
          )}

          {/* ─── Networking Equipment: Brand/Model/MAC/Building/DeviceName ─── */}
          {item.category === "Networking Equipment" && (
            <div className="drawer-field-group">
              <div className="drawer-group-title">Network Specs</div>
              <EditField label="Brand"       icon="🏭" fieldKey="brand"      value={item.brand}      {...fp} />
              <EditField label="Model"       icon="📟" fieldKey="model"      value={item.model}      {...fp} />
              <EditField label="MAC Address" icon="🔢" fieldKey="mac"        value={item.mac}        {...fp} />
              <EditField label="Building"    icon="🏢" fieldKey="building"   value={item.building}   {...fp} />
              <EditField label="Device Name" icon="🏷️" fieldKey="deviceName" value={item.deviceName} {...fp} />
            </div>
          )}

          {/* ─── Output Devices: Brand/Model/Size ─── */}
          {item.category === "Output Devices" && (
            <div className="drawer-field-group">
              <div className="drawer-group-title">Device Specs</div>
              <EditField label="Brand"         icon="🏭" fieldKey="brand"  value={item.brand}  {...fp} />
              <EditField label="Model No."     icon="📟" fieldKey="model"  value={item.model}  {...fp} />
              <EditField label="Size (Inches)" icon="📐" fieldKey="size"   value={item.size}   {...fp} />
            </div>
          )}

          {/* ─── Input / Peripheral: Brand ─── */}
          {(item.category === "Input Devices" || item.category === "Peripheral Devices") && (
            <div className="drawer-field-group">
              <div className="drawer-group-title">Device Specs</div>
              <EditField label="Brand" icon="🏭" fieldKey="brand" value={item.brand} {...fp} />
            </div>
          )}

          {/* ─── Communication Devices: Brand/Model/Location ─── */}
          {item.category === "Communication Devices" && (
            <div className="drawer-field-group">
              <div className="drawer-group-title">Device Specs</div>
              <EditField label="Brand"    icon="🏭" fieldKey="brand"    value={item.brand}    {...fp} />
              <EditField label="Model"    icon="📟" fieldKey="model"    value={item.model}    {...fp} />
              <EditField label="Location" icon="📍" fieldKey="location" value={item.location} {...fp} />
            </div>
          )}

          {/* ─── Other ICT Hardware: Brand/Model/Output VA ─── */}
          {item.category === "Other ICT Hardware" && (
            <div className="drawer-field-group">
              <div className="drawer-group-title">Device Specs</div>
              <EditField label="Brand"       icon="🏭" fieldKey="brand"   value={item.brand}   {...fp} />
              <EditField label="Model No."   icon="📟" fieldKey="model"   value={item.model}   {...fp} />
              <EditField label="Output (VA)" icon="⚡" fieldKey="voltage" value={item.voltage} {...fp} />
            </div>
          )}

          {/* ─── Storage / Specialized / Wearable / Embedded / Security / BYOD ─── */}
          {["Storage Devices","Specialized Devices","Wearable Devices","Embedded Systems","Security Devices","BYOD / Personal"].includes(item.category) && (
            <div className="drawer-field-group">
              <div className="drawer-group-title">Device Specs</div>
              <EditField label="Brand" icon="🏭" fieldKey="brand" value={item.brand} {...fp} />
              <EditField label="Model" icon="📟" fieldKey="model" value={item.model} {...fp} />
              {item.category === "Storage Devices" && (
                <EditField label="Specifications"   icon="📋" fieldKey="specs"   value={item.specs}   {...fp} />
              )}
              {item.category === "Storage Devices" && (
                <EditField label="Storage Capacity" icon="💾" fieldKey="storage" value={item.storage} {...fp} />
              )}
            </div>
          )}

          {/* Location & Assignment */}
          <div className="drawer-field-group">
            <div className="drawer-group-title">Location &amp; Assignment</div>
            <EditField label="Campus"      icon="🏫" fieldKey="campus"       value={item.campus}       options={CAMPUSES}             {...fp} />
            <EditField label="Office Type" icon="🏢" fieldKey="officeType"   value={item.officeType}   options={OFFICE_TYPE_OPTIONS}  {...fp} />
            <EditField label="Department"  icon="📍" fieldKey="department"   value={item.department}   datalistId="dl-department" datalist={DEPARTMENT_OPTIONS} {...fp} />
            <EditField label="User Type"   icon="👤" fieldKey="userType"     value={item.userType}     options={USER_TYPES}           {...fp} />
            <EditField label="Assigned To" icon="🙍" fieldKey="assignedUser" value={item.assignedUser}                               {...fp} />
          </div>

          {/* Asset Info */}
          <div className="drawer-field-group">
            <div className="drawer-group-title">Asset Info</div>
            <EditField label="Asset Tag" icon="🏷️" fieldKey="assetTag" value={item.assetTag} {...fp} />
            <EditField label="Remarks"   icon="📝" fieldKey="remarks"   value={item.remarks}  {...fp} />
          </div>
        </div>

        {/* ── Meta chips ── */}
        <div className="drawer-divider" />
        <div className="drawer-meta">
          <div className="meta-chip"><span>🆔</span><span>ID #{item.id}</span></div>
          {item.yearPurchased && <div className="meta-chip"><span>📅</span><span>Purchased {item.yearPurchased}</span></div>}
          {item.assetTag && <div className="meta-chip"><span>🏷️</span><span>{item.assetTag}</span></div>}
          {!getAppsScriptUrl() && (
            <div className="meta-chip meta-chip-warn"><span>⚙️</span><span>Sheets sync not configured</span></div>
          )}
        </div>


        {/* ── QR Code Panel ── */}
        {!isEditing && (
          <div className="drawer-qr-panel">
            <div className="drawer-qr-label">📱 Device QR Code</div>
            <QRCard item={cur} size={150} />
          </div>
        )}

        {/* ── Action buttons ── */}
        {isEditing ? (
          <div className="drawer-actions">
            <button className="drawer-btn-cancel" onClick={cancelEdit} disabled={saving}>
              ✕ Cancel
            </button>
            <button
              className="drawer-btn-save"
              onClick={handleSave}
              disabled={saving}
              style={{ background: catColor }}
            >
              {saving ? "⏳ Saving…" : "💾 Save Changes"}
            </button>
          </div>
        ) : (
          <div className="drawer-actions">
            <button
              className="drawer-btn-edit"
              onClick={startEdit}
              id={`drawer-edit-${item.id}`}
              style={{ borderColor: catColor + "55", color: catColor }}
            >
              ✏️ Edit
            </button>
            <button className="drawer-btn-delete" onClick={handleDelete} id={`drawer-delete-${item.id}`}>
              🗑️ Delete
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
