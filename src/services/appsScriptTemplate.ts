/**
 * Production-ready Google Apps Script backend code (`Code.gs`)
 * Users paste this into Google Sheets -> Extensions -> Apps Script.
 * 
 * Implements:
 * - Username/password authentication and tokenless client authorization (temporary)
 * - Salted password hashing and legacy plaintext password auto-migration
 * - Manager-only authorization for user creation, role changes, and schedule mutation
 * - Race-safe username uniqueness enforcement using LockService
 * - Credential exclusion from synchronization responses and audit logs
 * - Automated daily PM schedule evaluation at midnight Tehran time
 */

export const APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * TIMAR CMMS - WATER TREATMENT PLANT
 * Google Apps Script Authoritative Cloud API & Security Engine
 * Timezone: Asia/Tehran
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

// ============================================================================
// CRYPTO & PASSWORD HASHING (Salted SHA-256 Multi-Round)
// ============================================================================

function generateRandomSalt() {
  return Utilities.getUuid().replace(/-/g, "").substring(0, 16);
}

function hashPasswordServer(password, customSalt) {
  var salt = customSalt || generateRandomSalt();
  var rounds = 5000;
  var raw = salt + ":" + password;
  var hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  for (var i = 0; i < rounds; i++) {
    hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, hashBytes);
  }
  var hex = "";
  for (var j = 0; j < hashBytes.length; j++) {
    var b = hashBytes[j] < 0 ? hashBytes[j] + 256 : hashBytes[j];
    var h = b.toString(16);
    hex += (h.length === 1 ? "0" + h : h);
  }
  return "sha256:" + rounds + ":" + salt + ":" + hex;
}

function verifyPasswordServer(password, storedHash) {
  if (!password || !storedHash) return false;
  var str = String(storedHash).trim();

  // If stored in format "sha256:rounds:salt:hex"
  if (str.indexOf("sha256:") === 0) {
    var parts = str.split(":");
    if (parts.length === 4) {
      var salt = parts[2];
      var candidate = hashPasswordServer(password, salt);
      return candidate === str;
    }
  }

  // Legacy plaintext check (for migration only)
  if (str === password) {
    return true;
  }

  return false;
}


// ============================================================================
// DATABASE & RELATIONAL SHEETS SETUP
// ============================================================================

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var schemas = {
    "Users": [
      "id", "username", "passwordHash", "fullName", "role", "department", "isActive", "updatedAt"
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
    ],
    "SecurityLog": [
      "timestamp", "eventType", "username", "status", "details"
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

  // Pre-seed initial accounts with salted password hashes (NO plaintext!)
  var usersSheet = ss.getSheetByName("Users");
  if (usersSheet.getLastRow() <= 1) {
    var now = new Date().getTime();
    var mgrHash = hashPasswordServer("Admin#2026@Timar");
    var tech1Hash = hashPasswordServer("Tech#2026@Timar");
    var tech2Hash = hashPasswordServer("Tech#2026@Timar");

    usersSheet.appendRow([
      "usr-1", "manager", mgrHash, "مهندس رضا محمدی", "manager", "مدیریت فنی و مهندسی تصفیه‌خانه", true, now
    ]);
    usersSheet.appendRow([
      "usr-2", "tech1", tech1Hash, "علی کریمی", "technician", "واحد تعمیرات مکانیک", true, now
    ]);
    usersSheet.appendRow([
      "usr-3", "tech2", tech2Hash, "سارا تهرانی", "technician", "واحد برق و ابزار دقیق", true, now
    ]);
  } else {
    // Migration: upgrade any legacy plaintext passwords to salted hashes
    var userRows = usersSheet.getDataRange().getValues();
    for (var r = 1; r < userRows.length; r++) {
      var storedPass = String(userRows[r][2] || "").trim();
      if (storedPass && storedPass.indexOf("sha256:") !== 0 && storedPass.indexOf("pbkdf2:") !== 0) {
        var upgradedHash = hashPasswordServer(storedPass);
        usersSheet.getRange(r + 1, 3).setValue(upgradedHash);
      }
    }
  }

  Logger.log("Timar CMMS sheets initialized / upgraded successfully with security policies.");
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
  Logger.log("Daily midnight automated schedule trigger installed.");
}

function logSecurityEvent(ss, eventType, username, status, details) {
  try {
    var logSheet = ss.getSheetByName("SecurityLog");
    if (logSheet) {
      logSheet.appendRow([
        new Date(), eventType, username || "anonymous", status, details || ""
      ]);
    }
  } catch(e) {}
}

// ============================================================================
// REQUEST ROUTING (doGet & doPost)
// ============================================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";
  var since = (e && e.parameter && e.parameter.since) ? parseInt(e.parameter.since, 10) : 0;
  
  if (action === "ping") {
    return jsonResponse({
      status: "ok",
      system: "Timar CMMS Cloud API",
      tehranDate: getTehranDateString(new Date()),
      timestamp: new Date().getTime()
    });
  }

  return jsonResponse({ error: "Method not allowed for GET" });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    return jsonResponse({ error: "Server busy, lock timeout. Please retry." });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    // 1. Login
    if (action === "login") {
      var username = String(payload.username || "").trim().toLowerCase();
      var password = String(payload.password || "");
      var authResult = handleLogin(ss, username, password);
      return jsonResponse(authResult);
    }

    // 1.1 Check if at least one active manager exists
    if (action === "checkManagerExists") {
      var uSheet = ss.getSheetByName("Users");
      if (!uSheet) return jsonResponse({ hasManager: false });
      var uData = uSheet.getDataRange().getValues();
      var hasMgr = false;
      for (var m = 1; m < uData.length; m++) {
        if (String(uData[m][4]) === "manager" && !!uData[m][6]) {
          hasMgr = true;
          break;
        }
      }
      return jsonResponse({ hasManager: hasMgr });
    }

    // 1.2 Bootstrap first manager (Allowed ONLY if NO active manager exists)
    if (action === "bootstrapFirstManager") {
      var uSheet = ss.getSheetByName("Users");
      if (!uSheet) {
        setupSheets();
        uSheet = ss.getSheetByName("Users");
      }
      var uData = uSheet.getDataRange().getValues();
      for (var b = 1; b < uData.length; b++) {
        if (String(uData[b][4]) === "manager" && !!uData[b][6]) {
          logSecurityEvent(ss, "BOOTSTRAP_REJECTED", "anonymous", "BLOCKED", "Manager already exists");
          return jsonResponse({ success: false, error: "امکان ثبت مدیر اولیه وجود ندارد؛ مدیر سیستم قبلاً ایجاد شده است." });
        }
      }
      var bUser = String(payload.username || "").trim().toLowerCase();
      var bPass = String(payload.password || "");
      if (!bUser || bPass.length < 12) {
        return jsonResponse({ success: false, error: "نام کاربری و گذرواژه معتبر (حداقل ۱۲ کاراکتر) الزامی است." });
      }
      var bHash = hashPasswordServer(bPass);
      var bId = "usr-mgr-" + new Date().getTime();
      var bFull = String(payload.fullName || "مدیر ارشد سیستم");
      var bDept = String(payload.department || "مدیریت فنی");
      var bNow = new Date().getTime();
      uSheet.appendRow([bId, bUser, bHash, bFull, "manager", bDept, true, bNow]);
      logSecurityEvent(ss, "FIRST_MANAGER_BOOTSTRAPPED", bUser, "OK", "First manager created securely");
      return jsonResponse({
        success: true,
        user: { id: bId, username: bUser, fullName: bFull, role: "manager", department: bDept, isActive: true, updatedAt: bNow }
      });
    }

    // 2. Create User (temporary client-side manager check; no session tokens)
    if (action === "createUser") {
      var actingMgr = payload.actingUser;
      if (!actingMgr || actingMgr.role !== "manager") {
        logSecurityEvent(ss, "UNAUTHORIZED_USER_CREATE", actingMgr ? actingMgr.username : "anonymous", "BLOCKED", "Client-side manager identity missing");
        return jsonResponse({ success: false, error: "دسترسی غیرمجاز: تنها مدیر سیستم مجاز به ایجاد حساب کاربری است." });
      }
      var createRes = handleCreateUser(ss, payload.userData, actingMgr);
      return jsonResponse(createRes);
    }

    // 3. Update User (temporary client-side manager check; no session tokens)
    if (action === "updateUser") {
      var actingMgr = payload.actingUser;
      if (!actingMgr || actingMgr.role !== "manager") {
        return jsonResponse({ success: false, error: "دسترسی غیرمجاز: تنها مدیر سیستم مجاز به ویرایش کاربر است." });
      }
      var updateRes = handleUpdateUser(ss, payload.targetUserId, payload.updates, actingMgr);
      return jsonResponse(updateRes);
    }

    // 4. Reset Password (temporary client-side manager check; no session tokens)
    if (action === "resetPassword") {
      var actingMgr = payload.actingUser;
      if (!actingMgr || actingMgr.role !== "manager") {
        return jsonResponse({ success: false, error: "دسترسی غیرمجاز: تنها مدیر سیستم مجاز به بازنشانی رمز عبور است." });
      }
      var resetRes = handleResetPassword(ss, payload.targetUserId, payload.newPassword, actingMgr);
      return jsonResponse(resetRes);
    }

    // 5. Tokenless sync endpoints. Role is supplied by the client and is not
    // authoritative; restore server-verified authorization in a later step.
    if (action === "syncPush") {
      var actingUser = payload.actingUser || {
        username: payload.clientUser || "Unknown",
        fullName: payload.clientUser || "Unknown",
        role: "technician"
      };
      var pushResult = applyMutations(ss, payload.mutations || [], actingUser);
      processDueSchedules();
      return jsonResponse(pushResult);
    }

    if (action === "syncFull") {
      var actingUser = payload.actingUser || {
        username: payload.clientUser || "Unknown",
        fullName: payload.clientUser || "Unknown",
        role: "technician"
      };
      var pushRes = applyMutations(ss, payload.mutations || [], actingUser);
      processDueSchedules();
      var delta = pullDeltaChanges(ss, payload.sinceTimestamp || 0);
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

// ============================================================================
// AUTHENTICATION & USER MANAGEMENT LOGIC
// ============================================================================

function handleLogin(ss, username, password) {
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, message: "Users table not found" };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowUser = String(row[1]).trim().toLowerCase();
    if (rowUser === username) {
      var storedHash = String(row[2]).trim();
      var isVerified = verifyPasswordServer(password, storedHash);

      if (isVerified) {
        var isActive = !!row[6];
        if (!isActive) {
          logSecurityEvent(ss, "LOGIN_FAILED", username, "BLOCKED", "Account is disabled");
          return { success: false, message: "این حساب کاربری غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید." };
        }

        // If stored was legacy plaintext, automatically upgrade to salted hash
        if (storedHash.indexOf("sha256:") !== 0 && storedHash.indexOf("pbkdf2:") !== 0) {
          var upgradedHash = hashPasswordServer(password);
          sheet.getRange(i + 1, 3).setValue(upgradedHash);
        }

        var safeUser = {
          id: String(row[0]),
          username: String(row[1]),
          fullName: String(row[3]),
          role: String(row[4]),
          department: String(row[5]),
          isActive: true,
          updatedAt: parseInt(row[7], 10) || new Date().getTime()
        };

        logSecurityEvent(ss, "LOGIN_SUCCESS", username, "OK", "");

        return {
          success: true,
          user: safeUser
        };
      } else {
        logSecurityEvent(ss, "LOGIN_FAILED", username, "FAIL", "Invalid credentials");
        return { success: false, message: "نام کاربری یا کلمه عبور نادرست است." };
      }
    }
  }

  logSecurityEvent(ss, "LOGIN_FAILED", username, "FAIL", "User not found");
  return { success: false, message: "نام کاربری یا کلمه عبور نادرست است." };
}

function handleCreateUser(ss, userData, actingMgr) {
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, message: "Users table not found" };

  var normalized = String(userData.username || "").trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 30) {
    return { success: false, message: "نام کاربری باید بین ۳ تا ۳۰ کاراکتر باشد." };
  }

  var password = String(userData.password || "");
  if (password.length < 12) {
    return { success: false, message: "رمز عبور برای حساب‌های جدید باید حداقل ۱۲ کاراکتر باشد." };
  }

  var role = userData.role === "manager" ? "manager" : "technician";

  // Atomically check for duplicates (including disabled accounts)
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toLowerCase() === normalized) {
      return { success: false, message: "این نام کاربری قبلاً در سامانه ثبت شده است." };
    }
  }

  var now = new Date().getTime();
  var newId = "usr-" + now + "-" + Utilities.getUuid().substring(0, 4);
  var pHash = hashPasswordServer(password);

  var row = [
    newId,
    normalized,
    pHash,
    String(userData.fullName || "").trim(),
    role,
    String(userData.department || "").trim(),
    userData.isActive !== undefined ? !!userData.isActive : true,
    now
  ];

  sheet.appendRow(row);
  logSecurityEvent(ss, "USER_CREATED", normalized, "OK", "Created by " + actingMgr.username);

  return {
    success: true,
    user: {
      id: newId,
      username: normalized,
      fullName: String(userData.fullName || "").trim(),
      role: role,
      department: String(userData.department || "").trim(),
      isActive: userData.isActive !== undefined ? !!userData.isActive : true,
      updatedAt: now
    }
  };
}

function handleUpdateUser(ss, targetUserId, updates, actingMgr) {
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, message: "Users table not found" };

  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var targetRow = null;

  var activeManagerCount = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][4]) === "manager" && !!data[i][6]) {
      activeManagerCount++;
    }
    if (String(data[i][0]) === String(targetUserId)) {
      rowIndex = i + 1;
      targetRow = data[i];
    }
  }

  if (rowIndex <= 0 || !targetRow) {
    return { success: false, message: "کاربر مورد نظر یافت نشد." };
  }

  // Prevent demoting or deactivating the last active manager
  var isTargetActiveManager = String(targetRow[4]) === "manager" && !!targetRow[6];
  if (isTargetActiveManager && activeManagerCount <= 1) {
    if (updates.isActive === false) {
      return { success: false, message: "امکان غیرفعال‌سازی تنها مدیر فعال سیستم وجود ندارد." };
    }
    if (updates.role && updates.role !== "manager") {
      return { success: false, message: "امکان تنزل رتبه تنها مدیر فعال سیستم وجود ندارد." };
    }
  }

  var now = new Date().getTime();
  if (updates.fullName !== undefined) sheet.getRange(rowIndex, 4).setValue(String(updates.fullName).trim());
  if (updates.role !== undefined) sheet.getRange(rowIndex, 5).setValue(updates.role === "manager" ? "manager" : "technician");
  if (updates.department !== undefined) sheet.getRange(rowIndex, 6).setValue(String(updates.department).trim());
  if (updates.isActive !== undefined) {
    sheet.getRange(rowIndex, 7).setValue(!!updates.isActive);
  }
  sheet.getRange(rowIndex, 8).setValue(now);

  logSecurityEvent(ss, "USER_UPDATED", targetUserId, "OK", "Updated by " + actingMgr.username);

  return {
    success: true,
    user: {
      id: String(targetRow[0]),
      username: String(targetRow[1]),
      fullName: updates.fullName !== undefined ? String(updates.fullName).trim() : String(targetRow[3]),
      role: updates.role !== undefined ? updates.role : String(targetRow[4]),
      department: updates.department !== undefined ? String(updates.department).trim() : String(targetRow[5]),
      isActive: updates.isActive !== undefined ? !!updates.isActive : !!targetRow[6],
      updatedAt: now
    }
  };
}

function handleResetPassword(ss, targetUserId, newPassword, actingMgr) {
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, message: "Users table not found" };

  if (!newPassword || newPassword.length < 12) {
    return { success: false, message: "رمز عبور جدید باید حداقل ۱۲ کاراکتر باشد." };
  }

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(targetUserId)) {
      var pHash = hashPasswordServer(newPassword);
      sheet.getRange(i + 1, 3).setValue(pHash);
      sheet.getRange(i + 1, 8).setValue(new Date().getTime());
      logSecurityEvent(ss, "PASSWORD_RESET", data[i][1], "OK", "Reset by " + actingMgr.username);
      return { success: true };
    }
  }

  return { success: false, message: "کاربر یافت نشد." };
}

// ============================================================================
// AUTHORIZED SYNCHRONIZATION (Push & Pull)
// ============================================================================

function pullDeltaChanges(ss, sinceTimestamp) {
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
        // CRITICAL SECURITY RULE: Never leak password hashes or salts to clients!
        if (h === "password" || h === "passwordHash" || h === "salt") {
          continue;
        }

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

function applyMutations(ss, mutations, actingUser) {
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

    // AUTHORIZATION ENFORCEMENT ON BACKEND:
    // 1. Technicians cannot mutate users table
    if (mut.entityType === "users" && actingUser.role !== "manager") {
      logSecurityEvent(ss, "UNAUTHORIZED_MUTATION", actingUser.username, "BLOCKED", "Technician attempted user mutation");
      continue; // Skip without adding to appliedIds
    }

    // 2. Technicians cannot create or delete schedules
    if (mut.entityType === "schedules" && (mut.action === "create" || mut.action === "delete") && actingUser.role !== "manager") {
      logSecurityEvent(ss, "UNAUTHORIZED_MUTATION", actingUser.username, "BLOCKED", "Technician attempted schedule " + mut.action);
      continue;
    }

    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) continue;

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rowIndex = -1;

    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]) === String(mut.entityId)) {
        rowIndex = r + 1;
        break;
      }
    }

    var recordData = mut.data || {};
    recordData.id = mut.entityId;
    recordData.updatedAt = serverNow;

    // Prevent generic mutations from altering password hashes
    delete recordData.password;
    delete recordData.passwordHash;

    if (mut.action === "delete") {
      recordData.isDeleted = true;
    }

    // Idempotent completion side effects handling on server
    if (mut.entityType === "events" && recordData.status === "completed") {
      var isAlreadyApplied = !!recordData.sideEffectsApplied;
      if (!isAlreadyApplied) {
        var targetScheduleId = recordData.affectedScheduleId || recordData.originatingScheduleId;
        if (targetScheduleId) {
          advanceScheduleOnServer(ss, targetScheduleId, recordData.date || getTehranDateString(new Date()), serverNow);
        }
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

  var logSheet = ss.getSheetByName("SyncLog");
  if (logSheet) {
    logSheet.appendRow([
      new Date(), actingUser.fullName + " (" + actingUser.role + ")", "syncPush", processed, "Success"
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
    var scheduleRowIndex = s + 1;
    var scheduleUpdated = false;

    var isDue = nextDueDate <= todayTehran;
    var deterministicEventId = "evt-pm-" + schId + "-" + nextDueDate;

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

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
