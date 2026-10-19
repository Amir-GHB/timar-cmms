/**
 * Production-ready Google Apps Script backend code (`Code.gs`)
 * Users paste this into Google Sheets -> Extensions -> Apps Script.
 */

export const APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * TIMAR CMMS - WATER TREATMENT PLANT
 * Google Apps Script Cloud Database API
 * ============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets (https://sheets.new).
 * 2. Go to: Extensions > Apps Script.
 * 3. Replace all code in Code.gs with this entire file.
 * 4. In the Apps Script toolbar, select the "setupSheets" function and click "Run".
 *    (Accept the permission prompt; this initializes your 6 relational database sheets).
 * 5. Click "Deploy" (top right) > "New deployment".
 * 6. Select type: "Web app".
 * 7. Set:
 *    - Description: "Timar CMMS Web API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (allows your PWA client to communicate with CORS)
 * 8. Click "Deploy", copy the Web App URL (starts with https://script.google.com/macros/s/...)
 * 9. Paste that URL into the Timar PWA Settings > Google Apps Script Cloud Sync.
 * ============================================================================
 */

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var schemas = {
    "Users": [
      "id", "username", "password", "fullName", "role", "department", "isActive", "updatedAt"
    ],
    "Assets": [
      "id", "name", "code", "parentId", "category", "status", "serialNumber",
      "model", "manufacturer", "location", "capacitySpecs", "installDate",
      "operatingHours", "notes", "updatedAt", "isDeleted"
    ],
    "SubAssets": [
      "id", "assetId", "name", "partNumber", "serialNumber", "status", "notes", "updatedAt", "isDeleted"
    ],
    "Events": [
      "id", "assetId", "assetName", "assetCode", "title", "type", "status",
      "date", "technicianId", "technicianName", "durationHours", "description",
      "solution", "partsUsedJson", "downtimeHours", "approvedBy", "approvalNotes",
      "approvalDate", "updatedAt", "isDeleted"
    ],
    "Schedules": [
      "id", "assetId", "assetName", "assetCode", "taskTitle", "description",
      "intervalType", "intervalValue", "lastPerformedDate", "nextDueDate",
      "dueOperatingHours", "status", "assignedRole", "updatedAt", "isDeleted"
    ],
    "Inventory": [
      "id", "partName", "partNumber", "category", "quantityInStock", "unit",
      "minThreshold", "unitCost", "shelfLocation", "supplier", "updatedAt", "isDeleted"
    ],
    "SyncLog": [
      "timestamp", "clientUser", "action", "recordsProcessed", "status"
    ]
  };

  for (var sheetName in schemas) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    var headers = schemas[sheetName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }

  // Pre-seed default manager & technician if Users sheet is empty
  var usersSheet = ss.getSheetByName("Users");
  if (usersSheet.getLastRow() <= 1) {
    var now = new Date().getTime();
    usersSheet.appendRow([
      "usr-1", "manager", "admin123", "Eng. Reza Mohammadi", "manager", "Operations & Engineering", true, now
    ]);
    usersSheet.appendRow([
      "usr-2", "tech1", "tech123", "Ali Karimi", "technician", "Mechanical Maintenance", true, now
    ]);
    usersSheet.appendRow([
      "usr-3", "tech2", "tech123", "Sara Tehrani", "technician", "Electrical & Instrumentation", true, now
    ]);
  }

  Logger.log("Timar CMMS database sheets initialized successfully.");
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";
  var since = (e && e.parameter && e.parameter.since) ? parseInt(e.parameter.since, 10) : 0;
  
  if (action === "ping") {
    return jsonResponse({
      status: "ok",
      system: "Timar CMMS Water Treatment Plant Cloud API",
      timestamp: new Date().getTime()
    });
  }

  if (action === "syncPull") {
    return jsonResponse(pullDeltaChanges(since));
  }

  return jsonResponse({ error: "Unknown action" });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // 30-second lock to prevent race conditions during concurrent technician syncs
    lock.waitLock(30000);
  } catch (err) {
    return jsonResponse({ error: "Server busy, lock timeout. Please retry." });
  }

  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    if (action === "login") {
      var authResult = authenticateUser(payload.username, payload.password);
      return jsonResponse(authResult);
    }

    if (action === "syncPush") {
      var pushResult = applyMutations(payload.mutations || [], payload.clientUser || "Unknown");
      return jsonResponse(pushResult);
    }

    if (action === "syncFull") {
      // Handles both push and pull in one roundtrip
      var pushRes = applyMutations(payload.mutations || [], payload.clientUser || "Unknown");
      var delta = pullDeltaChanges(payload.sinceTimestamp || 0);
      return jsonResponse({
        push: pushRes,
        pull: delta,
        serverTimestamp: new Date().getTime()
      });
    }

    return jsonResponse({ error: "Invalid action" });
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function authenticateUser(username, password) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, message: "Users table not found" };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[1]).toLowerCase() === String(username).toLowerCase().trim()) {
      if (String(row[2]) === String(password).trim()) {
        if (!row[6]) return { success: false, message: "Account is disabled" };
        return {
          success: true,
          user: {
            id: row[0],
            username: row[1],
            fullName: row[3],
            role: row[4],
            department: row[5],
            isActive: row[6],
            updatedAt: row[7]
          }
        };
      } else {
        return { success: false, message: "Invalid password" };
      }
    }
  }
  return { success: false, message: "User not found" };
}

function pullDeltaChanges(sinceTimestamp) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tables = ["Users", "Assets", "SubAssets", "Events", "Schedules", "Inventory"];
  var result = {
    serverTimestamp: new Date().getTime(),
    entities: {}
  };

  for (var t = 0; t < tables.length; t++) {
    var sheetName = tables[t];
    var sheet = ss.getSheetByName(sheetName);
    var key = sheetName.toLowerCase();
    result.entities[key] = [];

    if (!sheet || sheet.getLastRow() <= 1) continue;

    var values = sheet.getDataRange().getValues();
    var headers = values[0];

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        var h = headers[c];
        var val = row[c];
        if (h === "partsUsedJson" && typeof val === "string") {
          try { obj["partsUsed"] = JSON.parse(val); } catch(e) { obj["partsUsed"] = []; }
        } else {
          obj[h] = val;
        }
      }
      var updatedAt = parseInt(obj.updatedAt, 10) || 0;
      if (updatedAt >= sinceTimestamp) {
        result.entities[key].push(obj);
      }
    }
  }

  return result;
}

function applyMutations(mutations, clientUser) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var processed = 0;

  var sheetMap = {
    "users": "Users",
    "assets": "Assets",
    "subassets": "SubAssets",
    "events": "Events",
    "schedules": "Schedules",
    "inventory": "Inventory"
  };

  for (var m = 0; m < mutations.length; m++) {
    var mut = mutations[m];
    var sheetName = sheetMap[mut.entityType];
    if (!sheetName) continue;

    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rowIndex = -1;

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]) === String(mut.entityId)) {
        rowIndex = r + 1; // 1-indexed sheet row
        break;
      }
    }

    var rowValues = [];
    var recordData = mut.data || {};
    recordData.id = mut.entityId;
    recordData.updatedAt = mut.timestamp || new Date().getTime();
    if (mut.action === "delete") {
      recordData.isDeleted = true;
    }

    for (var c = 0; c < headers.length; c++) {
      var h = headers[c];
      if (h === "partsUsedJson") {
        rowValues.push(JSON.stringify(recordData.partsUsed || []));
      } else {
        rowValues.push(recordData[h] !== undefined ? recordData[h] : "");
      }
    }

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    processed++;
  }

  // Log sync event
  var logSheet = ss.getSheetByName("SyncLog");
  if (logSheet) {
    logSheet.appendRow([
      new Date(), clientUser, "syncPush", processed, "Success"
    ]);
  }

  return {
    success: true,
    processedCount: processed,
    serverTimestamp: new Date().getTime()
  };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
