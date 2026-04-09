var SHEET_CONFIG = "Config";
var SHEET_BUDGET_ITEMS = "BudgetItems";
var SHEET_SUMMARY = "Summary";

function ensureSchema_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var config = getOrCreateSheet_(ss, SHEET_CONFIG);
  if (!config.getRange("A1").getValue()) {
    config.getRange("A1").setValue("NetIncome");
  }
  if (config.getRange("B1").getValue() === "") {
    config.getRange("B1").setValue(0);
  }

  var items = getOrCreateSheet_(ss, SHEET_BUDGET_ITEMS);
  var itemHeaders = ["Item", "Amount", "Notes", "Timestamp", "Percentage", "ItemId", "IsDeleted"];
  writeHeadersIfMissing_(items, itemHeaders);

  var summary = getOrCreateSheet_(ss, SHEET_SUMMARY);
  if (!summary.getRange("A1").getValue()) {
    summary.getRange("A1").setValue("Total budgeted");
  }
  if (!summary.getRange("A2").getValue()) {
    summary.getRange("A2").setValue("Remaining");
  }

  // Exclude deleted items from totals. Boolean FALSE rows are active.
  summary.getRange("B1").setFormula("=SUMIF(BudgetItems!G:G, FALSE, BudgetItems!B:B)");
  summary.getRange("B2").setFormula("=Config!B1 - B1");
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function writeHeadersIfMissing_(sheet, headers) {
  var range = sheet.getRange(1, 1, 1, headers.length);
  var values = range.getValues()[0];
  var shouldWrite = values.join("") === "";
  if (shouldWrite) {
    range.setValues([headers]);
    return;
  }

  // Keep old sheets compatible by filling missing headers only.
  for (var i = 0; i < headers.length; i++) {
    if (!values[i]) {
      sheet.getRange(1, i + 1).setValue(headers[i]);
    }
  }
}

function getSummaryData_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = ss.getSheetByName(SHEET_CONFIG);
  var summary = ss.getSheetByName(SHEET_SUMMARY);

  var netIncome = Number(config.getRange("B1").getValue() || 0);
  var totalBudgeted = Number(summary.getRange("B1").getValue() || 0);
  var remaining = Number(summary.getRange("B2").getValue() || 0);
  var items = listItems_();

  return {
    netIncome: netIncome,
    totalBudgeted: totalBudgeted,
    remaining: remaining,
    items: items,
  };
}

function listItems_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BUDGET_ITEMS);
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return [];
  }

  var rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  var items = [];

  rows.forEach(function (row) {
    var name = row[0];
    var amount = row[1];
    var notes = row[2];
    var timestamp = row[3];
    var percentage = row[4];
    var id = row[5];
    var isDeleted = row[6];

    if (!name || isDeleted === true) {
      return;
    }

    items.push({
      id: String(id || ""),
      item: String(name),
      amount: Number(amount || 0),
      notes: notes ? String(notes) : "",
      timestamp: timestamp || "",
      percentage: Number(percentage || 0),
    });
  });

  return items;
}

function setNetIncome_(value) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = ss.getSheetByName(SHEET_CONFIG);
  config.getRange("B1").setValue(value);
}

function addItem_(itemName, amount, notes) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BUDGET_ITEMS);
  var id = Utilities.getUuid();
  var row = sheet.getLastRow() + 1;

  sheet.getRange(row, 1, 1, 7).setValues([[itemName, amount, notes, new Date(), "", id, false]]);
  sheet.getRange(row, 5).setFormula("=IFERROR(B" + row + " / Config!$B$1, 0)");

  return id;
}

function updateItem_(id, itemName, amount, notes) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BUDGET_ITEMS);
  var row = findItemRowById_(sheet, id);
  if (!row) {
    throw new Error("Item not found.");
  }

  sheet.getRange(row, 1).setValue(itemName);
  sheet.getRange(row, 2).setValue(amount);
  sheet.getRange(row, 3).setValue(notes);
  sheet.getRange(row, 4).setValue(new Date());
  sheet.getRange(row, 7).setValue(false);
}

function deleteItem_(id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_BUDGET_ITEMS);
  var row = findItemRowById_(sheet, id);
  if (!row) {
    throw new Error("Item not found.");
  }

  sheet.getRange(row, 7).setValue(true);
}

function findItemRowById_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return 0;
  }

  var idValues = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
  for (var i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === id) {
      return i + 2;
    }
  }
  return 0;
}
