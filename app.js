const API_BASE = "https://script.google.com/macros/s/AKfycbyy2Fe38ARYnFd4Qrl-U51LPC1BRNwE3Ugn4b_r0TuJo-GOsx6Kno0I1HjkYMq4hhhh/exec";

const state = {
  summary: null,
  chart: null,
  editingItemId: null,
  incomeSubmitting: false,
  itemSubmitting: false,
};

const ui = {
  netIncomeValue: document.getElementById("netIncomeValue"),
  totalAllocatedValue: document.getElementById("totalAllocatedValue"),
  remainingValue: document.getElementById("remainingValue"),
  itemsList: document.getElementById("itemsList"),
  itemsEmptyState: document.getElementById("itemsEmptyState"),
  chartCanvas: document.getElementById("allocationChart"),
  statusChip: document.getElementById("statusChip"),
  globalError: document.getElementById("globalError"),

  openIncomeModalButton: document.getElementById("openIncomeModalButton"),
  openItemModalButton: document.getElementById("openItemModalButton"),
  overlay: document.getElementById("overlay"),

  incomeModal: document.getElementById("incomeModal"),
  incomeForm: document.getElementById("incomeForm"),
  incomeInput: document.getElementById("incomeInput"),
  incomeSaveButton: document.getElementById("incomeSaveButton"),
  incomeSubmitStatus: document.getElementById("incomeSubmitStatus"),

  itemModal: document.getElementById("itemModal"),
  itemForm: document.getElementById("itemForm"),
  itemModalTitle: document.getElementById("itemModalTitle"),
  itemIdInput: document.getElementById("itemIdInput"),
  itemNameInput: document.getElementById("itemNameInput"),
  itemAmountInput: document.getElementById("itemAmountInput"),
  itemNotesInput: document.getElementById("itemNotesInput"),
  itemSaveButton: document.getElementById("itemSaveButton"),
  itemSubmitStatus: document.getElementById("itemSubmitStatus"),
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function toFormBody(params) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value == null ? "" : value)}`)
    .join("&");
}

async function request(path, options = {}) {
  if (!API_BASE || API_BASE === "REPLACE_WITH_APPS_SCRIPT_WEB_APP_URL") {
    throw new Error("Please set API_BASE in app.js to your Apps Script Web App URL.");
  }

  const method = options.method || "GET";
  const url = `${API_BASE}?path=${encodeURIComponent(path)}`;
  const response = await fetch(url, {
    method,
    headers: options.headers || {},
    body: options.body,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data && data.ok === false) {
    throw new Error(data.message || "API returned an error.");
  }

  return data;
}

async function fetchSummary() {
  return request("summary");
}

async function setNetIncome(netIncome) {
  return request("setNetIncome", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: toFormBody({ netIncome }),
  });
}

async function addItem(item, amount, notes) {
  return request("addItem", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: toFormBody({ item, amount, notes }),
  });
}

async function updateItem(id, item, amount, notes) {
  return request("updateItem", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: toFormBody({ id, item, amount, notes }),
  });
}

async function deleteItem(id) {
  return request("deleteItem", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: toFormBody({ id }),
  });
}

function openModal(modal) {
  if (!modal) {
    throw new Error("Modal element was not found.");
  }
  ui.overlay.classList.remove("hidden");
  if (typeof modal.showModal === "function") {
    modal.showModal();
    return;
  }
  modal.setAttribute("open", "open");
}

function closeModal(modal) {
  if (!modal) {
    return;
  }
  if (typeof modal.close === "function") {
    modal.close();
  } else {
    modal.removeAttribute("open");
  }
  if (!ui.incomeModal.open && !ui.itemModal.open) {
    ui.overlay.classList.add("hidden");
  }
}

function verifyRequiredElements() {
  const required = [
    "statusChip",
    "openIncomeModalButton",
    "openItemModalButton",
    "overlay",
    "incomeModal",
    "incomeForm",
    "incomeInput",
    "incomeSaveButton",
    "incomeSubmitStatus",
    "itemModal",
    "itemForm",
    "itemModalTitle",
    "itemIdInput",
    "itemNameInput",
    "itemAmountInput",
    "itemNotesInput",
    "itemSaveButton",
    "itemSubmitStatus",
    "itemsList",
    "itemsEmptyState",
    "netIncomeValue",
    "totalAllocatedValue",
    "remainingValue",
    "globalError",
    "chartCanvas",
  ];

  const missing = required.filter((key) => !ui[key]);
  if (missing.length) {
    throw new Error(`Missing required UI elements: ${missing.join(", ")}`);
  }
}

function setError(message = "") {
  ui.globalError.textContent = message;
}

function setStatus(mode, message) {
  var className = "status-chip " + mode;
  ui.statusChip.className = className;
  ui.statusChip.textContent = message;
}

function renderSummary(summary) {
  ui.netIncomeValue.textContent = formatCurrency(summary.netIncome);
  ui.totalAllocatedValue.textContent = formatCurrency(summary.totalBudgeted);
  ui.remainingValue.textContent = formatCurrency(summary.remaining);
}

function renderItems(items) {
  ui.itemsList.innerHTML = "";
  ui.itemsEmptyState.style.display = items.length ? "none" : "block";

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item";

    const top = document.createElement("div");
    top.className = "item-top";

    const title = document.createElement("h3");
    title.className = "item-title";
    title.textContent = item.item;

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editButton = document.createElement("button");
    editButton.className = "btn ghost";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => startEditItem(item));

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn warn";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => onDeleteItem(item.id));

    actions.append(editButton, deleteButton);
    top.append(title, actions);

    const amount = document.createElement("p");
    amount.className = "item-meta";
    amount.textContent = `Amount: ${formatCurrency(item.amount)}`;

    const percentage = document.createElement("p");
    percentage.className = "item-meta";
    percentage.textContent = `Allocation: ${(Number(item.percentage || 0) * 100).toFixed(2)}%`;

    card.append(top, amount, percentage);
    if (item.notes) {
      const notes = document.createElement("p");
      notes.className = "item-meta";
      notes.textContent = `Notes: ${item.notes}`;
      card.append(notes);
    }

    ui.itemsList.append(card);
  });
}

function updateChart(summary) {
  var items = summary && summary.items ? summary.items : [];
  var netIncome = Number((summary && summary.netIncome) || 0);
  var remainingAmount = Math.max(Number((summary && summary.remaining) || 0), 0);

  const labels = items.map((item) => item.item);
  const values = items.map((item) => Number(item.percentage || 0));
  const colors = labels.map((_, idx) => `hsl(${(idx * 53) % 360}deg 62% 56%)`);

  var remainingPercentage = netIncome > 0 ? remainingAmount / netIncome : 0;
  labels.push("Remaining");
  values.push(remainingPercentage);
  colors.push("#1f9d55");

  if (!state.chart) {
    state.chart = new Chart(ui.chartCanvas, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
    return;
  }

  state.chart.data.labels = labels;
  state.chart.data.datasets[0].data = values;
  state.chart.data.datasets[0].backgroundColor = colors;
  state.chart.update();
}

async function refreshSummary() {
  setStatus("loading", "Loading");
  try {
    const summary = await fetchSummary();
    state.summary = summary;
    renderSummary(summary);
    renderItems(summary.items || []);
    updateChart(summary);
    setStatus("ready", "Ready");
  } catch (error) {
    setStatus("error", "Error");
    throw error;
  }
}

function resetItemForm() {
  state.editingItemId = null;
  ui.itemModalTitle.textContent = "Add Budget Item";
  ui.itemIdInput.value = "";
  ui.itemNameInput.value = "";
  ui.itemAmountInput.value = "";
  ui.itemNotesInput.value = "";
  ui.itemSubmitStatus.textContent = "";
}

function startEditItem(item) {
  state.editingItemId = item.id;
  ui.itemModalTitle.textContent = "Edit Budget Item";
  ui.itemIdInput.value = item.id;
  ui.itemNameInput.value = item.item || "";
  ui.itemAmountInput.value = item.amount ?? "";
  ui.itemNotesInput.value = item.notes || "";
  openModal(ui.itemModal);
}

async function onDeleteItem(id) {
  const confirmed = window.confirm("Delete this item?");
  if (!confirmed) {
    return;
  }

  setError("");
  try {
    setStatus("loading", "Loading");
    await deleteItem(id);
    await refreshSummary();
  } catch (error) {
    setStatus("error", "Error");
    setError(error.message);
  }
}

function setBusy(form, busy) {
  const controls = form.querySelectorAll("button, input, textarea");
  controls.forEach((control) => {
    control.disabled = busy;
  });
  form.classList.toggle("is-busy", busy);
  form.setAttribute("aria-busy", busy ? "true" : "false");
}

function setIncomeSubmitState(isBusy, message) {
  state.incomeSubmitting = isBusy;
  setBusy(ui.incomeForm, isBusy);
  ui.incomeSaveButton.classList.toggle("is-loading", isBusy);
  ui.incomeSaveButton.textContent = isBusy ? "Saving..." : "Save";
  ui.incomeSubmitStatus.textContent = message || "";
}

function setItemSubmitState(isBusy, message, actionLabel) {
  state.itemSubmitting = isBusy;
  setBusy(ui.itemForm, isBusy);
  ui.itemSaveButton.classList.toggle("is-loading", isBusy);
  if (isBusy) {
    ui.itemSaveButton.textContent = actionLabel ? actionLabel + "..." : "Saving...";
  } else {
    ui.itemSaveButton.textContent = "Save";
  }
  ui.itemSubmitStatus.textContent = message || "";
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.error("Service worker registration failed:", error);
  });
}

function wireEvents() {
  ui.openIncomeModalButton.addEventListener("click", () => {
    const currentIncome = Number((state.summary && state.summary.netIncome) || 0);
    ui.incomeInput.value = currentIncome;
    openModal(ui.incomeModal);
  });

  ui.openItemModalButton.addEventListener("click", () => {
    resetItemForm();
    openModal(ui.itemModal);
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.incomeSubmitting || state.itemSubmitting) {
        return;
      }
      const modalId = button.getAttribute("data-close");
      closeModal(document.getElementById(modalId));
    });
  });

  ui.overlay.addEventListener("click", () => {
    if (state.incomeSubmitting || state.itemSubmitting) {
      return;
    }
    if (ui.incomeModal.open) {
      closeModal(ui.incomeModal);
    }
    if (ui.itemModal.open) {
      closeModal(ui.itemModal);
    }
  });

  ui.incomeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.incomeSubmitting) {
      return;
    }
    setIncomeSubmitState(true, "Saving net income...");
    setError("");

    try {
      setStatus("loading", "Saving");
      await setNetIncome(ui.incomeInput.value);
      closeModal(ui.incomeModal);
      await refreshSummary();
    } catch (error) {
      setStatus("error", "Error");
      setError(error.message);
      setIncomeSubmitState(true, "Could not save. Please try again.");
    } finally {
      setIncomeSubmitState(false, "");
    }
  });

  ui.itemForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.itemSubmitting) {
      return;
    }
    setError("");

    const id = ui.itemIdInput.value.trim();
    const item = ui.itemNameInput.value.trim();
    const amount = ui.itemAmountInput.value;
    const notes = ui.itemNotesInput.value.trim();
    var actionLabel = id ? "Updating" : "Saving";
    setItemSubmitState(true, actionLabel + " budget item...", actionLabel);

    try {
      setStatus("loading", id ? "Updating" : "Saving");
      if (id) {
        await updateItem(id, item, amount, notes);
      } else {
        await addItem(item, amount, notes);
      }
      closeModal(ui.itemModal);
      resetItemForm();
      await refreshSummary();
    } catch (error) {
      setStatus("error", "Error");
      setError(error.message);
      setItemSubmitState(true, "Could not save item. Please try again.", actionLabel);
    } finally {
      setItemSubmitState(false, "", actionLabel);
    }
  });
}

async function main() {
  try {
    registerServiceWorker();
    setStatus("loading", "Loading");
    verifyRequiredElements();
    wireEvents();
    setError("");
    await refreshSummary();
  } catch (error) {
    setStatus("error", "Error");
    setError(error.message);
    console.error("Startup error:", error);
  }
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
