import React, { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { CATEGORIES, CAMPUSES } from "../data/inventoryData";
import logoImg from "../assets/logo.jpg";
import "./Dashboard.css";

/* ─── Colour palette ─── */
const CAT_COLORS = CATEGORIES.map((c) => c.color);
const STATUS_PIE_COLORS = {
  Functional: "#22c55e",
  "For Upgrade": "#f59e0b",
  "For Replacement": "#f97316",
  Defective: "#ef4444",
};

/* ─── Custom Tooltip ─── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <p className="ct-label">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="ct-value" style={{ color: p.color || p.fill }}>
          <span className="ct-name">{p.name}:</span> {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ icon, value, label, color, pct }) {
  return (
    <div className="kpi-card" style={{ "--kc": color }}>
      <div className="kpi-icon-wrap"><span className="kpi-icon">{icon}</span></div>
      <div className="kpi-info">
        <span className="kpi-value" style={{ color }}>{value?.toLocaleString()}</span>
        <span className="kpi-label">{label}</span>
      </div>
      {pct !== undefined && (
        <div className="kpi-bar-track">
          <div className="kpi-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
      <div className="kpi-glow" style={{ background: color }} />
    </div>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ title, subtitle }) {
  return (
    <div className="chart-section-header">
      <h3 className="section-title">{title}</h3>
      {subtitle && <span className="section-sub">{subtitle}</span>}
    </div>
  );
}

export default function Dashboard({ inventory, onSelectCategory, onViewAll, darkMode }) {
  const [filters, setFilters] = useState({
    query: "",
    campus: "all",
    department: "all",
    officeType: "all",
    userType: "all",
    status: "all",
    category: "all",
    deviceType: "all",
    assignedUser: "all",
    detailKey: "all",
    detailValue: "all",
  });
  const total = inventory.length;

  const statusSummary = useMemo(() => {
    const summary = { Functional: 0, "For Upgrade": 0, "For Replacement": 0, Defective: 0 };
    inventory.forEach((i) => {
      if (summary[i.status] !== undefined) summary[i.status] += 1;
    });
    return summary;
  }, [inventory]);

  const functional = statusSummary.Functional;
  const forReplacement = statusSummary["For Replacement"];
  const forUpgrade = statusSummary["For Upgrade"];
  const defective = statusSummary.Defective;

  const textColor = darkMode ? "#ffffff" : "#2b0f19";
  const mutedColor = darkMode ? "rgba(255,255,255,0.7)" : "#7a5866";
  const gridColor = darkMode ? "rgba(255,255,255,0.12)" : "#f0e8e0";

  const statusData = useMemo(() => [
    { name: "Functional", value: functional, color: STATUS_PIE_COLORS.Functional },
    { name: "For Upgrade", value: forUpgrade, color: STATUS_PIE_COLORS["For Upgrade"] },
    { name: "For Replacement", value: forReplacement, color: STATUS_PIE_COLORS["For Replacement"] },
    { name: "Defective", value: defective, color: STATUS_PIE_COLORS.Defective },
  ].filter((d) => d.value > 0), [functional, forUpgrade, forReplacement, defective]);

  const catData = useMemo(() =>
    CATEGORIES.map((cat) => ({
      name: cat.name.replace(" Devices", "").replace(" Equipment", "").replace(" Systems", ""),
      full: cat.name,
      count: inventory.filter((i) => i.category === cat.name || i.tabCategory === cat.name).length,
      color: cat.color,
    })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count),
  [inventory]);

  const campusData = useMemo(() =>
    CAMPUSES.map((campus) => ({
      name: campus,
      count: inventory.filter((i) => i.campus === campus).length,
      functional: inventory.filter((i) => i.campus === campus && i.status === "Functional").length,
      defective: inventory.filter((i) => i.campus === campus && i.status === "Defective").length,
    })).filter((c) => c.count > 0),
  [inventory]);

  const yearData = useMemo(() => {
    const counts = {};
    inventory.forEach((i) => {
      const y = parseInt(i.yearPurchased, 10);
      if (y >= 2000 && y <= 2030) counts[y] = (counts[y] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a - b)
      .map(([year, count]) => ({ year, count }));
  }, [inventory]);

  const radarData = useMemo(() => {
    const topCats = catData.slice(0, 6);
    return topCats.map((cat) => {
      const items = inventory.filter((i) => i.category === cat.full || i.tabCategory === cat.full);
      return {
        category: cat.name,
        Functional: items.filter((i) => i.status === "Functional").length,
        "For Upgrade": items.filter((i) => i.status === "For Upgrade").length,
        "For Replacement": items.filter((i) => i.status === "For Replacement").length,
        Defective: items.filter((i) => i.status === "Defective").length,
      };
    });
  }, [inventory, catData]);

  const topTypeData = useMemo(() => {
    const topCat = catData[0];
    if (!topCat) return [];
    const items = inventory.filter((i) => i.category === topCat.full || i.tabCategory === topCat.full);
    const typeCounts = {};
    items.forEach((i) => {
      typeCounts[i.deviceType] = (typeCounts[i.deviceType] || 0) + 1;
    });
    return Object.entries(typeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [inventory, catData]);

  const getItemFieldValue = (item, key) => {
    if (!key || key === "all") return "";
    const value = item?.[key];
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const uniqueOptions = (key) => {
    const set = new Set();
    inventory.forEach((item) => {
      const value = getItemFieldValue(item, key);
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  };

  const campusOptions = useMemo(() => uniqueOptions("campus"), [inventory]);
  const departmentOptions = useMemo(() => uniqueOptions("department"), [inventory]);
  const officeTypeOptions = useMemo(() => uniqueOptions("officeType"), [inventory]);
  const userTypeOptions = useMemo(() => uniqueOptions("userType"), [inventory]);
  const statusOptions = useMemo(() => uniqueOptions("status"), [inventory]);
  const categoryOptions = useMemo(() => {
    const set = new Set();
    inventory.forEach((item) => {
      const value = String(item?.category || item?.tabCategory || "").trim();
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [inventory]);
  const deviceTypeOptions = useMemo(() => uniqueOptions("deviceType"), [inventory]);
  const assignedUserOptions = useMemo(() => uniqueOptions("assignedUser"), [inventory]);

  const dynamicDetailKeys = useMemo(() => {
    const excluded = new Set([
      "id", "name", "category", "tabCategory", "sheetTab", "sheetRowIndex", "rawRow", "remarks",
      "campus", "department", "officeType", "userType", "status", "deviceType", "assignedUser",
    ]);
    const keys = new Set();
    inventory.forEach((item) => {
      Object.keys(item || {}).forEach((key) => {
        if (excluded.has(key) || key.startsWith("_")) return;
        const value = getItemFieldValue(item, key);
        if (value) keys.add(key);
      });
    });
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }, [inventory]);

  const detailValueOptions = useMemo(() => {
    if (!filters.detailKey || filters.detailKey === "all") return [];
    const set = new Set();
    inventory.forEach((item) => {
      const value = getItemFieldValue(item, filters.detailKey);
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [inventory, filters.detailKey]);

  const filteredInventory = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return inventory.filter((item) => {
      const category = String(item?.category || item?.tabCategory || "").trim();

      if (filters.campus !== "all" && getItemFieldValue(item, "campus") !== filters.campus) return false;
      if (filters.department !== "all" && getItemFieldValue(item, "department") !== filters.department) return false;
      if (filters.officeType !== "all" && getItemFieldValue(item, "officeType") !== filters.officeType) return false;
      if (filters.userType !== "all" && getItemFieldValue(item, "userType") !== filters.userType) return false;
      if (filters.status !== "all" && getItemFieldValue(item, "status") !== filters.status) return false;
      if (filters.category !== "all" && category !== filters.category) return false;
      if (filters.deviceType !== "all" && getItemFieldValue(item, "deviceType") !== filters.deviceType) return false;
      if (filters.assignedUser !== "all" && getItemFieldValue(item, "assignedUser") !== filters.assignedUser) return false;
      if (filters.detailKey !== "all" && filters.detailValue !== "all" && getItemFieldValue(item, filters.detailKey) !== filters.detailValue) return false;

      if (q) {
        const haystack = [
          category,
          item?.deviceType,
          item?.campus,
          item?.department,
          item?.officeType,
          item?.userType,
          item?.assignedUser,
          item?.assetTag,
          item?.brand,
          item?.model,
          item?.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [inventory, filters]);

  const filteredStatusCounts = useMemo(() => {
    const counts = {};
    filteredInventory.forEach((item) => {
      const key = getItemFieldValue(item, "status") || "Unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredInventory]);

  const filteredCampusCounts = useMemo(() => {
    const counts = {};
    filteredInventory.forEach((item) => {
      const key = getItemFieldValue(item, "campus") || "Unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredInventory]);

  const filteredCategoryCounts = useMemo(() => {
    const counts = {};
    filteredInventory.forEach((item) => {
      const key = String(item?.category || item?.tabCategory || "Unknown").trim() || "Unknown";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredInventory]);

  const categoryCards = useMemo(() =>
    CATEGORIES.map((cat) => {
      const count = inventory.filter((i) => i.category === cat.name || i.tabCategory === cat.name).length;
      const funcCount = inventory.filter((i) => (i.category === cat.name || i.tabCategory === cat.name) && i.status === "Functional").length;
      const pct = count > 0 ? Math.round((funcCount / count) * 100) : 0;
      return { ...cat, count, pct };
    }),
  [inventory]);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "detailKey" ? { detailValue: "all" } : {}),
    }));
  };

  const resetFilters = () => {
    setFilters({
      query: "",
      campus: "all",
      department: "all",
      officeType: "all",
      userType: "all",
      status: "all",
      category: "all",
      deviceType: "all",
      assignedUser: "all",
      detailKey: "all",
      detailValue: "all",
    });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-welcome">
        <div>
          <div className="university-badge">
            <img src={logoImg} alt="ICT Logo" className="univ-logo-img" />
            <span className="univ-title">ICT Hardware Inventory Management</span>
          </div>
          <h2 className="dashboard-heading">ICT Hardware Inventory Overview</h2>
          <p className="dashboard-subheading">
            Live data · {total.toLocaleString()} records across 12 hardware categories
          </p>
        </div>
        <button className="btn-view-all" onClick={onViewAll} id="btn-view-all">
          View All Devices →
        </button>
      </div>

      <div className="chart-card inventory-filter-card">
        <SectionHeader
          title="Inventory Reports Filter & Summary"
          subtitle="Filter by department/office, campus, user type, status, device fields, and summarize matched records"
        />

        <div className="inv-filter-grid">
          <div className="inv-filter-field inv-filter-field--search">
            <label>Search</label>
            <input
              className="inv-filter-input"
              type="text"
              placeholder="Search asset tag, user, brand, model, or status"
              value={filters.query}
              onChange={(e) => updateFilter("query", e.target.value)}
            />
          </div>

          <div className="inv-filter-field">
            <label>Campus</label>
            <select className="inv-filter-select" value={filters.campus} onChange={(e) => updateFilter("campus", e.target.value)}>
              <option value="all">All</option>
              {campusOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="inv-filter-field">
            <label>Department / Office</label>
            <select className="inv-filter-select" value={filters.department} onChange={(e) => updateFilter("department", e.target.value)}>
              <option value="all">All</option>
              {departmentOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="inv-filter-field">
            <label>Office Type</label>
            <select className="inv-filter-select" value={filters.officeType} onChange={(e) => updateFilter("officeType", e.target.value)}>
              <option value="all">All</option>
              {officeTypeOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="inv-filter-field">
            <label>User Type</label>
            <select className="inv-filter-select" value={filters.userType} onChange={(e) => updateFilter("userType", e.target.value)}>
              <option value="all">All</option>
              {userTypeOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="inv-filter-field">
            <label>Status</label>
            <select className="inv-filter-select" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
              <option value="all">All</option>
              {statusOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="inv-filter-field">
            <label>Category</label>
            <select className="inv-filter-select" value={filters.category} onChange={(e) => updateFilter("category", e.target.value)}>
              <option value="all">All</option>
              {categoryOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="inv-filter-field">
            <label>Device Type</label>
            <select className="inv-filter-select" value={filters.deviceType} onChange={(e) => updateFilter("deviceType", e.target.value)}>
              <option value="all">All</option>
              {deviceTypeOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="inv-filter-field">
            <label>Assigned User</label>
            <select className="inv-filter-select" value={filters.assignedUser} onChange={(e) => updateFilter("assignedUser", e.target.value)}>
              <option value="all">All</option>
              {assignedUserOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="inv-filter-field">
            <label>Detail Field</label>
            <select className="inv-filter-select" value={filters.detailKey} onChange={(e) => updateFilter("detailKey", e.target.value)}>
              <option value="all">All</option>
              {dynamicDetailKeys.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className="inv-filter-field">
            <label>Detail Value</label>
            <select
              className="inv-filter-select"
              value={filters.detailValue}
              onChange={(e) => updateFilter("detailValue", e.target.value)}
              disabled={filters.detailKey === "all"}
            >
              <option value="all">All</option>
              {detailValueOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="inv-filter-actions">
            <button className="btn-filter-reset" type="button" onClick={resetFilters}>Reset Filters</button>
          </div>
        </div>

        <div className="inv-filter-kpis">
          <div className="inv-filter-kpi"><span>Matched Reports</span><strong>{filteredInventory.length.toLocaleString()}</strong></div>
          <div className="inv-filter-kpi"><span>Total Inventory</span><strong>{total.toLocaleString()}</strong></div>
          <div className="inv-filter-kpi"><span>Coverage</span><strong>{total ? `${Math.round((filteredInventory.length / total) * 100)}%` : "0%"}</strong></div>
        </div>

        <div className="inv-summary-grid">
          <div className="inv-summary-card">
            <h4>Status Summary</h4>
            <ul>
              {filteredStatusCounts.map((row) => <li key={row.name}><span>{row.name}</span><strong>{row.count.toLocaleString()}</strong></li>)}
            </ul>
          </div>
          <div className="inv-summary-card">
            <h4>Campus Summary</h4>
            <ul>
              {filteredCampusCounts.map((row) => <li key={row.name}><span>{row.name}</span><strong>{row.count.toLocaleString()}</strong></li>)}
            </ul>
          </div>
          <div className="inv-summary-card">
            <h4>Category Summary</h4>
            <ul>
              {filteredCategoryCounts.slice(0, 10).map((row) => <li key={row.name}><span>{row.name}</span><strong>{row.count.toLocaleString()}</strong></li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard icon="📦" value={total} label="Total Devices" color="#800020" />
        <KpiCard icon="✅" value={functional} label="Functional" color="#22c55e" pct={Math.round((functional / total) * 100 || 0)} />
        <KpiCard icon="⬆️" value={forUpgrade} label="For Upgrade" color="#f59e0b" pct={Math.round((forUpgrade / total) * 100 || 0)} />
        <KpiCard icon="🔄" value={forReplacement} label="For Replacement" color="#f97316" pct={Math.round((forReplacement / total) * 100 || 0)} />
        <KpiCard icon="🔴" value={defective} label="Defective" color="#ef4444" pct={Math.round((defective / total) * 100 || 0)} />
        <KpiCard icon="🏫" value={campusData.length} label="Campuses" color="#d4af37" />
      </div>

      <div className="charts-row charts-row-2">
        <div className="chart-card chart-donut-wrap">
          <SectionHeader title="Device Status" subtitle="Health overview" />
          <div className="donut-chart-area" style={{ position: "relative" }}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={900}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
                  ))}
                </Pie>
                <RTooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={10}
                  formatter={(v, e) => (
                    <span style={{ fontSize: 12, fontWeight: 700, color: textColor }}>
                      {v} <span style={{ color: e.color }}>({e.payload.value.toLocaleString()})</span>
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: "absolute",
              top: "42%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              pointerEvents: "none",
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: darkMode ? "#ffd700" : "#800020", lineHeight: 1 }}>{total.toLocaleString()}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: mutedColor, marginTop: 4 }}>devices</div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <SectionHeader title="Devices by Category" subtitle="All 12 ICT hardware categories" />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={catData} layout="vertical" margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: mutedColor }} />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 11, fill: textColor, fontWeight: 600 }}
              />
              <RTooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Devices" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d) => onSelectCategory(d.full)}>
                {catData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-row charts-row-2">
        <div className="chart-card">
          <SectionHeader title="Procurement Trend" subtitle="Devices purchased per year" />
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={yearData} margin={{ left: 0, right: 20, top: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="yearGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={darkMode ? "#ffd700" : "#800020"} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={darkMode ? "#ffd700" : "#800020"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: mutedColor }} />
              <YAxis tick={{ fontSize: 11, fill: mutedColor }} />
              <RTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Devices"
                stroke={darkMode ? "#ffd700" : "#800020"}
                strokeWidth={2.5}
                fill="url(#yearGrad)"
                dot={{ fill: darkMode ? "#ffd700" : "#800020", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#ffd700" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <SectionHeader title="Campus Distribution" subtitle="Devices across all campuses" />
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={campusData} margin={{ left: 0, right: 20, top: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11, fill: mutedColor }} />
              <RTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={10}
                formatter={(v) => <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{v}</span>} />
              <Bar dataKey="count" name="Total" fill={darkMode ? "#9E1B32" : "#800020"} radius={[6, 6, 0, 0]} />
              <Bar dataKey="functional" name="Functional" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="defective" name="Defective" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-row charts-row-2">
        <div className="chart-card">
          <SectionHeader title="Status Radar" subtitle="Functional vs defective per top category" />
          <ResponsiveContainer width="100%" height={270}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke={gridColor} />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: textColor, fontWeight: 700 }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: mutedColor }} />
              <Radar name="Functional" dataKey="Functional" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="Defective" dataKey="Defective" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
              <Radar name="For Replacement" dataKey="For Replacement" stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={1.5} />
              <RTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={10}
                formatter={(v) => <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{v}</span>} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <SectionHeader title={`${catData[0]?.full || "Top Category"} Breakdown`} subtitle="By sub-device type" />
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie
                data={topTypeData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => percent > 0.06 ? `${name} (${(percent * 100).toFixed(0)}%)` : ""}
                labelLine={true}
                animationBegin={0}
                animationDuration={900}
              >
                {topTypeData.map((_, i) => (
                  <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
                ))}
              </Pie>
              <RTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <SectionHeader title="12 ICT Hardware Categories" subtitle="Click to browse" />
      <div className="category-grid">
        {categoryCards.map((cat) => (
          <button
            key={cat.name}
            className="category-card"
            onClick={() => onSelectCategory(cat.name)}
            id={`dashboard-cat-${cat.name.replace(/\s+/g, "-").toLowerCase()}`}
            style={{ "--cat-color": cat.color }}
          >
            <div className="category-card-header">
              <span className="category-card-icon">{cat.icon}</span>
              <span className="category-card-count">{cat.count.toLocaleString()} units</span>
            </div>
            <h4 className="category-card-name">{cat.name}</h4>
            <div className="cat-health-row">
              <span className="cat-health-pct" style={{ color: cat.pct >= 80 ? "#22c55e" : cat.pct >= 60 ? "#f59e0b" : "#ef4444" }}>
                {cat.pct}% functional
              </span>
            </div>
            <div className="category-card-bar">
              <div
                className="category-card-bar-fill"
                style={{ width: `${Math.min(100, (cat.count / Math.max(1, total)) * 100 * 3)}%`, background: cat.color }}
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
