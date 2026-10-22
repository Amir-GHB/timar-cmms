/**
 * Production-ready Google Apps Script backend code (`Code.gs`)
 * Users paste this into Google Sheets -> Extensions -> Apps Script.
 */

export const APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * TIMAR CMMS - WATER TREATMENT PLANT
 * Google Apps Script Authoritative Cloud API & Scheduler
 * Timezone: Asia/Tehran
 * ============================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets (https://sheets.new).
 * 2. Go to: Extensions > Apps Script.
 * 3. Replace all code in Code.gs with this entire file.
 * 4. In the Apps Script toolbar, select the "setupSheets" function and click "Run".
 *    (Accept the Google permission prompt; this initializes or upgrades your relational sheets).
 * 5. (Optional) Run "setupDailyTrigger" in Apps Script toolbar to automatically check and
 *    generate due PM maintenance events daily at midnight Tehran time even when no user is online!
 * 6. Click "Deploy" (top right) > "New deployment".
 * 7. Select type: "Web app".
 * 8. Set:
 *    - Description: "Timar CMMS Web API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (allows your PWA client to communicate with CORS)
 * 9. Click "Deploy", copy the Web App URL (starts with https://script.google.com/macros/s/...)
 * 10. Paste that URL into Timar PWA Settings > Google Apps Script Cloud Sync.
 * ============================================================================
 */

var TEHRAN_TZ = "Asia/Tehran";

function getTehranDateString(dateObj) {
  var d = dateObj || new Date();
  return Utilities.formatDate(d, TEHRAN_TZ, "yyyy-MM-dd");
}

function calculateNextDueDate(baseDateStr, intervalType, intervalValue) {
  var parts = baseDateStr.split("-");
  var year = parseInt(parts[0], 10);
  var month = parseInt(parts[1], 10) - 1;
  var day = parseInt(parts[2], 10);
  var date = new Date(Date.UTC(year, month, day, 12, 0, 0));
  var val = Math.max(1, parseInt(intervalValue, 10) || 1);

  if (intervalType === "days") {
    date.setUTCDate(date.getUTCDate() + val);
  } else if (intervalType === "weeks") {
    date.setUTCDate(date.getUTCDate() + val * 7);
  } else if (intervalType === "months") {
    var origDay = date.getUTCDate();
    date.setUTCMonth(date.getUTCMonth() + val);
    if (date.getUTCDate() < origDay) {
      date.setUTCDate(0);
    }
  } else if (intervalType === "hours") {
    var daysEq = Math.max(1, Math.ceil(val / 24));
    date.setUTCDate(date.getUTCDate() + daysEq);
  }

  var y = date.getUTCFullYear();
  var m = ("0" + (date.getUTCMonth() + 1)).slice(-2);
  var d = ("0" + date.getUTCDate()).slice(-2);
  return y + "-" + m + "-" + d;
}

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var schemas = {
    "Users": [
      "id", "username", "password", "fullName", "role", "department", "isActive", "updatedAt"
    ],
    "Assets": [
      "id", "name", "code", "parentId", "category", "status", "serialNumber",
      "model", "manufacturer", "location", "capacitySpecs", "installDate",
      "operatingHours", "imageUrl", "notes", "updatedAt", "isDeleted"
    ],
    "SubAssets": [
      "id", "assetId", "name", "partNumber", "serialNumber", "status", "notes", "updatedAt", "isDeleted"
    ],
    "Events": [
      "id", "assetId", "assetName", "assetCode", "title", "type", "status",
      "date", "deadlineDate", "hasDeadline", "originatingScheduleId", "scheduleId",
      "scheduleOccurrenceDate", "affectedScheduleId", "isAutomatedPM", "sideEffectsApplied",
      "isProvisionalTime", "technicianId", "technicianName", "durationHours", "description",
      "solution", "partsUsedJson", "downtimeHours", "approvedBy", "approvalNotes",
      "approvalDate", "updatedAt", "isDeleted"
    ],
    "Schedules": [
      "id", "assetId", "assetName", "assetCode", "taskTitle", "description",
      "intervalType", "intervalValue", "lastPerformedDate", "nextDueDate", "lastGeneratedDueDate",
      "dueOperatingHours", "status", "assignedRole", "updatedAt", "isDeleted"
    ],
    "Inventory": [
      "id", "partName", "partNumber", "category", "quantityInStock", "unit",
      "minThreshold", "unitCost", "shelfLocation", "supplier", "compatibleAssetsJson",
      "updatedAt", "isDeleted"
    ],
    "SyncLog": [
      "timestamp", "clientUser", "action", "recordsProcessed", "status"
    ]
  };

  for (var sheetName in schemas) {
    var sheet = ss.getSheetByName(sheetName);
    var targetHeaders = schemas[sheetName];
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
      sheet.getRange(1, 1, 1, targetHeaders.length).setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    } else {
      // Non-destructive column upgrade: add missing headers to row 1
      var existingData = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
      var existingHeaders = [];
      for (var i = 0; i < existingData.length; i++) {
        if (existingData[i]) existingHeaders.push(String(existingData[i]));
      }
      for (var j = 0; j < targetHeaders.length; j++) {
        var col = targetHeaders[j];
        if (existingHeaders.indexOf(col) === -1) {
          var nextColIndex = sheet.getLastColumn() + 1;
          sheet.getRange(1, nextColIndex).setValue(col).setFontWeight("bold").setBackground("#0284c7").setFontColor("#ffffff");
        }
      }
      sheet.setFrozenRows(1);
    }
  }

  // Pre-seed default manager & technician if Users sheet is empty
  var usersSheet = ss.getSheetByName("Users");
  if (usersSheet.getLastRow() <= 1) {
    var now = new Date().getTime();
    usersSheet.appendRow([
      "usr-1", "manager", "admin123", "مهندس رضا محمدی", "manager", "مدیریت فنی و مهندسی تصفیه‌خانه", true, now
    ]);
    usersSheet.appendRow([
      "usr-2", "tech1", "tech123", "علی کریمی", "technician", "واحد تعمیرات مکانیک", true, now
    ]);
    usersSheet.appendRow([
      "usr-3", "tech2", "tech123", "سارا تهرانی", "technician", "واحد برق و ابزار دقیق", true, now
    ]);
  }

  Logger.log("Timar CMMS sheets initialized / upgraded successfully.");
}

function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "processDueSchedules") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("processDueSchedules")
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .inTimezone(TEHRAN_TZ)
    .create();
  Logger.log("Daily midnight Tehran automated schedule trigger installed.");
}

/**
 * Authoritative Backend Schedule Processor
 * Evaluates active schedules against Tehran calendar date and generates due PM events.
 * Safe against duplicates and does not advance the schedule until maintenance completion.
 */
function processDueSchedules() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var schedSheet = ss.getSheetByName("Schedules");
  var evtSheet = ss.getSheetByName("Events");
  if (!schedSheet || !evtSheet) return { generatedCount: 0 };

  var schedValues = schedSheet.getDataRange().getValues();
  if (schedValues.length <= 1) return { generatedCount: 0 };
  var schedHeaders = schedValues[0];
  var schedColMap = {};
  for (var c = 0; c < schedHeaders.length; c++) schedColMap[schedHeaders[c]] = c;

  var evtValues = evtSheet.getDataRange().getValues();
  var evtHeaders = evtValues[0];
  var evtColMap = {};
  for (var e = 0; e < evtHeaders.length; e++) evtColMap[evtHeaders[e]] = e;

  var existingEventIds = {};
  for (var r = 1; r < evtValues.length; r++) {
    var idVal = String(evtValues[r][evtColMap["id"] || 0]);
    if (idVal) existingEventIds[idVal] = true;
  }

  var todayTehran = getTehranDateString(new Date());
  var nowMs = new Date().getTime();
  var generatedCount = 0;

  // 1. Reconcile Expired Manual Events -> 'missed'
  for (var r = 1; r < evtValues.length; r++) {
    var evtRow = evtValues[r];
    var isEvtDeleted = !!evtRow[evtColMap["isDeleted"]];
    if (isEvtDeleted) continue;

    var curStatus = String(evtRow[evtColMap["status"]]);
    if (curStatus !== "scheduled" && curStatus !== "in_progress") continue;

    var isAutomated = !!evtRow[evtColMap["isAutomatedPM"]];
    var hasDeadline = !!evtRow[evtColMap["hasDeadline"]];
    var deadlineDate = String(evtRow[evtColMap["deadlineDate"]] || evtRow[evtColMap["date"]] || "");

    if (!isAutomated && hasDeadline && deadlineDate && deadlineDate < todayTehran) {
      if (evtColMap["status"] !== undefined) {
        evtSheet.getRange(r + 1, evtColMap["status"] + 1).setValue("missed");
      }
      if (evtColMap["updatedAt"] !== undefined) {
        evtSheet.getRange(r + 1, evtColMap["updatedAt"] + 1).setValue(nowMs);
      }
      evtRow[evtColMap["status"]] = "missed";
    }
  }

  // 2. Reconcile Recurring Schedules and Occurrences
  for (var s = 1; s < schedValues.length; s++) {
    var row = schedValues[s];
    var isDeleted = !!row[schedColMap["isDeleted"]];
    var status = String(row[schedColMap["status"]]);
    if (isDeleted || status === "paused") continue;

    var schId = String(row[schedColMap["id"]]);
    var nextDueDate = String(row[schedColMap["nextDueDate"]]);
    if (!nextDueDate) continue;

    var intervalType = String(row[schedColMap["intervalType"]] || "months");
    var intervalValue = parseInt(row[schedColMap["intervalValue"]], 10) || 1;

    var scheduleRowIndex = s + 1; // 1-based
    var scheduleUpdated = false;

    // Check if the previous occurrence's window has expired because next interval arrived
    var subsequentIntervalDate = calculateNextDueDate(nextDueDate, intervalType, intervalValue);
    if (todayTehran >= subsequentIntervalDate) {
      var prevDeterministicId = "evt-pm-" + schId + "-" + nextDueDate;
      for (var er = 1; er < evtValues.length; er++) {
        var eRow = evtValues[er];
        if (!!eRow[evtColMap["isDeleted"]]) continue;
        var rowId = String(eRow[evtColMap["id"]]);
        var rowOrigSch = String(eRow[evtColMap["originatingScheduleId"]]);
        var rowOcc = String(eRow[evtColMap["scheduleOccurrenceDate"]]);

        if ((rowOrigSch === schId || rowId === prevDeterministicId) && rowOcc === nextDueDate) {
          var eStatus = String(eRow[evtColMap["status"]]);
          if (eStatus === "scheduled" || eStatus === "in_progress") {
            if (evtColMap["status"] !== undefined) {
              evtSheet.getRange(er + 1, evtColMap["status"] + 1).setValue("missed");
            }
            if (evtColMap["updatedAt"] !== undefined) {
              evtSheet.getRange(er + 1, evtColMap["updatedAt"] + 1).setValue(nowMs);
            }
            eRow[evtColMap["status"]] = "missed";
          }
        }
      }

      // Advance schedule's nextDueDate to the subsequent interval
      nextDueDate = subsequentIntervalDate;
      if (schedColMap["nextDueDate"] !== undefined) {
        schedSheet.getRange(scheduleRowIndex, schedColMap["nextDueDate"] + 1).setValue(nextDueDate);
        scheduleUpdated = true;
      }
    }

    var isDue = nextDueDate <= todayTehran;
    var deterministicEventId = "evt-pm-" + schId + "-" + nextDueDate;

    // Check overdue status
    if (isDue && nextDueDate < todayTehran && status !== "overdue") {
      if (schedColMap["status"] !== undefined) {
        schedSheet.getRange(scheduleRowIndex, schedColMap["status"] + 1).setValue("overdue");
        scheduleUpdated = true;
      }
    } else if (!isDue && status === "overdue") {
      if (schedColMap["status"] !== undefined) {
        schedSheet.getRange(scheduleRowIndex, schedColMap["status"] + 1).setValue("active");
        scheduleUpdated = true;
      }
    }

    var lastGenDate = schedColMap["lastGeneratedDueDate"] !== undefined ? String(row[schedColMap["lastGeneratedDueDate"]] || "") : "";
    if (isDue && !existingEventIds[deterministicEventId] && lastGenDate !== nextDueDate) {
      // Build event row
      var newEventRow = [];
      var evtObj = {
        id: deterministicEventId,
        assetId: row[schedColMap["assetId"]],
        assetName: row[schedColMap["assetName"]],
        assetCode: row[schedColMap["assetCode"]],
        title: "سرویس دوره‌ای PM: " + row[schedColMap["taskTitle"]],
        type: "preventive",
        status: "scheduled",
        date: nextDueDate,
        deadlineDate: nextDueDate,
        hasDeadline: true,
        originatingScheduleId: schId,
        scheduleId: schId,
        scheduleOccurrenceDate: nextDueDate,
        affectedScheduleId: schId,
        isAutomatedPM: true,
        sideEffectsApplied: false,
        isProvisionalTime: false,
        technicianId: row[schedColMap["assignedRole"]] === "technician" ? "usr-2" : "usr-1",
        technicianName: row[schedColMap["assignedRole"]] === "technician" ? "واحد تعمیرات مکانیک" : "مدیر فنی",
        durationHours: 0,
        description: row[schedColMap["description"]] || "انجام بازرسی و سرویس دوره‌ای نت",
        solution: "",
        partsUsedJson: "[]",
        downtimeHours: 0,
        approvedBy: "",
        approvalNotes: "",
        approvalDate: "",
        updatedAt: nowMs,
        isDeleted: false
      };

      for (var ec = 0; ec < evtHeaders.length; ec++) {
        var hName = evtHeaders[ec];
        newEventRow.push(evtObj[hName] !== undefined ? evtObj[hName] : "");
      }

      evtSheet.appendRow(newEventRow);
      existingEventIds[deterministicEventId] = true;
      generatedCount++;

      // Update schedule's lastGeneratedDueDate without advancing nextDueDate!
      if (schedColMap["lastGeneratedDueDate"] !== undefined) {
        schedSheet.getRange(scheduleRowIndex, schedColMap["lastGeneratedDueDate"] + 1).setValue(nextDueDate);
        scheduleUpdated = true;
      }
    }

    if (scheduleUpdated && schedColMap["updatedAt"] !== undefined) {
      schedSheet.getRange(scheduleRowIndex, schedColMap["updatedAt"] + 1).setValue(nowMs);
    }
  }

  return { generatedCount: generatedCount };
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";
  var since = (e && e.parameter && e.parameter.since) ? parseInt(e.parameter.since, 10) : 0;
  
  if (action === "ping") {
    return jsonResponse({
      status: "ok",
      system: "Timar CMMS Water Treatment Plant Cloud API",
      tehranDate: getTehranDateString(new Date()),
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
      processDueSchedules();
      return jsonResponse(pushResult);
    }

    if (action === "syncFull") {
      var pushRes = applyMutations(payload.mutations || [], payload.clientUser || "Unknown");
      processDueSchedules();
      var delta = pullDeltaChanges(payload.sinceTimestamp || 0);
      return jsonResponse({
        push: pushRes,
        pull: delta,
        tehranDate: getTehranDateString(new Date()),
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
    tehranDate: getTehranDateString(new Date()),
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
        } else if (h === "compatibleAssetsJson" && typeof val === "string") {
          try { obj["compatibleAssets"] = JSON.parse(val); } catch(e) { obj["compatibleAssets"] = []; }
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
  var appliedIds = [];
  var serverNow = new Date().getTime();

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

    var recordData = mut.data || {};
    recordData.id = mut.entityId;
    recordData.updatedAt = serverNow; // Authoritative server timestamp

    if (mut.action === "delete") {
      recordData.isDeleted = true;
    }

    // Idempotent completion side effects handling on server
    if (mut.entityType === "events" && recordData.status === "completed") {
      var isAlreadyApplied = !!recordData.sideEffectsApplied;
      if (!isAlreadyApplied) {
        // Advance linked schedule if requested
        var targetScheduleId = recordData.affectedScheduleId || recordData.originatingScheduleId;
        if (targetScheduleId) {
          advanceScheduleOnServer(ss, targetScheduleId, recordData.date || getTehranDateString(new Date()), serverNow);
        }
        // Deduct inventory parts on server
        if (recordData.partsUsed && recordData.partsUsed.length > 0) {
          deductInventoryOnServer(ss, recordData.partsUsed, serverNow);
        }
        recordData.sideEffectsApplied = true;
      }
    }

    var rowValues = [];
    for (var c = 0; c < headers.length; c++) {
      var h = headers[c];
      if (h === "partsUsedJson") {
        rowValues.push(JSON.stringify(recordData.partsUsed || []));
      } else if (h === "compatibleAssetsJson") {
        rowValues.push(JSON.stringify(recordData.compatibleAssets || []));
      } else {
        rowValues.push(recordData[h] !== undefined ? recordData[h] : "");
      }
    }

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    appliedIds.push(mut.id);
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
    appliedIds: appliedIds,
    serverTimestamp: serverNow
  };
}

function advanceScheduleOnServer(ss, scheduleId, completionDateStr, serverNow) {
  var sheet = ss.getSheetByName("Schedules");
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colMap = {};
  for (var c = 0; c < headers.length; c++) colMap[headers[c]] = c;

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][colMap["id"]]) === String(scheduleId)) {
      var rowIdx = r + 1;
      var intervalType = data[r][colMap["intervalType"]];
      var intervalValue = data[r][colMap["intervalValue"]];
      var nextDate = calculateNextDueDate(completionDateStr, intervalType, intervalValue);

      if (colMap["lastPerformedDate"] !== undefined) sheet.getRange(rowIdx, colMap["lastPerformedDate"] + 1).setValue(completionDateStr);
      if (colMap["nextDueDate"] !== undefined) sheet.getRange(rowIdx, colMap["nextDueDate"] + 1).setValue(nextDate);
      if (colMap["status"] !== undefined) sheet.getRange(rowIdx, colMap["status"] + 1).setValue("active");
      if (colMap["updatedAt"] !== undefined) sheet.getRange(rowIdx, colMap["updatedAt"] + 1).setValue(serverNow);
      break;
    }
  }
}

function deductInventoryOnServer(ss, partsUsed, serverNow) {
  var sheet = ss.getSheetByName("Inventory");
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var colMap = {};
  for (var c = 0; c < headers.length; c++) colMap[headers[c]] = c;

  for (var p = 0; p < partsUsed.length; p++) {
    var pItem = partsUsed[p];
    var partId = pItem.storagePartId;
    var qtyUsed = parseInt(pItem.quantityUsed, 10) || 0;
    if (qtyUsed <= 0) continue;

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][colMap["id"]]) === String(partId)) {
        var currentQty = parseInt(data[r][colMap["quantityInStock"]], 10) || 0;
        var newQty = Math.max(0, currentQty - qtyUsed);
        sheet.getRange(r + 1, colMap["quantityInStock"] + 1).setValue(newQty);
        sheet.getRange(r + 1, colMap["updatedAt"] + 1).setValue(serverNow);
        break;
      }
    }
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
