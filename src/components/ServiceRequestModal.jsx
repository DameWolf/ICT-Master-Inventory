import React, { useEffect, useMemo, useState } from "react";
import "./ServiceRequestModal.css";

const REQUEST_TYPES = [
  "Hardware Fault",
  "Maintenance / Preventive",
  "Replacement",
  "Installation",
  "Upgrade",
  "Accessory / Peripheral",
  "Software / Configuration",
  "Other",
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const STATUSES = ["Open", "In Progress", "Waiting for Parts", "Resolved", "Closed"];

const defaultForm = {
  itemId: "",
  assetName: "",
  requestType: "Hardware Fault",
  priority: "Medium",
  requester: "",
  department: "",
  campus: "Main",
  contact: "",
  room: "",
  issueSummary: "",
  preferredDate: "",
  notes: "",
};

export default function ServiceRequestModal({ item, inventory = [], requests = [], onClose, onSubmit, onStatusChange }) {
  const [mode, setMode] = useState(item ? "new" : "list");
  const [form, setForm] = useState(() => ({
    ...defaultForm,
    itemId: item?.id || "",
    assetName: item?.name || "",
    campus: item?.campus || "Main",
    department: item?.department || "",
  }));

  const handleStatusSelect = (requestId, nextStatus) => {
    if (onStatusChange) {
      onStatusChange(requestId, nextStatus);
    }
  };

  useEffect(() => {
    if (item) {
      setMode("new");
      setForm((prev) => ({
        ...prev,
        itemId: item.id,
        assetName: item.name,
        campus: item.campus || prev.campus || "Main",
        department: item.department || prev.department || "",
      }));
    }
  }, [item]);

  const selectedAsset = useMemo(() => {
    if (!form.itemId) return null;
    return inventory.find((inv) => String(inv.id) === String(form.itemId)) || null;
  }, [form.itemId, inventory]);

  const openRequestCount = requests.filter((req) => ["Open", "In Progress", "Waiting for Parts"].includes(req.status)).length;

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemSelect = (value) => {
    const selected = inventory.find((inv) => String(inv.id) === String(value));
    setForm((prev) => ({
      ...prev,
      itemId: selected ? String(selected.id) : "",
      assetName: selected ? selected.name : "",
      campus: selected?.campus || prev.campus,
      department: selected?.department || prev.department,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedRequester = form.requester.trim();
    const trimmedIssue = form.issueSummary.trim();

    if (!trimmedRequester || !trimmedIssue) {
      return;
    }

    const payload = {
      id: `SR-${Date.now()}`,
      itemId: form.itemId || "",
      assetName: form.assetName || selectedAsset?.name || "Unassigned asset",
      requestType: form.requestType,
      priority: form.priority,
      requester: trimmedRequester,
      department: form.department || selectedAsset?.department || "",
      campus: form.campus || selectedAsset?.campus || "Main",
      contact: form.contact.trim(),
      room: form.room.trim(),
      issueSummary: trimmedIssue,
      preferredDate: form.preferredDate,
      notes: form.notes.trim(),
      status: "Open",
      createdAt: new Date().toISOString(),
    };

    onSubmit(payload);
    setMode("list");
    setForm({
      ...defaultForm,
      itemId: item?.id || "",
      assetName: item?.name || "",
      campus: item?.campus || "Main",
      department: item?.department || "",
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="service-request-modal" onClick={(e) => e.stopPropagation()}>
        <div className="service-request-header">
          <div>
            <p className="service-request-kicker">Service Operations</p>
            <h3 className="service-request-title">Service Request Center</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="service-request-toolbar">
          <button
            className={`service-request-tab ${mode === "list" ? "active" : ""}`}
            onClick={() => setMode("list")}
          >
            Requests ({requests.length})
          </button>
          <button
            className={`service-request-tab ${mode === "new" ? "active" : ""}`}
            onClick={() => setMode("new")}
          >
            New Request
          </button>
        </div>

        {mode === "list" ? (
          <div className="service-request-body">
            <div className="service-summary-row">
              <div className="service-summary-card">
                <span className="service-summary-label">Open</span>
                <strong>{openRequestCount}</strong>
              </div>
              <div className="service-summary-card">
                <span className="service-summary-label">Resolved</span>
                <strong>{requests.filter((req) => req.status === "Resolved").length}</strong>
              </div>
            </div>

            <div className="service-request-table-wrap">
              {requests.length === 0 ? (
                <div className="empty-service-state">No service requests yet.</div>
              ) : (
                <table className="service-request-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Asset</th>
                      <th>Priority</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.slice(0, 8).map((request) => (
                      <tr key={request.id}>
                        <td>{request.id}</td>
                        <td>{request.assetName}</td>
                        <td>
                          <span className={`priority-badge priority-${(request.priority || "Medium").toLowerCase()}`}>
                            {request.priority || "Medium"}
                          </span>
                        </td>
                        <td>
                          <select
                            className="service-status-select"
                            value={request.status || "Open"}
                            onChange={(e) => handleStatusSelect(request.id, e.target.value)}
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          <form className="service-request-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group span-2">
                <label className="form-label">Related asset</label>
                <select
                  className="form-input"
                  value={form.itemId}
                  onChange={(e) => handleItemSelect(e.target.value)}
                >
                  <option value="">Select asset from inventory (optional)</option>
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.name} · {inv.campus}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Request type</label>
                <select
                  className="form-input"
                  value={form.requestType}
                  onChange={(e) => updateForm("requestType", e.target.value)}
                >
                  {REQUEST_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-input"
                  value={form.priority}
                  onChange={(e) => updateForm("priority", e.target.value)}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Requestor</label>
                <input
                  className="form-input"
                  value={form.requester}
                  onChange={(e) => updateForm("requester", e.target.value)}
                  placeholder="Name or team"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  className="form-input"
                  value={form.department}
                  onChange={(e) => updateForm("department", e.target.value)}
                  placeholder="Department / section"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Campus</label>
                <select
                  className="form-input"
                  value={form.campus}
                  onChange={(e) => updateForm("campus", e.target.value)}
                >
                  <option value="Main">Main</option>
                  <option value="RNP">RNP</option>
                  <option value="Paseo">Paseo</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Contact</label>
                <input
                  className="form-input"
                  value={form.contact}
                  onChange={(e) => updateForm("contact", e.target.value)}
                  placeholder="Phone / email"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Room / location</label>
                <input
                  className="form-input"
                  value={form.room}
                  onChange={(e) => updateForm("room", e.target.value)}
                  placeholder="e.g. IT Office 2B"
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Issue summary</label>
                <textarea
                  className="form-input form-textarea"
                  value={form.issueSummary}
                  onChange={(e) => updateForm("issueSummary", e.target.value)}
                  placeholder="Describe the issue, symptoms, and impact..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.preferredDate}
                  onChange={(e) => updateForm("preferredDate", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Asset label</label>
                <input
                  className="form-input"
                  value={form.assetName}
                  onChange={(e) => updateForm("assetName", e.target.value)}
                  placeholder="Asset / device name"
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Notes / additional details</label>
                <textarea
                  className="form-input form-textarea"
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Any relevant information for repair or support..."
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-modal-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-modal-save">Submit Request</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
