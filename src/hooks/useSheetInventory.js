import { useState, useEffect, useCallback } from "react";

// The 12 Standard Google Sheet tabs mapping (Tab name + GID)
export const SHEET_TABS = [
  { name: "Computing Devices",     gid: "0" },
  { name: "Storage Devices",       gid: "1016225010" },
  { name: "Networking Equipment",  gid: "2145514340" },
  { name: "Input Devices",         gid: "702434542" },
  { name: "Output Devices",        gid: "1440195529" },
  { name: "Peripheral Devices",    gid: "218018862" },
  { name: "Communication Devices", gid: "1124120964" },
  { name: "Other ICT Hardware",    gid: "1057208702" },
  { name: "Specialized Devices",   gid: "1544307167" },
  { name: "Wearable Devices",      gid: "1381636888" },
  { name: "Embedded Systems",      gid: "1042856241" },
  { name: "Security Devices",      gid: "748502813" },
  { name: "BYOD / Personal",       gid: "1674181719" },
];

/**
 * Column definitions for each category — derived from actual Google Sheet headers.
 * key       → field name stored on the item object
 * label     → display label in the table header
 * csvIndex  → 0-based column index in the CSV
 */
export const CATEGORY_COLUMNS = {
  // Col: DevType,Campus,OffType,Dept,UserType,YearPurch,Usage,Processor,Ram,OS,Storage,StorageExtra,AssetTag,User,Status,Remarks
  "Computing Devices": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "yearPurchased",label: "Year",           csvIndex: 5  },
    { key: "processor",    label: "Processor",      csvIndex: 7  },
    { key: "ram",          label: "RAM",            csvIndex: 8  },
    { key: "os",           label: "OS",             csvIndex: 9  },
    { key: "storage",      label: "Storage",        csvIndex: 10 },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 12 },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 13 },
    { key: "status",       label: "Status",         csvIndex: 14 },
  ],

  // Col: DevType,Campus,OffType,Dept,UserType,YearPurch,Specifications,Storage,AssetTag,User,Status,Remarks
  "Storage Devices": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "yearPurchased",label: "Year",           csvIndex: 5  },
    { key: "specs",        label: "Specifications", csvIndex: 6  },
    { key: "storage",      label: "Storage",        csvIndex: 7  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 8  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 9  },
    { key: "status",       label: "Status",         csvIndex: 10 },
  ],

  // Col: DevType,Campus,UsageType,Dept,Building,Room,UserType,Brand,Model,YearPurch,MAC,AssetTag,DeviceName,Status,Remarks
  "Networking Equipment": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "building",     label: "Building",       csvIndex: 4  },
    { key: "brand",        label: "Brand",          csvIndex: 7  },
    { key: "model",        label: "Model",          csvIndex: 8  },
    { key: "yearPurchased",label: "Year",           csvIndex: 9  },
    { key: "mac",          label: "MAC Address",    csvIndex: 10 },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 11 },
    { key: "deviceName",   label: "Device Name",    csvIndex: 12 },
    { key: "status",       label: "Status",         csvIndex: 13 },
  ],

  // Col: DevType,Campus,OffType,Dept,UserType,YearPurch,Brand,AssetTag,User,Status,Remarks
  "Input Devices": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "yearPurchased",label: "Year",           csvIndex: 5  },
    { key: "brand",        label: "Brand",          csvIndex: 6  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 7  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 8  },
    { key: "status",       label: "Status",         csvIndex: 9  },
  ],

  // Col: DevType,Campus,OffType,Dept,UserType,YearPurch,Brand,ModelNo,Size,AssetTag,User,Status,Remarks
  "Output Devices": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "yearPurchased",label: "Year",           csvIndex: 5  },
    { key: "brand",        label: "Brand",          csvIndex: 6  },
    { key: "model",        label: "Model No.",      csvIndex: 7  },
    { key: "size",         label: "Size (in.)",     csvIndex: 8  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 9  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 10 },
    { key: "status",       label: "Status",         csvIndex: 11 },
  ],

  // Peripheral — same structure as Input (no data but define reasonably)
  "Peripheral Devices": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "yearPurchased",label: "Year",           csvIndex: 5  },
    { key: "brand",        label: "Brand",          csvIndex: 6  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 7  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 8  },
    { key: "status",       label: "Status",         csvIndex: 9  },
  ],

  // Col: DevType,Campus,OffType,Dept,UserType,Brand,Model,YearPurch,DevLocation,AssetTag,User,Status,Remarks
  "Communication Devices": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "brand",        label: "Brand",          csvIndex: 5  },
    { key: "model",        label: "Model",          csvIndex: 6  },
    { key: "yearPurchased",label: "Year",           csvIndex: 7  },
    { key: "location",     label: "Location",       csvIndex: 8  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 9  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 10 },
    { key: "status",       label: "Status",         csvIndex: 11 },
  ],

  // Col: DevType,Campus,OffType,Dept,UserType,YearPurch,Brand,ModelNo,OutputVoltage,AssetTag,User,Status,Remarks
  "Other ICT Hardware": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "yearPurchased",label: "Year",           csvIndex: 5  },
    { key: "brand",        label: "Brand",          csvIndex: 6  },
    { key: "model",        label: "Model No.",      csvIndex: 7  },
    { key: "voltage",      label: "Output (VA)",    csvIndex: 8  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 9  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 10 },
    { key: "status",       label: "Status",         csvIndex: 11 },
  ],

  // Col: DevType,Campus,OffType,Dept,UserType,YearPurch,Brand,Model,AssetTag,User,Status,Remarks
  "Specialized Devices": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "yearPurchased",label: "Year",           csvIndex: 5  },
    { key: "brand",        label: "Brand",          csvIndex: 6  },
    { key: "model",        label: "Model",          csvIndex: 7  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 8  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 9  },
    { key: "status",       label: "Status",         csvIndex: 10 },
  ],

  // Generic fallback for Wearable, Embedded, Security (likely same as Specialized)
  "Wearable Devices": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "yearPurchased",label: "Year",           csvIndex: 5  },
    { key: "brand",        label: "Brand",          csvIndex: 6  },
    { key: "model",        label: "Model",          csvIndex: 7  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 8  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 9  },
    { key: "status",       label: "Status",         csvIndex: 10 },
  ],

  "Embedded Systems": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "yearPurchased",label: "Year",           csvIndex: 5  },
    { key: "brand",        label: "Brand",          csvIndex: 6  },
    { key: "model",        label: "Model",          csvIndex: 7  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 8  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 9  },
    { key: "status",       label: "Status",         csvIndex: 10 },
  ],

  "Security Devices": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "yearPurchased",label: "Year",           csvIndex: 5  },
    { key: "brand",        label: "Brand",          csvIndex: 6  },
    { key: "model",        label: "Model",          csvIndex: 7  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 8  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 9  },
    { key: "status",       label: "Status",         csvIndex: 10 },
  ],

  "BYOD / Personal": [
    { key: "campus",       label: "Campus",         csvIndex: 1  },
    { key: "department",   label: "Department",     csvIndex: 3  },
    { key: "brand",        label: "Brand",          csvIndex: 5  },
    { key: "model",        label: "Model",          csvIndex: 6  },
    { key: "assetTag",     label: "Asset Tag",      csvIndex: 8  },
    { key: "assignedUser", label: "Assigned To",    csvIndex: 9  },
    { key: "status",       label: "Status",         csvIndex: 10 },
  ],
};

/** Default columns shown when viewing "All Devices" */
export const DEFAULT_COLUMNS = [
  { key: "campus",       label: "Campus"       },
  { key: "department",   label: "Department"   },
  { key: "brand",        label: "Brand / Specs"},
  { key: "model",        label: "Model"        },
  { key: "assetTag",     label: "Asset Tag"    },
  { key: "assignedUser", label: "Assigned To"  },
  { key: "status",       label: "Status"       },
];

/**
 * Get columns to display for a given category.
 * Returns the category-specific list, or a sensible default.
 */
export function getColumnsForCategory(category) {
  return CATEGORY_COLUMNS[category] || DEFAULT_COLUMNS;
}

/**
 * Robustly parse a single CSV row, handling quoted fields with commas inside.
 */
function parseCSVRow(row) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Category-specific CSV parsers that correctly map columns per sheet tab.
 */
function parseRow(cols, tabName) {
  // All parsers share: cols[0] = deviceType, cols[1] = campus
  const deviceType = cols[0] || tabName;
  const campus = cols[1] || "";

  switch (tabName) {
    case "Computing Devices":
      return {
        deviceType, campus,
        officeType:    cols[2]  || "",
        department:    cols[3]  || "",
        userType:      cols[4]  || "",
        yearPurchased: cols[5]  || "",
        usage:         cols[6]  || "",
        processor:     cols[7]  || "",
        ram:           cols[8]  || "",
        os:            cols[9]  || "",
        storage:       cols[10] || "",
        storageExtra:  cols[11] || "",
        assetTag:      cols[12] || "",
        assignedUser:  cols[13] || "",
        status:        cols[14] || "Functional",
        remarks:       cols[15] || "",
      };

    case "Storage Devices":
      return {
        deviceType, campus,
        officeType:    cols[2] || "",
        department:    cols[3] || "",
        userType:      cols[4] || "",
        yearPurchased: cols[5] || "",
        specs:         cols[6] || "",
        storage:       cols[7] || "",
        assetTag:      cols[8] || "",
        assignedUser:  cols[9] || "",
        status:        cols[10] || "Functional",
        remarks:       cols[11] || "",
      };

    case "Networking Equipment":
      return {
        deviceType, campus,
        officeType:    cols[2] || "",
        department:    cols[3] || "",
        building:      cols[4] || "",
        room:          cols[5] || "",
        userType:      cols[6] || "",
        brand:         cols[7] || "",
        model:         cols[8] || "",
        yearPurchased: cols[9] || "",
        mac:           cols[10] || "",
        assetTag:      cols[11] || "",
        deviceName:    cols[12] || "",
        status:        cols[13] || "Functional",
        remarks:       cols[14] || "",
      };

    case "Input Devices":
      return {
        deviceType, campus,
        officeType:    cols[2] || "",
        department:    cols[3] || "",
        userType:      cols[4] || "",
        yearPurchased: cols[5] || "",
        brand:         cols[6] || "",
        assetTag:      cols[7] || "",
        assignedUser:  cols[8] || "",
        status:        cols[9] || "Functional",
        remarks:       cols[10] || "",
      };

    case "Output Devices":
      return {
        deviceType, campus,
        officeType:    cols[2] || "",
        department:    cols[3] || "",
        userType:      cols[4] || "",
        yearPurchased: cols[5] || "",
        brand:         cols[6] || "",
        model:         cols[7] || "",
        size:          cols[8] || "",
        assetTag:      cols[9] || "",
        assignedUser:  cols[10] || "",
        status:        cols[11] || "Functional",
        remarks:       cols[12] || "",
      };

    case "Communication Devices":
      return {
        deviceType, campus,
        officeType:    cols[2] || "",
        department:    cols[3] || "",
        userType:      cols[4] || "",
        brand:         cols[5] || "",
        model:         cols[6] || "",
        yearPurchased: cols[7] || "",
        location:      cols[8] || "",
        assetTag:      cols[9] || "",
        assignedUser:  cols[10] || "",
        status:        cols[11] || "Functional",
        remarks:       cols[12] || "",
      };

    case "Other ICT Hardware":
      return {
        deviceType, campus,
        officeType:    cols[2] || "",
        department:    cols[3] || "",
        userType:      cols[4] || "",
        yearPurchased: cols[5] || "",
        brand:         cols[6] || "",
        model:         cols[7] || "",
        voltage:       cols[8] || "",
        assetTag:      cols[9] || "",
        assignedUser:  cols[10] || "",
        status:        cols[11] || "Functional",
        remarks:       cols[12] || "",
      };

    default:
      // Specialized, Wearable, Embedded, Security, BYOD, Peripheral
      return {
        deviceType, campus,
        officeType:    cols[2] || "",
        department:    cols[3] || "",
        userType:      cols[4] || "",
        yearPurchased: cols[5] || "",
        brand:         cols[6] || "",
        model:         cols[7] || "",
        assetTag:      cols[8] || "",
        assignedUser:  cols[9] || "",
        status:        cols[10] || "Functional",
        remarks:       cols[11] || "",
      };
  }
}

/**
 * Convert a raw CSV text into inventory item objects.
 */
export function parseSheetCSV(csvText, tabName, startId = 1) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];

  const dataRows = lines.slice(1);
  let idCounter = startId;

  return dataRows
    .map((line, lineIndex) => {
      const cols = parseCSVRow(line);
      const deviceType = cols[0] || "";

      // Skip blank or pure-header rows
      if (!deviceType && !cols[1] && !cols[3]) return null;
      if (deviceType.toLowerCase() === "device type") return null;

      const fields = parseRow(cols, tabName);
      const currentId = idCounter++;

      return {
        id: currentId,
        // sheetRow: actual 1-based row in THIS tab's Google Sheet
        // lineIndex 0 = data row 2 (row 1 is the header)
        sheetRow:     lineIndex + 2,
        sheetTab:     tabName,
        category:     tabName,
        tabCategory:  tabName,
        name:         fields.deviceType,
        ...fields,
        quantity:     1,
        serialNumber: fields.assetTag || `ROW-${currentId}`,
        dateAdded:    fields.yearPurchased ? `${fields.yearPurchased}-01-01` : "",
        notes:        fields.remarks || "",
      };
    })
    .filter(Boolean);
}

const SPREADSHEET_ID = "1D3-mLBlTAmJVOVgjspEY1w5kbVPrerSZALkyPY_C5UQ";

async function fetchTabCSV(gid) {
  // 1. Try local proxy / Vercel serverless function route first
  try {
    const res = await fetch(`/api/sheet-csv?gid=${gid}`);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 0 && !text.trim().startsWith("<!DOCTYPE")) {
        return text;
      }
    }
  } catch (_) {}

  // 2. Direct fallback to Google Sheets CSV export URL
  try {
    const directUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
    const res = await fetch(directUrl);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 0 && !text.trim().startsWith("<!DOCTYPE")) {
        return text;
      }
    }
  } catch (_) {}

  return "";
}

const LOCAL_EDITS_KEY   = "ict_local_edits";
const LOCAL_ADDS_KEY    = "ict_local_adds";
const LOCAL_DELETES_KEY = "ict_local_deletes";

function getStoredJSON(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setStoredJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

export function useSheetInventory() {
  const [inventory, setInventory]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const fetchSheet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const requests = SHEET_TABS.map((tab) =>
        fetchTabCSV(tab.gid).then((text) => ({ tab, text }))
      );

      const results = await Promise.all(requests);
      let combined = [];
      let currentId = 1;

      for (const { tab, text } of results) {
        if (text) {
          const items = parseSheetCSV(text, tab.name, currentId);
          combined = combined.concat(items);
          currentId += items.length;
        }
      }

      if (combined.length === 0) throw new Error("No data returned from Google Sheets.");

      // Retrieve local overrides from localStorage
      const localEdits   = getStoredJSON(LOCAL_EDITS_KEY, {});
      const localDeletes = new Set(getStoredJSON(LOCAL_DELETES_KEY, []));
      const localAdds    = getStoredJSON(LOCAL_ADDS_KEY, []);

      // 1. Filter out deleted items & apply local edits
      let merged = combined
        .filter((item) => !localDeletes.has(item.id))
        .map((item) => {
          if (localEdits[item.id]) {
            return { ...item, ...localEdits[item.id] };
          }
          return item;
        });

      // 2. Prepend locally added items
      merged = [...localAdds, ...merged];

      setInventory(merged);
      setLastSynced(new Date());
    } catch (err) {
      setError(err.message || "Failed to load sheet data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  const updateItem = useCallback((id, updates) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    // Save to localStorage persistence
    const localEdits = getStoredJSON(LOCAL_EDITS_KEY, {});
    localEdits[id] = { ...(localEdits[id] || {}), ...updates };
    setStoredJSON(LOCAL_EDITS_KEY, localEdits);
  }, []);

  const deleteItem = useCallback((id) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));

    // Save delete to localStorage persistence
    const localDeletes = getStoredJSON(LOCAL_DELETES_KEY, []);
    if (!localDeletes.includes(id)) {
      localDeletes.push(id);
      setStoredJSON(LOCAL_DELETES_KEY, localDeletes);
    }
  }, []);

  const addItem = useCallback((item) => {
    const newItem = { ...item, id: Date.now(), quantity: 1 };
    setInventory((prev) => [newItem, ...prev]);

    // Save addition to localStorage persistence
    const localAdds = getStoredJSON(LOCAL_ADDS_KEY, []);
    localAdds.unshift(newItem);
    setStoredJSON(LOCAL_ADDS_KEY, localAdds);

    return newItem;
  }, []);

  return { inventory, loading, error, lastSynced, refetch: fetchSheet, addItem, updateItem, deleteItem };
}

