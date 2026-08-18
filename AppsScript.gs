/**
 * Google Apps Script for ICT Hardware Inventory 2-Way Sync
 *
 * Instructions:
 * 1. Open your Google Sheet → Extensions → Apps Script.
 * 2. Delete all existing code in Code.gs and paste this entire file.
 * 3. Click Save (Ctrl+S).
 * 4. Click Deploy → New Deployment.
 *    - Type: Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web App URL (ends with /exec) and paste it into ⚙️ Settings.
 */

function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = params.action;

    // ── Ping / health check ──────────────────────────────────────────────────
    if (action === "ping") {
      return responseJSON({ ok: true, message: "Apps Script is online and operational!" });
    }

    // ── Update a specific row in a specific tab ──────────────────────────────
    if (action === "updateRow") {
      var rowIndex = parseInt(params.rowIndex, 10);
      var tabName  = params.tabName || "";
      var rawData  = params.data;

      if (!rowIndex || isNaN(rowIndex)) {
        return responseJSON({ ok: false, error: "Invalid or missing rowIndex." });
      }

      if (!rawData) {
        return responseJSON({ ok: false, error: "Missing data payload." });
      }

      var data = JSON.parse(rawData);
      var ss   = SpreadsheetApp.getActiveSpreadsheet();

      // Always target the specific tab by name — never rely on getActiveSheet()
      // because the user may have a different tab open in Google Sheets.
      var sheet;
      if (tabName) {
        sheet = ss.getSheetByName(tabName);
        if (!sheet) {
          return responseJSON({ ok: false, error: "Sheet tab '" + tabName + "' not found in the spreadsheet." });
        }
      } else {
        // Fallback: use active sheet (less reliable — only for backward compat)
        sheet = ss.getActiveSheet();
      }

      // Validate row bounds
      var lastRow = sheet.getLastRow();
      if (rowIndex < 2 || rowIndex > lastRow) {
        return responseJSON({
          ok: false,
          error: "Row " + rowIndex + " is out of bounds for tab '" + (tabName || sheet.getName()) + "' (last row: " + lastRow + ")."
        });
      }

      // ── Column mapping (1-based) ─────────────────────────────────────────
      // Col 1:  Device Type      Col 9:  RAM
      // Col 2:  Campus           Col 10: OS
      // Col 3:  Office Type      Col 11: Storage (Primary)
      // Col 4:  Department       Col 12: Extra Disk
      // Col 5:  User Type        Col 13: Asset Tag
      // Col 6:  Year Purchased   Col 14: Assigned User
      // Col 7:  Usage            Col 15: Status
      // Col 8:  Processor        Col 16: Remarks
      if (data.name         !== undefined) sheet.getRange(rowIndex, 1).setValue(data.name);
      if (data.campus       !== undefined) sheet.getRange(rowIndex, 2).setValue(data.campus);
      if (data.officeType   !== undefined) sheet.getRange(rowIndex, 3).setValue(data.officeType);
      if (data.department   !== undefined) sheet.getRange(rowIndex, 4).setValue(data.department);
      if (data.userType     !== undefined) sheet.getRange(rowIndex, 5).setValue(data.userType);
      if (data.yearPurchased!== undefined) sheet.getRange(rowIndex, 6).setValue(data.yearPurchased);
      if (data.usage        !== undefined) sheet.getRange(rowIndex, 7).setValue(data.usage);
      if (data.processor    !== undefined) sheet.getRange(rowIndex, 8).setValue(data.processor);
      if (data.ram          !== undefined) sheet.getRange(rowIndex, 9).setValue(data.ram);
      if (data.os           !== undefined) sheet.getRange(rowIndex, 10).setValue(data.os);
      if (data.storage      !== undefined) sheet.getRange(rowIndex, 11).setValue(data.storage);
      if (data.storageExtra !== undefined) sheet.getRange(rowIndex, 12).setValue(data.storageExtra);
      if (data.assetTag     !== undefined) sheet.getRange(rowIndex, 13).setValue(data.assetTag);
      if (data.assignedUser !== undefined) sheet.getRange(rowIndex, 14).setValue(data.assignedUser);
      if (data.status       !== undefined) sheet.getRange(rowIndex, 15).setValue(data.status);
      if (data.remarks      !== undefined) sheet.getRange(rowIndex, 16).setValue(data.remarks);

      return responseJSON({
        ok: true,
        message: "Row " + rowIndex + " in '" + sheet.getName() + "' updated successfully."
      });
    }

    return responseJSON({ ok: false, error: "Unknown action: " + action });

  } catch (err) {
    return responseJSON({ ok: false, error: err.toString() });
  }
}

function responseJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
