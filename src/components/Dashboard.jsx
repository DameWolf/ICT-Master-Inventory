import React, { useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { STATUS_COLORS, CATEGORIES, CAMPUSES } from "../data/inventoryData";
import logoImg from "../assets/logo.jpg";
import "./Dashboard.css";

/* ─── Colour palette ─── */
const CAT_COLORS = CATEGORIES.map((c) => c.color);
const STATUS_PIE_COLORS = {
  Functional:       "#22c55e",
  "For Upgrade":    "#f59e0b",
  "For Replacement":"#f97316",
  Defective:        "#ef4444",
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

/* (No custom label component needed — using CSS overlay) */


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
  const total          = inventory.length;
  const functional     = inventory.filter((i) => i.status === "Functional").length;
  const forReplacement = inventory.filter((i) => i.status === "For Replacement").length;
  const forUpgrade     = inventory.filter((i) => i.status === "For Upgrade").length;
  const defective      = inventory.filter((i) => i.status === "Defective").length;

  const textColor = darkMode ? "#ffffff" : "#2b0f19";
  const mutedColor = darkMode ? "rgba(255,255,255,0.7)" : "#7a5866";
  const gridColor = darkMode ? "rgba(255,255,255,0.12)" : "#f0e8e0";

  /* ─── Status donut data ─── */
  const statusData = useMemo(() => [
    { name: "Functional",        value: functional,     color: STATUS_PIE_COLORS.Functional },
    { name: "For Upgrade",       value: forUpgrade,     color: STATUS_PIE_COLORS["For Upgrade"] },
    { name: "For Replacement",   value: forReplacement, color: STATUS_PIE_COLORS["For Replacement"] },
    { name: "Defective",         value: defective,      color: STATUS_PIE_COLORS.Defective },
  ].filter((d) => d.value > 0), [functional, forUpgrade, forReplacement, defective]);

  /* ─── Category bar chart ─── */
  const catData = useMemo(() =>
    CATEGORIES.map((cat) => ({
      name: cat.name.replace(" Devices", "").replace(" Equipment", "").replace(" Systems", ""),
      full: cat.name,
      count: inventory.filter((i) => i.category === cat.name || i.tabCategory === cat.name).length,
      color: cat.color,
    })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count),
  [inventory]);

  /* ─── Campus bar chart ─── */
  const campusData = useMemo(() =>
    CAMPUSES.map((campus) => ({
      name: campus,
      count: inventory.filter((i) => i.campus === campus).length,
      functional: inventory.filter((i) => i.campus === campus && i.status === "Functional").length,
      defective:  inventory.filter((i) => i.campus === campus && i.status === "Defective").length,
    })).filter((c) => c.count > 0),
  [inventory]);

  /* ─── Year trend chart ─── */
  const yearData = useMemo(() => {
    const counts = {};
    inventory.forEach((i) => {
      const y = parseInt(i.yearPurchased);
      if (y >= 2000 && y <= 2030) counts[y] = (counts[y] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a - b)
      .map(([year, count]) => ({ year, count }));
  }, [inventory]);

  /* ─── Radar chart: status distribution per top category ─── */
  const radarData = useMemo(() => {
    const topCats = catData.slice(0, 6);
    return topCats.map((cat) => {
      const items = inventory.filter((i) => i.category === cat.full || i.tabCategory === cat.full);
      return {
        category: cat.name,
        Functional:       items.filter((i) => i.status === "Functional").length,
        "For Upgrade":    items.filter((i) => i.status === "For Upgrade").length,
        "For Replacement":items.filter((i) => i.status === "For Replacement").length,
        Defective:        items.filter((i) => i.status === "Defective").length,
      };
    });
  }, [inventory, catData]);

  /* ─── Device type breakdown for top 3 cats ─── */
  const topTypeData = useMemo(() => {
    const topCat = catData[0];
    if (!topCat) return [];
    const items = inventory.filter((i) => i.category === topCat.full || i.tabCategory === topCat.full);
    const typeCounts = {};
    items.forEach((i) => { typeCounts[i.deviceType] = (typeCounts[i.deviceType] || 0) + 1; });
    return Object.entries(typeCounts)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [inventory, catData]);

  return (
    <div className="dashboard">
      {/* ── Welcome Banner ── */}
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

      {/* ── KPI Row ── */}
      <div className="kpi-grid">
        <KpiCard icon="📦" value={total}          label="Total Devices"   color="#800020"                           />
        <KpiCard icon="✅" value={functional}     label="Functional"      color="#22c55e"  pct={Math.round(functional/total*100)}     />
        <KpiCard icon="⬆️" value={forUpgrade}     label="For Upgrade"     color="#f59e0b"  pct={Math.round(forUpgrade/total*100)}     />
        <KpiCard icon="🔄" value={forReplacement} label="For Replacement" color="#f97316"  pct={Math.round(forReplacement/total*100)} />
        <KpiCard icon="🔴" value={defective}      label="Defective"       color="#ef4444"  pct={Math.round(defective/total*100)}      />
        <KpiCard icon="🏫" value={campusData.length} label="Campuses"     color="#d4af37"                           />
      </div>

      {/* ── Row 1: Status Donut + Category Bar ── */}
      <div className="charts-row charts-row-2">
        {/* Status Donut */}
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
            {/* Center text overlay */}
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

        {/* Category Horizontal Bar */}
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
              <Bar dataKey="count" name="Devices" radius={[0, 6, 6, 0]} cursor="pointer"
                onClick={(d) => onSelectCategory(d.full)}>
                {catData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 2: Year Trend + Campus Grouped Bar ── */}
      <div className="charts-row charts-row-2">
        {/* Year Purchased Area Trend */}
        <div className="chart-card">
          <SectionHeader title="Procurement Trend" subtitle="Devices purchased per year" />
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={yearData} margin={{ left: 0, right: 20, top: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="yearGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={darkMode ? "#ffd700" : "#800020"} stopOpacity={0.35} />
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

        {/* Campus Grouped Bar */}
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
              <Bar dataKey="count"      name="Total"      fill={darkMode ? "#9E1B32" : "#800020"} radius={[6,6,0,0]} />
              <Bar dataKey="functional" name="Functional" fill="#22c55e" radius={[6,6,0,0]} />
              <Bar dataKey="defective"  name="Defective"  fill="#ef4444" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Radar + Top Device Types Donut ── */}
      <div className="charts-row charts-row-2">
        {/* Radar Chart */}
        <div className="chart-card">
          <SectionHeader title="Status Radar" subtitle="Functional vs defective per top category" />
          <ResponsiveContainer width="100%" height={270}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke={gridColor} />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: textColor, fontWeight: 700 }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: mutedColor }} />
              <Radar name="Functional"      dataKey="Functional"       stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="Defective"       dataKey="Defective"        stroke="#ef4444" fill="#ef4444" fillOpacity={0.2}  strokeWidth={2} />
              <Radar name="For Replacement" dataKey="For Replacement"  stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={1.5} />
              <RTooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={10}
                formatter={(v) => <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{v}</span>} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Device Types donut for largest category */}
        <div className="chart-card">
          <SectionHeader
            title={`${catData[0]?.full || "Top Category"} Breakdown`}
            subtitle="By sub-device type"
          />
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

      {/* ── Row 4: Category Cards ── */}
      <SectionHeader title="12 ICT Hardware Categories" subtitle="Click to browse" />
      <div className="category-grid">
        {CATEGORIES.map((cat, idx) => {
          const count = inventory.filter((i) => i.category === cat.name || i.tabCategory === cat.name).length;
          const funcCount = inventory.filter((i) => (i.category === cat.name || i.tabCategory === cat.name) && i.status === "Functional").length;
          const pct = count > 0 ? Math.round(funcCount / count * 100) : 0;
          return (
            <button
              key={cat.name}
              className="category-card"
              onClick={() => onSelectCategory(cat.name)}
              id={`dashboard-cat-${cat.name.replace(/\s+/g, "-").toLowerCase()}`}
              style={{ "--cat-color": cat.color }}
            >
              <div className="category-card-header">
                <span className="category-card-icon">{cat.icon}</span>
                <span className="category-card-count">{count.toLocaleString()} units</span>
              </div>
              <h4 className="category-card-name">{cat.name}</h4>
              <div className="cat-health-row">
                <span className="cat-health-pct" style={{ color: pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444" }}>
                  {pct}% functional
                </span>
              </div>
              <div className="category-card-bar">
                <div
                  className="category-card-bar-fill"
                  style={{ width: `${Math.min(100, (count / Math.max(1, total)) * 100 * 3)}%`, background: cat.color }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
