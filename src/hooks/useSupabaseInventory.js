import { useCallback, useEffect, useState } from "react";
import { supabase, hasSupabaseConfig, SUPABASE_TABLE, isSupabaseAdmin } from "../lib/supabase";
import { getAppsScriptUrl, updateSheetRow, insertSheetRow, deleteSheetRow } from "./useAppsScript";

const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || "1D3-mLBlTAmJVOVgjspEY1w5kbVPrerSZALkyPY_C5UQ";

const SHEET_TABS = [
  { name: "Computing Devices", gid: "0" },
  { name: "Storage Devices", gid: "1016225010" },
  { name: "Networking Equipment", gid: "2145514340" },
  { name: "Input Devices", gid: "702434542" },
  { name: "Output Devices", gid: "1440195529" },
  { name: "Peripheral Devices", gid: "218018862" },
  { name: "Communication Devices", gid: "112412964" },
  { name: "Other ICT Hardware", gid: "1057208702" },
  { name: "Specialized Devices", gid: "1544307167" },
  { name: "Wearable Devices", gid: "1381636888" },
  { name: "Embedded Systems", gid: "1042856241" },
  { name: "Security Devices", gid: "748502813" },
  { name: "BYOD / Personal", gid: "1674181719" },
];

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

function parseRow(cols, tabName) {
  const deviceType = cols[0] || tabName;
  const campus = cols[1] || "";

  switch (tabName) {
    case "Computing Devices":
      return {
        deviceType,
        campus,
        officeType: cols[2] || "",
        department: cols[3] || "",
        userType: cols[4] || "",
        yearPurchased: cols[5] || "",
        usage: cols[6] || "",
        processor: cols[7] || "",
        ram: cols[8] || "",
        os: cols[9] || "",
        storage: cols[10] || "",
        storageExtra: cols[11] || "",
        assetTag: cols[12] || "",
        assignedUser: cols[13] || "",
        status: cols[14] || "Functional",
        remarks: cols[15] || "",
      };
    case "Storage Devices":
      return {
        deviceType,
        campus,
        officeType: cols[2] || "",
        department: cols[3] || "",
        userType: cols[4] || "",
        yearPurchased: cols[5] || "",
        specs: cols[6] || "",
        storage: cols[7] || "",
        assetTag: cols[8] || "",
        assignedUser: cols[9] || "",
        status: cols[10] || "Functional",
        remarks: cols[11] || "",
      };
    case "Networking Equipment":
      return {
        deviceType,
        campus,
        officeType: cols[2] || "",
        department: cols[3] || "",
        building: cols[4] || "",
        room: cols[5] || "",
        userType: cols[6] || "",
        brand: cols[7] || "",
        model: cols[8] || "",
        yearPurchased: cols[9] || "",
        mac: cols[10] || "",
        assetTag: cols[11] || "",
        deviceName: cols[12] || "",
        status: cols[13] || "Functional",
        remarks: cols[14] || "",
      };
    case "Input Devices":
      return {
        deviceType,
        campus,
        officeType: cols[2] || "",
        department: cols[3] || "",
        userType: cols[4] || "",
        yearPurchased: cols[5] || "",
        brand: cols[6] || "",
        assetTag: cols[7] || "",
        assignedUser: cols[8] || "",
        status: cols[9] || "Functional",
        remarks: cols[10] || "",
      };
    case "Output Devices":
      return {
        deviceType,
        campus,
        officeType: cols[2] || "",
        department: cols[3] || "",
        userType: cols[4] || "",
        yearPurchased: cols[5] || "",
        brand: cols[6] || "",
        model: cols[7] || "",
        size: cols[8] || "",
        assetTag: cols[9] || "",
        assignedUser: cols[10] || "",
        status: cols[11] || "Functional",
        remarks: cols[12] || "",
      };
    case "Communication Devices":
      return {
        deviceType,
        campus,
        officeType: cols[2] || "",
        department: cols[3] || "",
        userType: cols[4] || "",
        brand: cols[5] || "",
        model: cols[6] || "",
        yearPurchased: cols[7] || "",
        location: cols[8] || "",
        assetTag: cols[9] || "",
        assignedUser: cols[10] || "",
        status: cols[11] || "Functional",
        remarks: cols[12] || "",
      };
    case "Other ICT Hardware":
      return {
        deviceType,
        campus,
        officeType: cols[2] || "",
        department: cols[3] || "",
        userType: cols[4] || "",
        yearPurchased: cols[5] || "",
        brand: cols[6] || "",
        model: cols[7] || "",
        voltage: cols[8] || "",
        assetTag: cols[9] || "",
        assignedUser: cols[10] || "",
        status: cols[11] || "Functional",
        remarks: cols[12] || "",
      };
    default:
      return {
        deviceType,
        campus,
        officeType: cols[2] || "",
        department: cols[3] || "",
        userType: cols[4] || "",
        yearPurchased: cols[5] || "",
        brand: cols[6] || "",
        model: cols[7] || "",
        assetTag: cols[8] || "",
        assignedUser: cols[9] || "",
        status: cols[10] || "Functional",
        remarks: cols[11] || "",
      };
  }
}

function parseSheetCSV(csvText, tabName, startId = 1) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  const dataRows = lines.slice(1);
  let idCounter = startId;

  return dataRows
    .map((line, lineIndex) => {
      const cols = parseCSVRow(line);
      const deviceType = cols[0] || "";

      if (!deviceType && !cols[1] && !cols[3]) return null;
      if (deviceType.toLowerCase() === "device type") return null;

      const fields = parseRow(cols, tabName);
      const currentId = idCounter++;

      return {
        id: currentId,
        sheetRow: lineIndex + 2,
        sheetTab: tabName,
        category: tabName,
        tabCategory: tabName,
        name: fields.deviceType,
        ...fields,
        quantity: 1,
        serialNumber: fields.assetTag || `ROW-${currentId}`,
        dateAdded: fields.yearPurchased ? `${fields.yearPurchased}-01-01` : "",
        notes: fields.remarks || "",
        source: "google_sheet",
      };
    })
    .filter(Boolean);
}

async function fetchTabCSV(gid) {
  try {
    const directUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
    const response = await fetch(directUrl);
    if (!response.ok) {
      return "";
    }
    const text = await response.text();
    return text && text.trim().startsWith("<!DOCTYPE") ? "" : text;
  } catch {
    try {
      const proxy = await fetch(`/api/sheet-csv?gid=${gid}`);
      if (!proxy.ok) return "";
      const text = await proxy.text();
      return text && text.trim().startsWith("<!DOCTYPE") ? "" : text;
    } catch {
      return "";
    }
  }
}

function mapDbRowToItem(row) {
  return {
    id: row.id,
    name: row.name || row.device_type || "",
    category: row.category || row.tab_category || "",
    tabCategory: row.tab_category || row.category || "",
    deviceType: row.device_type || row.name || "",
    campus: row.campus || "",
    officeType: row.office_type || "",
    department: row.department || "",
    userType: row.user_type || "",
    yearPurchased: row.year_purchased || "",
    usage: row.usage || "",
    processor: row.processor || "",
    ram: row.ram || "",
    os: row.os || "",
    storage: row.storage || "",
    storageExtra: row.storage_extra || "",
    assetTag: row.asset_tag || "",
    assignedUser: row.assigned_user || "",
    status: row.status || "Functional",
    remarks: row.remarks || "",
    quantity: row.quantity || 1,
    serialNumber: row.serial_number || row.asset_tag || `ITEM-${row.id}`,
    dateAdded: row.date_added || "",
    notes: row.notes || "",
    sheetRow: row.sheet_row || null,
    sheetTab: row.sheet_tab || row.category || null,
    source: row.source || "supabase",
  };
}

function mapItemToDb(item) {
  return {
    id: item.id,
    name: item.name || item.deviceType || "",
    category: item.category || item.tabCategory || "",
    tab_category: item.tabCategory || item.category || "",
    device_type: item.deviceType || item.name || "",
    campus: item.campus || "",
    office_type: item.officeType || "",
    department: item.department || "",
    user_type: item.userType || "",
    year_purchased: item.yearPurchased || "",
    usage: item.usage || "",
    processor: item.processor || "",
    ram: item.ram || "",
    os: item.os || "",
    storage: item.storage || "",
    storage_extra: item.storageExtra || "",
    asset_tag: item.assetTag || "",
    assigned_user: item.assignedUser || "",
    status: item.status || "Functional",
    remarks: item.remarks || "",
    quantity: item.quantity || 1,
    serial_number: item.serialNumber || item.assetTag || `ITEM-${item.id}`,
    date_added: item.dateAdded || "",
    notes: item.notes || "",
    sheet_row: item.sheetRow || null,
    sheet_tab: item.sheetTab || item.category || null,
    source: item.source || "manual",
  };
}

function getLocalStorageJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function syncItemToGoogleSheets(item) {
  const appsScriptUrl = getAppsScriptUrl();
  if (!appsScriptUrl) {
    return;
  }

  const sheetRowIndex = item.sheetRow;
  const tabName = item.sheetTab || item.tabCategory || item.category;

  if (!sheetRowIndex || !tabName) {
    if (tabName) {
      const result = await insertSheetRow(appsScriptUrl, item, tabName);
      return result;
    }
    return;
  }

  return updateSheetRow(appsScriptUrl, sheetRowIndex, item, tabName);
}

export function useSupabaseInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const syncGoogleSheetsToSupabase = useCallback(async () => {
    if (!supabase) {
      return false;
    }

    const requests = SHEET_TABS.map((tab) => fetchTabCSV(tab.gid).then((text) => ({ tab, text })));
    const results = await Promise.all(requests);

    const combined = [];
    let currentId = 1;

    for (const { tab, text } of results) {
      if (text) {
        const items = parseSheetCSV(text, tab.name, currentId);
        combined.push(...items);
        currentId += items.length;
      }
    }

    const rows = combined.map((item) => mapItemToDb(item));

    if (rows.length === 0) {
      throw new Error("No data returned from Google Sheets.");
    }

    const dedupedRows = [];
    const seenSheetKeys = new Set();

    for (const row of rows) {
      if (row.sheet_tab && row.sheet_row) {
        const key = `${row.sheet_tab}::${row.sheet_row}`;
        if (seenSheetKeys.has(key)) {
          continue;
        }
        seenSheetKeys.add(key);
      }
      dedupedRows.push(row);
    }

    const { error: upsertError } = await supabase
      .from(SUPABASE_TABLE)
      .upsert(dedupedRows, { onConflict: "sheet_tab,sheet_row" });

    if (upsertError) {
      throw upsertError;
    }

    setLastSynced(new Date());
    return true;
  }, []);

  const loadFromSupabase = useCallback(async () => {
    if (!supabase) {
      return false;
    }

    const { data, error: loadError } = await supabase
      .from(SUPABASE_TABLE)
      .select("*")
      .order("updated_at", { ascending: false });

    if (loadError) {
      throw loadError;
    }

    const nextItems = (data || []).map(mapDbRowToItem);
    setInventory(nextItems);
    setLastSynced(new Date());
    return true;
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (hasSupabaseConfig && supabase) {
        try {
          await syncGoogleSheetsToSupabase();
        } catch (syncError) {
          console.warn("Supabase sheet sync failed, falling back to saved inventory data.", syncError);
        }

        try {
          await loadFromSupabase();
        } catch (loadError) {
          throw loadError;
        }
      } else {
        setInventory(getLocalStorageJSON("ict_inventory_data", []));
      }
    } catch (err) {
      setError(err.message || "Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  }, [loadFromSupabase, syncGoogleSheetsToSupabase]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addItem = useCallback(async (item) => {
    const newItem = {
      ...item,
      id: Date.now(),
      quantity: 1,
      source: "manual",
      dateAdded: new Date().toISOString().split("T")[0],
      serialNumber: item.serialNumber || `ICT-${Date.now()}`,
    };

    const isAdmin = await isSupabaseAdmin();
    if (supabase && isAdmin) {
      const { data, error: insertError } = await supabase
        .from(SUPABASE_TABLE)
        .upsert([mapItemToDb(newItem)], { onConflict: "id" })
        .select();

      if (insertError) {
        throw insertError;
      }

      const saved = (data || [newItem]).map(mapDbRowToItem)[0];
      setInventory((prev) => [saved, ...prev]);

      try {
        if (getAppsScriptUrl()) {
          await syncItemToGoogleSheets(saved);
        }
      } catch {
        // Ignore sheet sync failures; Supabase remains the source of truth.
      }

      return saved;
    }

    try {
      await syncItemToGoogleSheets({ ...newItem, sheetTab: newItem.category || item.category });
    } catch {
      // Ignore sheet sync failures here; the UI still keeps the local state for client-side edits.
    }

    setInventory((prev) => [newItem, ...prev]);
    localStorage.setItem("ict_inventory_data", JSON.stringify([newItem, ...getLocalStorageJSON("ict_inventory_data", [])]));
    return newItem;
  }, []);

  const updateItem = useCallback(async (id, updates) => {
    const nextItem = { id, ...updates };
    const isAdmin = await isSupabaseAdmin();

    if (supabase && isAdmin) {
      const { error: updateError } = await supabase
        .from(SUPABASE_TABLE)
        .update(mapItemToDb(nextItem))
        .eq("id", id);

      if (updateError) {
        throw updateError;
      }

      const currentItem = inventory.find((item) => item.id === id);
      try {
        if (getAppsScriptUrl() && currentItem) {
          await syncItemToGoogleSheets({ ...currentItem, ...updates, id });
        }
      } catch {
        // Ignore Apps Script sync failures; the database is still the primary store.
      }
    } else {
      try {
        const currentItem = inventory.find((item) => item.id === id);
        await syncItemToGoogleSheets({ ...currentItem, ...updates, id });
      } catch {
        // Ignore sheet sync failures so the app remains usable without a configured Apps Script endpoint.
      }
    }

    setInventory((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    return nextItem;
  }, [inventory]);

  const deleteItem = useCallback(async (id) => {
    const isAdmin = await isSupabaseAdmin();

    if (supabase && isAdmin) {
      const { error: deleteError } = await supabase.from(SUPABASE_TABLE).delete().eq("id", id);
      if (deleteError) {
        throw deleteError;
      }

      const item = inventory.find((entry) => entry.id === id);
      if (item && getAppsScriptUrl()) {
        try {
          await deleteSheetRow(getAppsScriptUrl(), item.sheetRow, item.sheetTab || item.tabCategory || item.category);
        } catch {
          // ignore write-back delete failure; local UI still removes item from the view
        }
      }
    }

    setInventory((prev) => prev.filter((item) => item.id !== id));
  }, [inventory]);

  return {
    inventory,
    loading,
    error,
    lastSynced,
    refetch,
    addItem,
    updateItem,
    deleteItem,
    syncGoogleSheetsToSupabase,
  };
}
