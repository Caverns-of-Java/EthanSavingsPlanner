function doGet(e) {
  return handleRequest_("GET", e);
}

function doPost(e) {
  return handleRequest_("POST", e);
}

function handleRequest_(method, e) {
  try {
    ensureSchema_();

    var path = getPath_(e);
    if (method === "GET") {
      if (path === "summary") {
        return jsonResponse_(getSummaryData_());
      }
      if (path === "items") {
        return jsonResponse_({ items: listItems_() });
      }
      return jsonResponse_({ ok: false, message: "Unknown GET path." });
    }

    if (method === "POST") {
      var params = parsePlainTextBody_(e);

      if (path === "setNetIncome") {
        return jsonResponse_(setNetIncomeHandler_(params));
      }
      if (path === "addItem") {
        return jsonResponse_(addItemHandler_(params));
      }
      if (path === "updateItem") {
        return jsonResponse_(updateItemHandler_(params));
      }
      if (path === "deleteItem") {
        return jsonResponse_(deleteItemHandler_(params));
      }

      return jsonResponse_({ ok: false, message: "Unknown POST path." });
    }

    return jsonResponse_({ ok: false, message: "Unsupported method." });
  } catch (err) {
    return jsonResponse_({ ok: false, message: err && err.message ? err.message : String(err) });
  }
}

function getPath_(e) {
  var pathInfo = e && e.pathInfo ? String(e.pathInfo) : "";
  var queryPath = e && e.parameter && e.parameter.path ? String(e.parameter.path) : "";
  var rawPath = pathInfo || queryPath;
  return rawPath.replace(/^\/+|\/+$/g, "");
}

function parsePlainTextBody_(e) {
  var body = e && e.postData && e.postData.contents ? String(e.postData.contents) : "";
  var params = {};

  if (!body) {
    return params;
  }

  body.split("&").forEach(function (pair) {
    if (!pair) {
      return;
    }
    var idx = pair.indexOf("=");
    var rawKey = idx >= 0 ? pair.substring(0, idx) : pair;
    var rawValue = idx >= 0 ? pair.substring(idx + 1) : "";
    var key = decodeURIComponent(String(rawKey).replace(/\+/g, " "));
    var value = decodeURIComponent(String(rawValue).replace(/\+/g, " "));
    params[key] = value;
  });

  return params;
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function setNetIncomeHandler_(params) {
  var parsed = toPositiveNumber_(params.netIncome, "netIncome");
  setNetIncome_(parsed);
  return { ok: true, message: "Net income updated." };
}

function addItemHandler_(params) {
  var itemName = normalizeText_(params.item, "item");
  var amount = toPositiveNumber_(params.amount, "amount");
  var notes = normalizeOptionalText_(params.notes);

  var id = addItem_(itemName, amount, notes);
  return { ok: true, message: "Item added.", id: id };
}

function updateItemHandler_(params) {
  var id = normalizeText_(params.id, "id");
  var itemName = normalizeText_(params.item, "item");
  var amount = toPositiveNumber_(params.amount, "amount");
  var notes = normalizeOptionalText_(params.notes);

  updateItem_(id, itemName, amount, notes);
  return { ok: true, message: "Item updated." };
}

function deleteItemHandler_(params) {
  var id = normalizeText_(params.id, "id");
  deleteItem_(id);
  return { ok: true, message: "Item deleted." };
}

function normalizeText_(value, fieldName) {
  var out = value == null ? "" : String(value).trim();
  if (!out) {
    throw new Error(fieldName + " is required.");
  }
  return out;
}

function normalizeOptionalText_(value) {
  return value == null ? "" : String(value).trim();
}

function toPositiveNumber_(value, fieldName) {
  var numeric = Number(value);
  if (!isFinite(numeric) || numeric < 0) {
    throw new Error(fieldName + " must be a number greater than or equal to 0.");
  }
  return numeric;
}
