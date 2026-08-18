/**
 * Google Apps Script for ICT Hardware Inventory 2-Way Sync
 * 
 * Instructions:
 * 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1D3-mLBlTAmJVOVgjspEY1w5kbVPrerSZALkyPY_C5UQ
 * 2. In the top menu, go to Extensions -> Apps Script.
 * 3. Delete any existing code in Code.gs and paste this entire code.
 * 4. Click Save (Ctrl+S).
 * 5. Click Deploy -> New Deployment.
 * 6. Select Type: "Web App".
 * 7. Set "Execute as": "Me".
 * 8. Set "Who has access": "Anyone".
 * 9. Click Deploy, authorize access, and copy the Web App URL (starts with https://script.google.com/macros/s/.../exec).
 * 10. Open the web app -> ⚙️ Settings -> Paste the Web App URL and test connection!
 */

function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = params.action;

    if (action === "ping") {
      return responseJSON({ ok: true, message: "Apps Script is online and operational!" });
    }

    if (action === "updateRow") {
      var rowIndex = parseInt(params.rowIndex, 10);
      var rawData = params.data;
      
      if (!rowIndex || isNaN(rowIndex)) {
        return responseJSON({ ok: false, error: "Invalid or missing rowIndex" });
      }
      
      if (!rawData) {
        return responseJSON({ ok: false, error: "Missing data payload" });
      }

      var data = JSON.parse(rawData);
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

      // Ensure the row index is within valid bounds
      if (rowIndex < 2 || rowIndex > sheet.getLastRow()) {
        return responseJSON({ ok: false, error: "Row index " + rowIndex + " out of bounds." });
      }

      // Column mapping (1-based column indices in Google Sheets):
      // Col 1:  Device Type
      // Col 2:  Campus
      // Col 3:  Office Type
      // Col 4:  Department
      // Col 5:  User Type
      // Col 6:  Year Purchased
      // Col 7:  Usage
      // Col 8:  Processor
      // Col 9:  RAM
      // Col 10: OS
      // Col 11: Storage
      // Col 12: Extra Disk
      // Col 13: Asset Tag
      // Col 14: Assigned User
      // Col 15: Status
      // Col 16: Remarks

      if (data.name !== undefined)          sheet.getRange(rowIndex, 1).setValue(data.name);
      if (data.campus !== undefined)        sheet.getRange(rowIndex, 2).setValue(data.campus);
      if (data.officeType !== undefined)    sheet.getRange(rowIndex, 3).setValue(data.officeType);
      if (data.department !== undefined)    sheet.getRange(rowIndex, 4).setValue(data.department);
      if (data.userType !== undefined)      sheet.getRange(rowIndex, 5).setValue(data.userType);
      if (data.yearPurchased !== undefined) sheet.getRange(rowIndex, 6).setValue(data.yearPurchased);
      if (data.usage !== undefined)         sheet.getRange(rowIndex, 7).setValue(data.usage);
      if (data.processor !== undefined)     sheet.getRange(rowIndex, 8).setValue(data.processor);
      if (data.ram !== undefined)           sheet.getRange(rowIndex, 9).setValue(data.ram);
      if (data.os !== undefined)            sheet.getRange(rowIndex, 10).setValue(data.os);
      if (data.storage !== undefined)       sheet.getRange(rowIndex, 11).setValue(data.storage);
      if (data.storageExtra !== undefined)  sheet.getRange(rowIndex, 12).setValue(data.storageExtra);
      if (data.assetTag !== undefined)      sheet.getRange(rowIndex, 13).setValue(data.assetTag);
      if (data.assignedUser !== undefined)  sheet.getRange(rowIndex, 14).setValue(data.assignedUser);
      if (data.status !== undefined)        sheet.getRange(rowIndex, 15).setValue(data.status);
      if (data.remarks !== undefined)       sheet.getRange(rowIndex, 16).setValue(data.remarks);

      return responseJSON({ ok: true, message: "Row " + rowIndex + " updated successfully." });
    }

    return responseJSON({ ok: false, error: "Unknown action specified: " + action });

  } catch (err) {
    return responseJSON({ ok: false, error: err.toString() });
  }
}

function responseJSON(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
