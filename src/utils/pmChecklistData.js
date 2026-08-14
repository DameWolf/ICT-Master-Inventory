/**
 * pmChecklistData.js
 * ─────────────────────────────────────────────────────────
 * Pure data utilities for the PM Checklist generator.
 * No React, no DOM — just data transformation.
 */

// ── Template row definitions ─────────────────────────────
// Order must match the official form exactly.
export const TEMPLATE_ROWS = [
  {
    key: "systemUnit",
    label: "System Unit",
    match: (dt) => /desktop|laptop|computer|cpu|aio|all.?in.?one|system.?unit|notebook|pc\b|workstation/i.test(dt),
  },
  {
    key: "monitor",
    label: "Monitor",
    match: (dt) => /monitor|display|screen|lcd|led\s*(tv|monitor)|flat.?panel/i.test(dt),
  },
  {
    key: "keyboard",
    label: "Keyboard",
    match: (dt) => /keyboard/i.test(dt),
  },
  {
    key: "mouse",
    label: "Mouse",
    match: (dt) => /\bmouse\b|trackpad|trackball/i.test(dt),
  },
  {
    key: "printer",
    label: "Printer",
    match: (dt) => /printer|scanner|copier|fax|mfp|multi.?function/i.test(dt),
  },
  {
    key: "avr",
    label: "AVR",
    match: (dt) => /avr|automatic.?voltage|voltage.?regulator/i.test(dt),
  },
  {
    key: "ups",
    label: "UPS",
    match: (dt) => /ups|uninterruptible/i.test(dt),
  },
  {
    key: "router",
    label: "Router",
    match: (dt) => /router|modem|access.?point|wifi.?device/i.test(dt),
  },
  {
    key: "switch",
    label: "Switch",
    match: (dt) => /\bswitch\b|\bhub\b|network.?switch/i.test(dt),
  },
  {
    key: "software",
    label: "Software",
    match: (dt) => /software|application|license/i.test(dt),
  },
  {
    key: "connectivityType",
    label: "Connectivity Type",
    isConnectivity: true,
    noAssetTag: true,
  },
  {
    key: "connectivitySpeed",
    label: "Connectivity Speed",
    isConnectivity: true,
    noAssetTag: true,
  },
  {
    key: "others",
    label: "Others",
    isOthers: true,
  },
];

// ── Status mapping ───────────────────────────────────────
// Maps inventory status strings to the 4 checkbox columns
export const STATUS_MAP = {
  Functional: "functional",
  "For Repair": "forRepair",
  "For Upgrade": "forUpgrade",
  "For Replacement": "forReplacement",
  Defective: "forRepair", // Defective → For Repair column
};

// ── Search / filter helpers ──────────────────────────────

/** Get all unique assigned users from inventory */
export function getAllUsers(inventory) {
  const users = new Set();
  for (const item of inventory) {
    if (item.assignedUser && item.assignedUser.trim()) {
      users.add(item.assignedUser.trim());
    }
  }
  return [...users].sort();
}

/** Get all unique departments from inventory */
export function getAllDepartments(inventory) {
  const depts = new Set();
  for (const item of inventory) {
    if (item.department && item.department.trim()) {
      depts.add(item.department.trim());
    }
  }
  return [...depts].sort();
}

/** Filter inventory by assigned user (case-insensitive, partial match) */
export function getDevicesForUser(inventory, userName) {
  const q = userName.toLowerCase().trim();
  return inventory.filter(
    (item) => item.assignedUser && item.assignedUser.toLowerCase().includes(q)
  );
}

/** Filter inventory by department */
export function getDevicesForDepartment(inventory, dept) {
  const q = dept.toLowerCase().trim();
  return inventory.filter(
    (item) => item.department && item.department.toLowerCase().includes(q)
  );
}

// ── Device → row mapping ─────────────────────────────────

/**
 * Map a flat list of inventory devices into the 13 template rows.
 * Each row can have multiple devices (e.g. 2 monitors).
 * Returns an object keyed by row key, value is array of matched devices.
 */
export function mapDevicesToRows(devices) {
  const rowMap = {};
  const othersDevices = [];

  // Initialize empty arrays for each row
  for (const row of TEMPLATE_ROWS) {
    rowMap[row.key] = [];
  }

  for (const device of devices) {
    const dt = device.deviceType || device.name || "";
    let matched = false;

    for (const row of TEMPLATE_ROWS) {
      if (row.isConnectivity || row.isOthers) continue;
      if (row.match && row.match(dt)) {
        rowMap[row.key].push(device);
        matched = true;
        break;
      }
    }

    if (!matched) {
      othersDevices.push(device);
    }
  }

  rowMap["others"] = othersDevices;
  return rowMap;
}

/**
 * Build a single row entry for the checklist table.
 * If a row has multiple devices, we merge their statuses (worst-case)
 * and concatenate their asset tags + remarks.
 */
export function buildRowEntry(rowKey, devices) {
  if (devices.length === 0) {
    return {
      functional: false,
      forRepair: false,
      forUpgrade: false,
      forReplacement: false,
      assetTags: "",
      remarks: "",
      hasDevice: false,
    };
  }

  const statusCounts = { functional: 0, forRepair: 0, forUpgrade: 0, forReplacement: 0 };

  const assetTags = devices
    .map((d) => d.assetTag || "")
    .filter(Boolean)
    .join(", ");

  const remarkParts = devices.map((d) => buildDeviceRemark(d));
  const remarks = remarkParts.join(" | ");

  for (const d of devices) {
    const statusKey = STATUS_MAP[d.status] || "functional";
    statusCounts[statusKey]++;
  }

  // Determine dominant status for checkmark placement
  // Priority: forReplacement > forRepair > forUpgrade > functional
  const dominant =
    statusCounts.forReplacement > 0
      ? "forReplacement"
      : statusCounts.forRepair > 0
      ? "forRepair"
      : statusCounts.forUpgrade > 0
      ? "forUpgrade"
      : "functional";

  return {
    functional:      dominant === "functional",
    forRepair:       dominant === "forRepair",
    forUpgrade:      dominant === "forUpgrade",
    forReplacement:  dominant === "forReplacement",
    assetTags,
    remarks,
    hasDevice: true,
    devices,
  };
}

/**
 * Build a compact remark string for a single device.
 * Fits within a small table cell.
 */
export function buildDeviceRemark(device) {
  const parts = [];

  const brand = device.brand;
  const model = device.model || device.deviceName;
  const year  = device.yearPurchased;
  const tag   = device.assetTag;
  const specs = device.processor
    ? `${device.processor}/${device.ram || ""}/${device.storage || ""}`
    : device.specs;

  if (brand) parts.push(`Brand: ${brand}`);
  if (model) parts.push(`Model: ${model}`);
  if (specs) parts.push(`Specs: ${specs}`);
  if (year)  parts.push(`Yr: ${year}`);
  if (tag)   parts.push(`Tag: ${tag}`);
  if (device.status && device.status !== "Functional") parts.push(`[${device.status}]`);

  return parts.join(" | ");
}

// ── Connectivity detection ───────────────────────────────

/** Detect whether any device in the set is a router/switch/wireless */
export function detectConnectivity(devices) {
  const hasWired    = devices.some((d) => /router|switch|hub|ethernet|wired/i.test(d.deviceType || ""));
  const hasWireless = devices.some((d) => /wifi|wi-fi|wireless|access.?point/i.test(d.deviceType || ""));
  const routers     = devices.filter((d) => /router|modem|access.?point|switch|hub/i.test(d.deviceType || ""));
  const speed       = routers.length > 0 ? (routers[0].model || routers[0].specs || "") : "";

  return { hasWired, hasWireless, speed };
}

// ── Overall Remarks generator ────────────────────────────

/**
 * Generate an automated overall remarks paragraph based on device statuses.
 * Kept to 2–3 sentences. User can edit this in the UI before downloading.
 */
export function generateOverallRemarks(devices, userName, department) {
  if (devices.length === 0) return "";

  const total        = devices.length;
  const functional   = devices.filter((d) => d.status === "Functional").length;
  const defective    = devices.filter((d) => d.status === "Defective" || d.status === "For Repair").length;
  const forReplace   = devices.filter((d) => d.status === "For Replacement").length;
  const forUpgrade   = devices.filter((d) => d.status === "For Upgrade").length;
  const funcPct      = Math.round((functional / total) * 100);

  // Find aging devices
  const currentYear  = new Date().getFullYear();
  const oldDevices   = devices.filter((d) => d.yearPurchased && (currentYear - parseInt(d.yearPurchased)) >= 7);

  let remarks = `${functional} out of ${total} device(s) assigned to ${userName || department || "this unit"} are currently functional (${funcPct}%).`;

  if (forReplace > 0) {
    remarks += ` ${forReplace} unit(s) are tagged for replacement and require immediate procurement action.`;
  } else if (defective > 0) {
    remarks += ` ${defective} unit(s) are defective and require repair or replacement.`;
  } else if (forUpgrade > 0) {
    remarks += ` ${forUpgrade} unit(s) are functional but recommended for hardware upgrade.`;
  }

  if (oldDevices.length > 0) {
    const oldList = [...new Set(oldDevices.map((d) => d.deviceType || d.name))].slice(0, 3).join(", ");
    remarks += ` ${oldDevices.length} device(s) (${oldList}) are 7+ years old — lifecycle review recommended.`;
  } else if (forReplace === 0 && defective === 0) {
    remarks += " All devices are in good working condition. Regular preventive maintenance is advised to maintain operational efficiency.";
  }

  return remarks;
}

// ── Full checklist data assembler ────────────────────────

/**
 * Assembles the complete checklist data object used by both PDF and Word generators.
 */
export function buildChecklistData({
  devices,
  userName,
  department,
  campus,
  building,
  room,
  schedule,
  conductedBy,
  overallRemarks,
  reportDate,
}) {
  const rowMap     = mapDevicesToRows(devices);
  const rowEntries = {};

  for (const row of TEMPLATE_ROWS) {
    if (row.isConnectivity || row.isOthers) continue;
    rowEntries[row.key] = buildRowEntry(row.key, rowMap[row.key]);
  }
  rowEntries["others"] = buildRowEntry("others", rowMap["others"]);

  const connectivity = detectConnectivity(devices);

  return {
    // Header meta
    department:   department || "",
    campus:       campus     || "Main",
    building:     building   || "",
    room:         room       || "",
    schedule:     schedule   || "Monthly",

    // Procedures (all checked by default — standard ICT procedure)
    procedures: {
      inventoryManagement: true,
      regularCleaning:     true,
      hardwareInspections: true,
      dataBackup:          true,
      softwareUpdates:     true,
      virusMalware:        true,
    },

    // Table rows
    rows: rowEntries,

    // Connectivity
    connectivity,

    // Remarks & signatures
    overallRemarks: overallRemarks || generateOverallRemarks(devices, userName, department),
    userName:       userName        || "",
    conductedBy:    conductedBy     || "",
    reportDate:     reportDate      || new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }),

    // Meta
    totalDevices:  devices.length,
    rawDevices:    devices,
  };
}
