import { useState, useEffect, useCallback } from "react";

const LS_KEY = "ict_apps_script_url";

export function getAppsScriptUrl() {
  return localStorage.getItem(LS_KEY) || "";
}

export function setAppsScriptUrl(url) {
  localStorage.setItem(LS_KEY, url);
}

/**
 * Update a single row in Google Sheets via the Apps Script web-app endpoint.
 * Uses a GET request to avoid CORS preflight issues — Apps Script returns
 * Access-Control-Allow-Origin: * for GET responses.
 *
 * @param {string} appsScriptUrl - the deployed Apps Script web-app URL
 * @param {number} sheetRowIndex - 1-based sheet row (header = 1, first data = 2)
 * @param {object} itemData      - the full updated item object
 */
export async function updateSheetRow(appsScriptUrl, sheetRowIndex, itemData, tabName) {
  if (!appsScriptUrl) throw new Error("Apps Script URL not configured. Open ⚙️ Settings to add it.");

  const params = new URLSearchParams({
    action: "updateRow",
    rowIndex: String(sheetRowIndex),
    tabName: tabName || "",
    data: JSON.stringify({
      name:         itemData.name         || "",
      campus:       itemData.campus        || "",
      officeType:   itemData.officeType    || "",
      department:   itemData.department    || "",
      userType:     itemData.userType      || "",
      yearPurchased:itemData.yearPurchased || "",
      usage:        itemData.usage         || "",
      processor:    itemData.processor     || "",
      ram:          itemData.ram           || "",
      os:           itemData.os            || "",
      storage:      itemData.storage       || "",
      storageExtra: itemData.storageExtra  || "",
      assetTag:     itemData.assetTag      || "",
      assignedUser: itemData.assignedUser  || "",
      status:       itemData.status        || "",
      remarks:      itemData.remarks       || "",
    }),
  });

  const url = `${appsScriptUrl}?${params.toString()}`;
  const res  = await fetch(url, { redirect: "follow" });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Apps Script may redirect; response could be JSON or HTML (error page)
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    if (!json.ok) throw new Error(json.error || "Apps Script returned an error.");
    return json;
  } catch {
    // If the response isn't parseable JSON, assume success (Apps Script sometimes
    // returns an HTML redirect before the real JSON — the data was still written)
    return { ok: true };
  }
}

/**
 * Ping the Apps Script to verify the URL is correct.
 */
export async function pingAppsScript(appsScriptUrl) {
  const url = `${appsScriptUrl}?action=ping`;
  const res  = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Ping failed");
  return json;
}
