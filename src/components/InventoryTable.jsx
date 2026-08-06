import React, { useState } from "react";
import { STATUS_COLORS, getCategoryMeta } from "../data/inventoryData";
import { getColumnsForCategory, DEFAULT_COLUMNS } from "../hooks/useSheetInventory";
import ItemModal from "./ItemModal";
import ItemDetailDrawer from "./ItemDetailDrawer";
import QRModal from "./QRModal";
import "./InventoryTable.css";

const STATUSES = ["Functional", "For Upgrade", "For Replacement", "Defective"];

/* ─── Mobile Card ─── */
function ItemCard({ item, onView, onEdit, onDelete }) {
  const meta = getCategoryMeta(item.category);
  return (
    <div
      className="item-card"
      style={{ "--cat-color": meta.color, cursor: "pointer" }}
      onClick={() => onView(item)}
    >
      <div className="item-card-top">
        <div className="item-card-title">
          <span className="item-card-icon">{meta.icon}</span>
          <span className="item-card-name">{item.name}</span>
        </div>
        <span
          className="status-badge"
          style={{
            background: (STATUS_COLORS[item.status] || "#64748b") + "20",
            color: STATUS_COLORS[item.status] || "#64748b",
            borderColor: (STATUS_COLORS[item.status] || "#64748b") + "44"
          }}
        >
          <span className="status-dot" style={{ background: STATUS_COLORS[item.status] || "#64748b" }} />
          {item.status}
        </span>
      </div>

      <div className="item-card-meta">
        <div className="item-card-row">
          <span className="meta-label">Campus</span>
          <span className="meta-value">{item.campus}</span>
        </div>
        <div className="item-card-row">
          <span className="meta-label">Department</span>
          <span className="meta-value">{item.department}</span>
        </div>
        <div className="item-card-row">
          <span className="meta-label">User</span>
          <span className="meta-value">{item.assignedUser || "—"}</span>
        </div>
        <div className="item-card-row">
          <span className="meta-label">Processor</span>
          <span className="meta-value">{item.processor}</span>
        </div>
        <div className="item-card-row">
          <span className="meta-label">RAM / Storage</span>
          <span className="meta-value">{item.ram} · {item.storage}</span>
        </div>
        {item.assetTag && (
          <div className="item-card-row">
            <span className="meta-label">Asset Tag</span>
            <span className="meta-value serial">{item.assetTag}</span>
          </div>
        )}
      </div>

      <div className="item-card-actions">
        <button className="card-btn-view" onClick={(e) => { e.stopPropagation(); onView(item); }} id={`card-view-${item.id}`}>
          👁️ Details
        </button>
        <button className="card-btn-edit" onClick={(e) => { e.stopPropagation(); onEdit(item); }} id={`card-edit-${item.id}`}>
          ✏️ Edit
        </button>
        <button className="card-btn-delete" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} id={`card-delete-${item.id}`}>
          🗑️
        </button>
      </div>
    </div>
  );
}

export default function InventoryTable({ inventory, selectedCategory, onUpdate, onDelete, onAdd, onAddToast }) {
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [campusFilter, setCampusFilter] = useState("All");
  const [sortConfig, setSortConfig]     = useState({ key: "name", dir: "asc" });
  const [modalOpen, setModalOpen]       = useState(false);
  const [editItem, setEditItem]         = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [drawerItem, setDrawerItem]     = useState(null);
  const [qrItem, setQrItem]             = useState(null);
  const [currentPage, setCurrentPage]  = useState(1);
  const [filtersOpen, setFiltersOpen]  = useState(false);
  const PAGE_SIZE = 15;

  const meta = selectedCategory ? getCategoryMeta(selectedCategory) : { color: "#800020", icon: "📦" };
  const catColor = meta.color;

  // Dynamic columns per-category — the core of this fix
  const columns = selectedCategory
    ? getColumnsForCategory(selectedCategory)
    : DEFAULT_COLUMNS;

  // Campuses present in current category
  const availableCampuses = [...new Set(
    inventory
      .filter((i) => !selectedCategory || i.category === selectedCategory || i.tabCategory === selectedCategory)
      .map((i) => i.campus)
      .filter(Boolean)
  )].sort();

  const filtered = inventory
    .filter((item) => {
      const matchCat    = !selectedCategory || item.category === selectedCategory || item.tabCategory === selectedCategory;

      const matchCampus = campusFilter === "All" || item.campus === campusFilter;
      const matchSearch =
        !search ||
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.department?.toLowerCase().includes(search.toLowerCase()) ||
        item.assignedUser?.toLowerCase().includes(search.toLowerCase()) ||
        item.processor?.toLowerCase().includes(search.toLowerCase()) ||
        item.assetTag?.toLowerCase().includes(search.toLowerCase()) ||
        item.campus?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      return matchCat && matchCampus && matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const { key, dir } = sortConfig;
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSort   = (key) => {
    setSortConfig((prev) => prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
    setCurrentPage(1);
  };
  const handleSearch = (e) => { setSearch(e.target.value); setCurrentPage(1); };
  const handleStatusFilter = (s) => { setStatusFilter(s); setCurrentPage(1); };
  const handleCampusFilter = (c) => { setCampusFilter(c); setCurrentPage(1); };

  const openAdd  = () => { setEditItem(null); setModalOpen(true); };
  const openEdit = (item) => { setEditItem(item); setModalOpen(true); };

  const handleSave = (data) => {
    if (editItem) onUpdate(editItem.id, data); else onAdd(data);
    setModalOpen(false);
  };

  const handleDelete = (id) => { onDelete(id); setDeleteConfirm(null); };

  const exportCSV = () => {
    const headers = ["Category", "Device Type", ...columns.map((c) => c.label)];
    const rows = filtered.map((item) => [
      item.category, item.deviceType || item.name,
      ...columns.map((c) => item[c.key] || "")
    ]);
    const csv  = [headers, ...rows].map((r) => r.map((c) => `"${c || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = `ict-inventory-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <span className="sort-icon inactive">↕</span>;
    return <span className="sort-icon active">{sortConfig.dir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="inv-container">
      {/* Header */}
      <div className="inv-header">
        <div>
          <h2 className="inv-title" style={{ borderLeftColor: catColor }}>
            {selectedCategory ? <>{meta.icon} {selectedCategory}</> : "All Devices"}
          </h2>
          <p className="inv-subtitle">{filtered.length.toLocaleString()} records · Google Sheets live data</p>
        </div>
        <div className="inv-header-actions">
          <button className="btn-export" onClick={exportCSV} id="btn-export">
            <span>📤</span><span className="btn-label">Export CSV</span>
          </button>
          <button className="btn-add" onClick={openAdd} id="btn-add-item" style={{ background: catColor }}>
            <span className="btn-plus">+</span><span className="btn-label">Add Item</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="inv-filters">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search device, user, department, asset tag…"
            value={search}
            onChange={handleSearch}
            id="search-input"
          />
          {search && <button className="search-clear" onClick={() => { setSearch(""); setCurrentPage(1); }}>✕</button>}
        </div>

        {/* Campus filter pills */}
        {availableCampuses.length > 1 && (
          <div className="campus-filter-row">
            {["All", ...availableCampuses].map((c) => (
              <button
                key={c}
                className={`campus-pill ${campusFilter === c ? "active" : ""}`}
                onClick={() => handleCampusFilter(c)}
                id={`campus-filter-${c.toLowerCase()}`}
                style={campusFilter === c && c !== "All" ? { background: "#06b6d420", borderColor: "#06b6d4", color: "#06b6d4" } : {}}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <button
          className="filter-toggle-btn"
          onClick={() => setFiltersOpen((o) => !o)}
          id="filter-toggle"
          style={statusFilter !== "All" ? { borderColor: catColor, color: catColor } : {}}
        >
          🎛️ {statusFilter !== "All" ? statusFilter : "Status"}
          {statusFilter !== "All" && <span className="filter-active-dot" style={{ background: catColor }} />}
        </button>

        <div className={`status-filters ${filtersOpen ? "filters-open" : ""}`}>
          {["All", ...STATUSES].map((s) => (
            <button
              key={s}
              className={`status-filter-btn ${statusFilter === s ? "active" : ""}`}
              onClick={() => { handleStatusFilter(s); setFiltersOpen(false); }}
              id={`filter-${s.replace(/\s/g, "-").toLowerCase()}`}
              style={statusFilter === s && s !== "All"
                ? { background: (STATUS_COLORS[s] || "#64748b") + "22", borderColor: STATUS_COLORS[s] || "#64748b", color: STATUS_COLORS[s] || "#64748b" }
                : {}}
            >
              {s !== "All" && <span className="status-dot" style={{ background: STATUS_COLORS[s] || "#64748b" }} />}
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <p>No devices found</p>
          <span>Try adjusting your search or filters</span>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="cards-grid">
            {paginated.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onView={(it) => setDrawerItem(it)}
                onEdit={openEdit}
                onDelete={(id) => setDeleteConfirm(id)}
              />
            ))}
          </div>

          {/* Desktop table — dynamic headers per category */}
          <div className="table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  {/* Fixed: Category + Device Type columns */}
                  <th onClick={() => handleSort("category")} className="sortable-th">
                    Category <SortIcon col="category" />
                  </th>
                  <th onClick={() => handleSort("deviceType")} className="sortable-th">
                    Device Type <SortIcon col="deviceType" />
                  </th>
                  {/* Dynamic columns based on selected category */}
                  {columns
                    .filter((c) => c.key !== "status") // status rendered last always
                    .map(({ key, label }) => (
                      <th key={key} onClick={() => handleSort(key)} className="sortable-th">
                        {label} <SortIcon col={key} />
                      </th>
                    ))}
                  <th onClick={() => handleSort("status")} className="sortable-th">
                    Status <SortIcon col="status" />
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item, idx) => {
                  const m = getCategoryMeta(item.category);
                  const statusColor = STATUS_COLORS[item.status] || "#64748b";
                  return (
                    <tr
                      key={item.id}
                      className="table-row table-row-clickable"
                      style={{ animationDelay: `${idx * 20}ms` }}
                      onClick={() => setDrawerItem(item)}
                    >
                      {/* Category */}
                      <td>
                        <div className="item-name-cell">
                          <span className="item-cat-icon">{m.icon}</span>
                          <span className="item-name" style={{ color: "#800020", fontWeight: 700 }}>{item.category}</span>
                        </div>
                      </td>
                      {/* Device Type */}
                      <td>
                        <span style={{ fontWeight: 600, color: "#2b0f19" }}>{item.deviceType || item.name}</span>
                      </td>
                      {/* Dynamic data cells */}
                      {columns
                        .filter((c) => c.key !== "status")
                        .map(({ key, label }) => {
                          const val = item[key];
                          if (key === "campus") {
                            return <td key={key}><span className="campus-tag">{val}</span></td>;
                          }
                          if (key === "ram") {
                            return <td key={key}><span className="qty-badge">{val || "—"}</span></td>;
                          }
                          if (!val) {
                            return <td key={key}><span className="na-text">—</span></td>;
                          }
                          return <td key={key} className={`${key}-cell`}>{val}</td>;
                        })}
                      {/* Status — always last */}
                      <td>
                        <span
                          className="status-badge"
                          style={{ background: statusColor + "20", color: statusColor, borderColor: statusColor + "44" }}
                        >
                          <span className="status-dot" style={{ background: statusColor }} />
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns" onClick={(e) => e.stopPropagation()}>
                          <button className="btn-view"   onClick={() => setDrawerItem(item)} title="Details"  id={`btn-view-${item.id}`}>👁️</button>
                          <button className="btn-edit"   onClick={() => openEdit(item)}       title="Edit"     id={`btn-edit-${item.id}`}>✏️</button>
                          <button className="btn-qr"     onClick={() => setQrItem(item)}      title="QR Code" id={`btn-qr-${item.id}`}>📱</button>
                          <button className="btn-delete" onClick={() => setDeleteConfirm(item.id)} title="Delete" id={`btn-delete-${item.id}`}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>←</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push("..."); acc.push(p); return acc; }, [])
            .map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="page-ellipsis">…</span>
              ) : (
                <button key={p} className={`page-btn ${currentPage === p ? "active" : ""}`} onClick={() => setCurrentPage(p)} style={currentPage === p ? { background: catColor } : {}}>
                  {p}
                </button>
              )
            )}
          <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>→</button>
          <span className="page-info">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
        </div>
      )}

      {/* QR Modal */}
      {qrItem && (
        <QRModal item={qrItem} onClose={() => setQrItem(null)} />
      )}

      {/* Drawer */}
      {drawerItem && (
        <ItemDetailDrawer
          item={drawerItem}
          onClose={() => setDrawerItem(null)}
          onLocalUpdate={onUpdate}
          onEdit={(item) => { setDrawerItem(null); openEdit(item); }}
          onDelete={(id) => { setDrawerItem(null); setDeleteConfirm(id); }}
          onAddToast={onAddToast || (() => {})}
        />
      )}

      {/* Edit / Add Modal */}
      {modalOpen && (
        <ItemModal
          item={editItem}
          selectedCategory={selectedCategory}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm !== null && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon">🗑️</div>
            <h3>Delete Item?</h3>
            <p>This action cannot be undone.</p>
            <div className="delete-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-confirm-delete" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
