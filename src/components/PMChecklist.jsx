import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  getAllUsers, getAllDepartments,
  getDevicesForUser, getDevicesForDepartment,
  buildChecklistData, generateOverallRemarks,
  TEMPLATE_ROWS,
} from "../utils/pmChecklistData";
import { downloadPDF, PAPER_SIZES } from "../utils/pmChecklistPDF";
import { downloadWord } from "../utils/pmChecklistWord";
import logoImg from "../assets/logo.jpg";
import "./PMChecklist.css";

const PREVIEW_ID = "pm-checklist-preview";

// ── Checkbox helper ──────────────────────────────────────
function Checkbox({ checked, label }) {
  return (
    <span className="pm-checkbox-item">
      <span className={`pm-checkbox${checked ? " pm-checkbox--checked" : ""}`}>
        {checked ? "✓" : ""}
      </span>
      {label && <span className="pm-checkbox-label">{label}</span>}
    </span>
  );
}

// ── The actual A4 form preview ───────────────────────────
function ChecklistPreview({ data }) {
  const {
    department, campus, building, room, schedule,
    procedures, rows, connectivity, overallRemarks,
    userName, conductedBy, reportDate,
  } = data;

  return (
    <div id={PREVIEW_ID} className="pm-preview">
      {/* ── Header ── */}
      <div className="pm-header">
        <div className="pm-logo-block">
          <img src={logoImg} alt="LDCU Logo" className="pm-logo-img" />
        </div>
        <div className="pm-header-text">
          <div className="pm-uni-name">LICEO DE CAGAYAN UNIVERSITY</div>
          <div className="pm-uni-addr">Rodolfo N. Pelaez Boulevard, Kauswagan,</div>
          <div className="pm-uni-addr">9000 Cagayan de Oro City, Philippines</div>
        </div>
      </div>

      <div className="pm-divider pm-divider--thick" />

      <div className="pm-office-title">
        OFFICE OF THE VICE PRESIDENT FOR INFORMATION AND COMMUNICATION TECHNOLOGY
      </div>
      <div className="pm-office-title">ICT – INFRASTRUCTURE OPERATIONS UNIT</div>
      <div className="pm-form-title">SY 2025-2026 PREVENTIVE MAINTENANCE CHECKLIST</div>

      <div className="pm-divider" />

      {/* ── Form Fields ── */}
      <div className="pm-fields">
        <div className="pm-field-row">
          <div className="pm-field">
            <span className="pm-field-label">College/Department:</span>
            <span className="pm-field-value pm-underline">{department}</span>
          </div>
          <div className="pm-field">
            <span className="pm-field-label">Schedule:</span>
            <Checkbox checked={schedule === "Weekly"} label="Weekly" />
            <Checkbox checked={schedule === "Monthly"} label="Monthly" />
            <Checkbox checked={schedule === "Semi-Annually"} label="Semi-Annually" />
          </div>
        </div>
        <div className="pm-field-row">
          <div className="pm-field">
            <span className="pm-field-label">Building/Room/Office:</span>
            <span className="pm-field-value pm-underline">{[building, room].filter(Boolean).join(" / ") || " "}</span>
          </div>
          <div className="pm-field">
            <span className="pm-field-label">Campus:</span>
            <Checkbox checked={campus === "Main"} label="Main" />
            <Checkbox checked={campus === "RNP"} label="RNP" />
            <Checkbox checked={campus === "Paseo"} label="Paseo" />
          </div>
        </div>
      </div>

      <div className="pm-divider" />

      {/* ── Procedure ── */}
      <div className="pm-procedure">
        <div className="pm-procedure-row">
          <strong>Procedure:</strong>
          <Checkbox checked={procedures.inventoryManagement} label="Inventory Management" />
          <Checkbox checked={procedures.regularCleaning}     label="Regular Cleaning" />
          <Checkbox checked={procedures.hardwareInspections} label="Hardware Inspections" />
        </div>
        <div className="pm-procedure-row pm-procedure-row--indent">
          <Checkbox checked={procedures.dataBackup}      label="Data Back-up" />
          <Checkbox checked={procedures.softwareUpdates} label="Software Updates" />
          <Checkbox checked={procedures.virusMalware}    label="Virus Malware Protection" />
        </div>
      </div>

      <div className="pm-instruction">
        Tick the appropriate box with (✓) mark for the current status of the computer system.
      </div>

      {/* ── Main Table ── */}
      <table className="pm-table">
        <thead>
          <tr>
            <th className="pm-th pm-th--component" rowSpan={2}>Component of<br />Computer System</th>
            <th className="pm-th pm-th--status" colSpan={4}>Status</th>
            <th className="pm-th pm-th--tag" rowSpan={2}>Capital Asset<br />Inventory Tag</th>
            <th className="pm-th pm-th--remarks" rowSpan={2}>Remarks</th>
          </tr>
          <tr>
            <th className="pm-th pm-th--substatus">Functional</th>
            <th className="pm-th pm-th--substatus">For<br />Repair</th>
            <th className="pm-th pm-th--substatus">For<br />Upgrade</th>
            <th className="pm-th pm-th--substatus">For<br />Replace&shy;ment</th>
          </tr>
        </thead>
        <tbody>
          {TEMPLATE_ROWS.map((rowDef) => {
            if (rowDef.isConnectivity) {
              const isType = rowDef.key === "connectivityType";
              return (
                <tr key={rowDef.key} className="pm-tr">
                  <td className="pm-td pm-td--component">{rowDef.label}</td>
                  <td className="pm-td pm-td--status" />
                  <td className="pm-td pm-td--status" />
                  <td className="pm-td pm-td--status" />
                  <td className="pm-td pm-td--status" />
                  <td className="pm-td pm-td--tag pm-td--na">N/A</td>
                  <td className="pm-td pm-td--remarks">
                    {isType ? (
                      <>
                        <Checkbox checked={connectivity.hasWired}    label="Wired" />
                        <Checkbox checked={connectivity.hasWireless} label="Wireless" />
                      </>
                    ) : (
                      <span>{connectivity.speed || ""}</span>
                    )}
                  </td>
                </tr>
              );
            }

            const entry = rows[rowDef.key] || {};
            return (
              <tr key={rowDef.key} className="pm-tr">
                <td className="pm-td pm-td--component">{rowDef.label}</td>
                <td className="pm-td pm-td--status pm-td--center">
                  {entry.functional ? "✓" : ""}
                </td>
                <td className="pm-td pm-td--status pm-td--center">
                  {entry.forRepair ? "✓" : ""}
                </td>
                <td className="pm-td pm-td--status pm-td--center">
                  {entry.forUpgrade ? "✓" : ""}
                </td>
                <td className="pm-td pm-td--status pm-td--center">
                  {entry.forReplacement ? "✓" : ""}
                </td>
                <td className="pm-td pm-td--tag pm-td--center">
                  {entry.assetTags || ""}
                </td>
                <td className="pm-td pm-td--remarks">
                  {entry.remarks || ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Overall Remarks ── */}
      <div className="pm-overall-remarks">
        <div className="pm-remarks-label">Overall Remarks:</div>
        <div className="pm-remarks-text">{overallRemarks}</div>
      </div>

      {/* ── Signatures ── */}
      <div className="pm-signatures">
        <div className="pm-sig-row">
          <div className="pm-sig-field">
            <span className="pm-sig-label">User/In-charge:</span>
            <span className="pm-sig-value pm-underline">{userName}</span>
          </div>
          <div className="pm-sig-field pm-sig-field--date">
            <span className="pm-sig-label">Date:</span>
            <span className="pm-sig-value pm-underline">{reportDate}</span>
          </div>
          <div className="pm-sig-field">
            <span className="pm-sig-label">Signature:</span>
            <span className="pm-sig-value pm-underline pm-underline--long" />
          </div>
        </div>
        <div className="pm-sig-row">
          <div className="pm-sig-field">
            <span className="pm-sig-label">Conducted By:</span>
            <span className="pm-sig-value pm-underline">{conductedBy}</span>
          </div>
          <div className="pm-sig-field pm-sig-field--date">
            <span className="pm-sig-label">Date:</span>
            <span className="pm-sig-value pm-underline">{reportDate}</span>
          </div>
          <div className="pm-sig-field">
            <span className="pm-sig-label">Signature:</span>
            <span className="pm-sig-value pm-underline pm-underline--long" />
          </div>
        </div>
        <div className="pm-recommended">
          <div>Recommended by:</div>
          <div className="pm-recommended-name">Mr. Roy Emeterio L. Pabilona</div>
          <div className="pm-recommended-title">Head, ICT Infrastructure Operations</div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="pm-footer">
        <table className="pm-footer-table">
          <thead>
            <tr>
              <th>Document Number</th>
              <th>Effectivity Date</th>
              <th>Revision Number</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>LDCU-FORMS-VPICT-005</td>
              <td>August 1, 2025</td>
              <td>001</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────
export default function PMChecklist({ inventory, onClose }) {
  // Search / filter state
  const [searchMode, setSearchMode]       = useState("person"); // "person" | "department"
  const [searchQuery, setSearchQuery]     = useState("");
  const [selectedTarget, setSelectedTarget] = useState(null);   // chosen user or dept string

  // Form meta
  const [schedule, setSchedule]       = useState("Monthly");
  const [campus, setCampus]           = useState("Main");
  const [building, setBuilding]       = useState("");
  const [room, setRoom]               = useState("");
  const [conductedBy, setConductedBy] = useState("");

  // Editable overall remarks
  const [overallRemarks, setOverallRemarks] = useState("");
  const [remarksLocked, setRemarksLocked]   = useState(false);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState("");
  const [paperSize, setPaperSize]   = useState("letter"); // "letter" | "a4"

  // ── Autocomplete suggestions ──────────────────────────
  const allUsers = useMemo(() => getAllUsers(inventory), [inventory]);
  const allDepts = useMemo(() => getAllDepartments(inventory), [inventory]);

  const suggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    const list = searchMode === "person" ? allUsers : allDepts;
    return list.filter((s) => s.toLowerCase().includes(q)).slice(0, 12);
  }, [searchQuery, searchMode, allUsers, allDepts]);

  // ── Filtered devices ──────────────────────────────────
  const devices = useMemo(() => {
    if (!selectedTarget) return [];
    return searchMode === "person"
      ? getDevicesForUser(inventory, selectedTarget)
      : getDevicesForDepartment(inventory, selectedTarget);
  }, [selectedTarget, searchMode, inventory]);

  // ── Checklist data ────────────────────────────────────
  const checklistData = useMemo(() => {
    if (!selectedTarget || devices.length === 0) return null;
    const userName   = searchMode === "person" ? selectedTarget : "";
    const department = searchMode === "department" ? selectedTarget
      : (devices[0]?.department || "");

    const autoRemarks = generateOverallRemarks(devices, userName, department);
    const remarks = remarksLocked ? overallRemarks : autoRemarks;

    return buildChecklistData({
      devices,
      userName,
      department,
      campus,
      building,
      room,
      schedule,
      conductedBy,
      overallRemarks: remarks,
      reportDate: new Date().toLocaleDateString("en-PH", {
        year: "numeric", month: "long", day: "numeric",
      }),
    });
  }, [selectedTarget, searchMode, devices, campus, building, room, schedule, conductedBy, overallRemarks, remarksLocked]);

  // Sync auto-remarks when selection changes
  useMemo(() => {
    if (!remarksLocked && checklistData) {
      setOverallRemarks(checklistData.overallRemarks);
    }
  }, [checklistData, remarksLocked]);

  // ── Handlers ──────────────────────────────────────────
  const handleSelect = useCallback((target) => {
    setSelectedTarget(target);
    setSearchQuery(target);
    setRemarksLocked(false);
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    setGenerating(true);
    setGenError("");
    try {
      const name = selectedTarget ? selectedTarget.replace(/[^a-z0-9]/gi, "_") : "PM_Checklist";
      await downloadPDF(PREVIEW_ID, `PM_Checklist_${name}`, paperSize);
    } catch (e) {
      setGenError("PDF generation failed: " + e.message);
    } finally {
      setGenerating(false);
    }
  }, [selectedTarget, paperSize]);

  const handleDownloadWord = useCallback(async () => {
    if (!checklistData) return;
    setGenerating(true);
    setGenError("");
    try {
      const name = selectedTarget ? selectedTarget.replace(/[^a-z0-9]/gi, "_") : "PM_Checklist";
      await downloadWord(checklistData, `PM_Checklist_${name}`);
    } catch (e) {
      setGenError("Word generation failed: " + e.message);
    } finally {
      setGenerating(false);
    }
  }, [checklistData, selectedTarget]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="pm-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal">

        {/* ── Modal Header ── */}
        <div className="pm-modal-header">
          <div className="pm-modal-title">
            <span className="pm-modal-icon">📋</span>
            <div>
              <div className="pm-modal-heading">Preventive Maintenance Checklist</div>
              <div className="pm-modal-sub">LDCU-FORMS-VPICT-005 · SY 2025-2026</div>
            </div>
          </div>
          <button className="pm-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="pm-modal-body">
          {/* ── Left Panel: Controls ── */}
          <div className="pm-controls">

            {/* Search mode tabs */}
            <div className="pm-mode-tabs">
              <button
                className={`pm-mode-tab${searchMode === "person" ? " pm-mode-tab--active" : ""}`}
                onClick={() => { setSearchMode("person"); setSelectedTarget(null); setSearchQuery(""); }}
              >
                👤 By Person
              </button>
              <button
                className={`pm-mode-tab${searchMode === "department" ? " pm-mode-tab--active" : ""}`}
                onClick={() => { setSearchMode("department"); setSelectedTarget(null); setSearchQuery(""); }}
              >
                🏢 By Department
              </button>
            </div>

            {/* Paper size */}
            <div className="pm-form-section">
              <div className="pm-form-label">Paper Size</div>
              <div className="pm-radio-group">
                {Object.entries(PAPER_SIZES).map(([key, val]) => (
                  <label key={key} className="pm-radio-label">
                    <input type="radio" name="paperSize" value={key}
                      checked={paperSize === key}
                      onChange={() => setPaperSize(key)} />
                    {val.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Search box */}
            <div className="pm-search-wrap">
              <input
                className="pm-search-input"
                placeholder={searchMode === "person" ? "Search by person name…" : "Search by department…"}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSelectedTarget(null); }}
                autoComplete="off"
              />
              {suggestions.length > 0 && !selectedTarget && (
                <div className="pm-suggestions">
                  {suggestions.map((s) => (
                    <div key={s} className="pm-suggestion-item" onClick={() => handleSelect(s)}>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Device count badge */}
            {selectedTarget && (
              <div className="pm-device-count">
                <span className="pm-device-count-num">{devices.length}</span>
                {" "}device{devices.length !== 1 ? "s" : ""} found for{" "}
                <strong>{selectedTarget}</strong>
              </div>
            )}

            {/* Form meta */}
            <div className="pm-form-section">
              <div className="pm-form-label">Schedule</div>
              <div className="pm-radio-group">
                {["Weekly", "Monthly", "Semi-Annually"].map((s) => (
                  <label key={s} className="pm-radio-label">
                    <input type="radio" name="schedule" value={s} checked={schedule === s}
                      onChange={() => setSchedule(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="pm-form-section">
              <div className="pm-form-label">Campus</div>
              <div className="pm-radio-group">
                {["Main", "RNP", "Paseo"].map((c) => (
                  <label key={c} className="pm-radio-label">
                    <input type="radio" name="campus" value={c} checked={campus === c}
                      onChange={() => setCampus(c)} />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div className="pm-form-section">
              <div className="pm-form-label">Building / Room</div>
              <input className="pm-text-input" placeholder="Building name" value={building}
                onChange={(e) => setBuilding(e.target.value)} />
              <input className="pm-text-input" placeholder="Room / Office" value={room}
                onChange={(e) => setRoom(e.target.value)} style={{ marginTop: 4 }} />
            </div>

            <div className="pm-form-section">
              <div className="pm-form-label">Conducted By</div>
              <input className="pm-text-input" placeholder="ICT Staff name" value={conductedBy}
                onChange={(e) => setConductedBy(e.target.value)} />
            </div>

            {/* Overall Remarks (editable) */}
            {checklistData && (
              <div className="pm-form-section">
                <div className="pm-form-label pm-form-label--flex">
                  Overall Remarks
                  <button className="pm-remarks-lock" onClick={() => setRemarksLocked(!remarksLocked)}
                    title={remarksLocked ? "Click to re-generate" : "Auto-generated — click to lock"}>
                    {remarksLocked ? "🔒 Locked" : "✏️ Editing"}
                  </button>
                </div>
                <textarea
                  className="pm-remarks-input"
                  rows={4}
                  value={overallRemarks}
                  onChange={(e) => { setOverallRemarks(e.target.value); setRemarksLocked(true); }}
                  placeholder="Overall remarks about device status and recommendations…"
                />
              </div>
            )}

            {/* Error */}
            {genError && <div className="pm-gen-error">{genError}</div>}

            {/* Download & Print Buttons */}
            <div className="pm-download-buttons">
              <button
                className="pm-btn pm-btn--print"
                onClick={handlePrint}
                disabled={!checklistData}
              >
                🖨️ Print Report
              </button>
              <button
                className="pm-btn pm-btn--pdf"
                onClick={handleDownloadPDF}
                disabled={!checklistData || generating}
              >
                {generating ? "⏳ Generating…" : "⬇️ Download PDF"}
              </button>
              <button
                className="pm-btn pm-btn--word"
                onClick={handleDownloadWord}
                disabled={!checklistData || generating}
              >
                {generating ? "⏳ Generating…" : "📄 Download Word"}
              </button>
            </div>
          </div>

          {/* ── Right Panel: Preview ── */}
          <div className="pm-preview-pane">
            {!selectedTarget ? (
              <div className="pm-preview-empty">
                <div className="pm-preview-empty-icon">📋</div>
                <div className="pm-preview-empty-text">
                  Search for a person or department<br />to generate a checklist
                </div>
              </div>
            ) : devices.length === 0 ? (
              <div className="pm-preview-empty">
                <div className="pm-preview-empty-icon">🔍</div>
                <div className="pm-preview-empty-text">
                  No devices found for <strong>{selectedTarget}</strong>
                </div>
              </div>
            ) : checklistData ? (
              <ChecklistPreview data={checklistData} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
