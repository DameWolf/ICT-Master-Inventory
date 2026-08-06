import React, { useState, useEffect } from "react";
import { CATEGORIES } from "../data/inventoryData";
import {
  PROCESSOR_OPTIONS, RAM_OPTIONS, OS_OPTIONS, STORAGE_OPTIONS,
  OFFICE_TYPE_OPTIONS, DEPARTMENT_OPTIONS, YEAR_OPTIONS, DEVICE_TYPE_OPTIONS,
} from "../data/specOptions";
import "./ItemModal.css";

const STATUSES   = ["Functional", "For Upgrade", "For Replacement", "Defective"];
const CAMPUSES   = ["Main", "RNP", "Paseo"];
const USER_TYPES = ["Staff", "Faculty", "Student", "Dean/Principal/Head"];
const USAGES     = ["Browser", "Software App", "Browser & Software App"];

/* ─── Reusable form field helpers ─── */

function FormField({ label, required, error, children, span }) {
  return (
    <div className={`form-group${error ? " has-error" : ""}${span === 2 ? " span-2" : ""}`}>
      <label className="form-label">{label}{required && " *"}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

function FormInput({ id, value, onChange, placeholder, type = "text", list }) {
  return (
    <input
      id={id}
      className="form-input"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      list={list}
      autoComplete="off"
    />
  );
}

function FormSelect({ id, value, onChange, options }) {
  return (
    <select id={id} className="form-input form-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* ─── Main Modal ─── */
export default function ItemModal({ item, selectedCategory, onSave, onClose }) {
  const isEdit = !!item;

  const [form, setForm] = useState({
    name:          selectedCategory || DEVICE_TYPE_OPTIONS[0],
    category:      selectedCategory || DEVICE_TYPE_OPTIONS[0],
    campus:        "Main",
    officeType:    "Office | Support",
    department:    "",
    userType:      "Staff",
    yearPurchased: new Date().getFullYear().toString(),
    usage:         "Browser & Software App",
    processor:     "",
    ram:           "8GB",
    os:            "Windows 10 Pro",
    storage:       "256GB SSD",
    storageExtra:  "N/A",
    assetTag:      "",
    assignedUser:  "",
    status:        "Functional",
    remarks:       "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (item) {
      setForm({
        name:          item.name          || "",
        category:      item.category      || "",
        campus:        item.campus        || "Main",
        officeType:    item.officeType    || "Office | Support",
        department:    item.department    || "",
        userType:      item.userType      || "Staff",
        yearPurchased: item.yearPurchased || "",
        usage:         item.usage         || "Browser & Software App",
        processor:     item.processor     || "",
        ram:           item.ram           || "",
        os:            item.os            || "",
        storage:       item.storage       || "",
        storageExtra:  item.storageExtra  || "N/A",
        assetTag:      item.assetTag      || "",
        assignedUser:  item.assignedUser  || "",
        status:        item.status        || "Functional",
        remarks:       item.remarks       || "",
      });
    }
  }, [item]);

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value, ...(field === "name" ? { category: value } : {}) }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())      e.name      = "Device type is required";
    if (!form.processor.trim()) e.processor = "Processor is required";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    const cat = CATEGORIES.find((c) => c.name.toLowerCase() === form.name.toLowerCase());
    onSave({ ...form, categoryId: cat?.id, quantity: 1 });
  };

  const catColor = CATEGORIES.find((c) => c.name.toLowerCase() === form.name.toLowerCase())?.color || "#6366f1";
  const statusColor = { Functional: "#10b981", "For Upgrade": "#f59e0b", "For Replacement": "#ef4444", Defective: "#dc2626" };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="item-modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ borderTopColor: catColor }}>
          <div>
            <h2 className="modal-title">{isEdit ? "✏️ Edit Device" : "➕ Add New Device"}</h2>
            <p className="modal-subtitle">{isEdit ? `Editing: ${item.name}` : "Fill in the device details below"}</p>
          </div>
          <button className="modal-close" onClick={onClose} id="modal-close">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* ── Section: Device Info ── */}
          <div className="form-section-label">📦 Classification &amp; Location</div>
          <div className="form-grid">
            <FormField label="Hardware Category" required error={errors.category}>
              <FormSelect id="form-category" value={form.category} onChange={set("category")}
                options={CATEGORIES.map((c) => c.name)} />
            </FormField>

            <FormField label="Device Sub-Type" required error={errors.name}>
              <FormInput id="form-name" value={form.name} onChange={set("name")}
                placeholder="e.g. Desktop, Laptop, HDD…" list="dl-m-device-type" />
              <datalist id="dl-m-device-type">
                {DEVICE_TYPE_OPTIONS.map((o) => <option key={o} value={o} />)}
              </datalist>
            </FormField>


            <FormField label="Status">
              <FormSelect id="form-status" value={form.status} onChange={set("status")} options={STATUSES} />
            </FormField>

            <FormField label="Campus">
              <FormSelect id="form-campus" value={form.campus} onChange={set("campus")} options={CAMPUSES} />
            </FormField>

            <FormField label="Office Type">
              <FormSelect id="form-office-type" value={form.officeType} onChange={set("officeType")} options={OFFICE_TYPE_OPTIONS} />
            </FormField>

            <FormField label="Department" span={1}>
              <FormInput id="form-department" value={form.department} onChange={set("department")}
                placeholder="e.g. Accounting, Library…" list="dl-m-dept" />
              <datalist id="dl-m-dept">
                {DEPARTMENT_OPTIONS.map((o) => <option key={o} value={o} />)}
              </datalist>
            </FormField>

            <FormField label="User Type">
              <FormSelect id="form-user-type" value={form.userType} onChange={set("userType")} options={USER_TYPES} />
            </FormField>

            <FormField label="Assigned To" span={1}>
              <FormInput id="form-assigned-user" value={form.assignedUser} onChange={set("assignedUser")}
                placeholder="Full name of the assigned user…" />
            </FormField>

            <FormField label="Asset Tag">
              <FormInput id="form-asset-tag" value={form.assetTag} onChange={set("assetTag")}
                placeholder="e.g. 39250" />
            </FormField>
          </div>

          {/* ── Section: Hardware Specs ── */}
          <div className="form-section-label">⚙️ Hardware Specs</div>
          <div className="form-grid">
            <FormField label="Processor" required error={errors.processor} span={2}>
              <FormInput id="form-processor" value={form.processor} onChange={set("processor")}
                placeholder="e.g. Intel Core i5 - 12400" list="dl-m-processor" />
              <datalist id="dl-m-processor">
                {PROCESSOR_OPTIONS.map((o) => <option key={o} value={o} />)}
              </datalist>
            </FormField>

            <FormField label="RAM">
              <FormInput id="form-ram" value={form.ram} onChange={set("ram")}
                placeholder="e.g. 8GB" list="dl-m-ram" />
              <datalist id="dl-m-ram">
                {RAM_OPTIONS.map((o) => <option key={o} value={o} />)}
              </datalist>
            </FormField>

            <FormField label="Operating System">
              <FormInput id="form-os" value={form.os} onChange={set("os")}
                placeholder="e.g. Windows 10 Pro" list="dl-m-os" />
              <datalist id="dl-m-os">
                {OS_OPTIONS.map((o) => <option key={o} value={o} />)}
              </datalist>
            </FormField>

            <FormField label="Storage (Primary)">
              <FormInput id="form-storage" value={form.storage} onChange={set("storage")}
                placeholder="e.g. 256GB SSD" list="dl-m-storage" />
              <datalist id="dl-m-storage">
                {STORAGE_OPTIONS.map((o) => <option key={o} value={o} />)}
              </datalist>
            </FormField>

            <FormField label="Storage (Extra Disk)">
              <FormInput id="form-storage-extra" value={form.storageExtra} onChange={set("storageExtra")}
                placeholder="e.g. 1TB HDD or N/A" list="dl-m-storage-extra" />
              <datalist id="dl-m-storage-extra">
                {["N/A", ...STORAGE_OPTIONS].map((o) => <option key={o} value={o} />)}
              </datalist>
            </FormField>

            <FormField label="Usage">
              <FormSelect id="form-usage" value={form.usage} onChange={set("usage")} options={USAGES} />
            </FormField>

            <FormField label="Year Purchased">
              <FormInput id="form-year" value={form.yearPurchased} onChange={set("yearPurchased")}
                placeholder="e.g. 2020" list="dl-m-year" type="number" />
              <datalist id="dl-m-year">
                {YEAR_OPTIONS.map((o) => <option key={o} value={o} />)}
              </datalist>
            </FormField>
          </div>

          {/* ── Section: Remarks ── */}
          <div className="form-section-label">📝 Notes</div>
          <div className="form-grid">
            <FormField label="Remarks" span={2}>
              <textarea
                className="form-input form-textarea"
                id="form-remarks"
                value={form.remarks}
                onChange={(e) => set("remarks")(e.target.value)}
                placeholder="Additional notes, upgrade plans, issues…"
                rows={2}
              />
            </FormField>
          </div>

          {/* Status radio pills */}
          <div className="status-pills-row">
            {STATUSES.map((s) => (
              <label
                key={s}
                className={`status-pill-label ${form.status === s ? "selected" : ""}`}
                style={form.status === s ? { borderColor: statusColor[s], background: statusColor[s] + "18", color: statusColor[s] } : {}}
              >
                <input type="radio" name="status" value={s} checked={form.status === s} onChange={() => set("status")(s)} hidden />
                <span className="status-dot" style={{ background: statusColor[s] }} />
                {s}
              </label>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-modal-cancel" onClick={onClose} id="btn-modal-cancel">Cancel</button>
            <button type="submit" className="btn-modal-save" id="btn-modal-save" style={{ background: catColor }}>
              {isEdit ? "💾 Save Changes" : "➕ Add Device"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
