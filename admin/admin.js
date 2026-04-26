"use strict";

const DEFAULT_LIST_NAME = "大巨蛋";
const IS_FILE_PROTOCOL = window.location.protocol === "file:";
const IS_LOCAL_HOST = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const CONFIGURED_API_ORIGIN = String(window.ADMIN_API_ORIGIN || "").trim().replace(/\/+$/, "");
const API_ORIGIN = CONFIGURED_API_ORIGIN || (IS_FILE_PROTOCOL
  ? "http://127.0.0.1:5050"
  : IS_LOCAL_HOST && window.location.port && window.location.port !== "5050"
    ? "http://127.0.0.1:5050"
    : "");
const API_BASE = `${API_ORIGIN}/api/admin`;

const CONFIG_GOOGLE_MAPS_API_KEY = String(window.GOOGLE_MAPS_API_KEY || "").trim();
const GOOGLE_MAPS_API_KEY_STORAGE_KEY = "ihg_google_maps_api_key_v1";
const GOOGLE_PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.googleMapsUri",
  "places.regularOpeningHours.weekdayDescriptions",
].join(",");
const LOOKUP_THROTTLE_MS = 180;

const DAY_TOKENS = [
  ["星期日", "週日", "禮拜日", "Sunday", "Sun"],
  ["星期一", "週一", "禮拜一", "Monday", "Mon"],
  ["星期二", "週二", "禮拜二", "Tuesday", "Tue"],
  ["星期三", "週三", "禮拜三", "Wednesday", "Wed"],
  ["星期四", "週四", "禮拜四", "Thursday", "Thu"],
  ["星期五", "週五", "禮拜五", "Friday", "Fri"],
  ["星期六", "週六", "禮拜六", "Saturday", "Sat"],
];

const PRIMARY_CATEGORY_OPTIONS = ["餐飲", "景點", "交通", "商店", "其他設施"];
const SUBCATEGORY_OPTIONS_BY_PRIMARY = {
  餐飲: ["早餐", "午餐", "晚餐", "宵夜", "咖啡", "其他"],
  景點: ["商圈", "古蹟", "公園", "寺廟", "其他"],
  交通: ["捷運站", "火車站", "公車站", "轉運站", "停車場", "其他"],
  商店: ["百貨", "超市", "藥妝", "書店", "服飾", "其他"],
  其他設施: ["飯店", "銀行", "郵局", "醫院", "廁所", "停車場", "其他"],
};
const ALL_SUBCATEGORY_OPTIONS = Object.values(SUBCATEGORY_OPTIONS_BY_PRIMARY).flat();

const dom = {
  form: document.querySelector("#place-form"),
  listName: document.querySelector("#list-name"),
  name: document.querySelector("#name"),
  address: document.querySelector("#address"),
  lat: document.querySelector("#lat"),
  lng: document.querySelector("#lng"),
  mapsUrl: document.querySelector("#maps-url"),
  primaryCategory: document.querySelector("#primary-category"),
  subcategory: document.querySelector("#subcategory"),
  category: document.querySelector("#category"),
  phone: document.querySelector("#phone"),
  openingHours: document.querySelector("#opening-hours"),
  notes: document.querySelector("#notes"),
  reloadBtn: document.querySelector("#reload-btn"),
  rebuildBtn: document.querySelector("#rebuild-btn"),
  syncWeeklyBtn: document.querySelector("#sync-weekly-btn"),
  fillMissingHoursBtn: document.querySelector("#fill-missing-hours-btn"),
  apiKeyInput: document.querySelector("#gmaps-api-key"),
  apiKeySaveBtn: document.querySelector("#save-api-key-btn"),
  apiKeyClearBtn: document.querySelector("#clear-api-key-btn"),
  apiKeyTestBtn: document.querySelector("#test-api-key-btn"),
  apiKeyHint: document.querySelector("#api-key-hint"),
  countText: document.querySelector("#count-text"),
  placeBody: document.querySelector("#place-body"),
  log: document.querySelector("#log"),
};

let isBulkUpdatingHours = false;
let runtimeGoogleMapsApiKey = "";

function normalizeText(value) {
  return String(value || "")
    .replace(/\u200e/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function readStoredApiKey() {
  try {
    return String(window.localStorage.getItem(GOOGLE_MAPS_API_KEY_STORAGE_KEY) || "").trim();
  } catch (_error) {
    return "";
  }
}

function writeStoredApiKey(value) {
  const key = String(value || "").trim();
  try {
    if (key) {
      window.localStorage.setItem(GOOGLE_MAPS_API_KEY_STORAGE_KEY, key);
    } else {
      window.localStorage.removeItem(GOOGLE_MAPS_API_KEY_STORAGE_KEY);
    }
  } catch (_error) {
    // ignore localStorage failure
  }
}

async function saveApiKeyToServer(apiKey) {
  return fetchJson("/config/google-maps-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: String(apiKey || "").trim() }),
  });
}

function getGoogleMapsApiKey() {
  return String(runtimeGoogleMapsApiKey || "").trim();
}

function maskApiKey(value) {
  const key = String(value || "").trim();
  if (!key) return "";
  if (key.length <= 10) return "********";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function log(message, payload) {
  const now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  let line = `[${now}] ${message}`;
  if (payload !== undefined) {
    try {
      line += `\n${JSON.stringify(payload, null, 2)}`;
    } catch (_error) {
      line += `\n${String(payload)}`;
    }
  }
  dom.log.textContent = `${line}\n\n${dom.log.textContent || ""}`.trim();
}

function setApiKeyHint(message, type = "neutral") {
  if (!(dom.apiKeyHint instanceof HTMLElement)) return;
  dom.apiKeyHint.textContent = message;
  dom.apiKeyHint.classList.remove("api-key-hint--ok", "api-key-hint--error");
  if (type === "ok") dom.apiKeyHint.classList.add("api-key-hint--ok");
  if (type === "error") dom.apiKeyHint.classList.add("api-key-hint--error");
}

function syncApiKeyUi() {
  const activeKey = getGoogleMapsApiKey();
  if (dom.apiKeyInput instanceof HTMLInputElement) {
    dom.apiKeyInput.value = activeKey;
  }
  if (activeKey) {
    setApiKeyHint(`已設定金鑰：${maskApiKey(activeKey)}`, "ok");
  } else {
    setApiKeyHint("尚未設定金鑰", "error");
  }
}

async function syncApiKeyStatusFromServer() {
  try {
    const status = await fetchJson("/config/google-maps-key/status");
    if (status && status.configured && !getGoogleMapsApiKey()) {
      setApiKeyHint(`伺服器已設定金鑰：${status.masked || "已設定"}`, "ok");
      return;
    }
    if (status && !status.configured && !getGoogleMapsApiKey()) {
      setApiKeyHint("尚未設定金鑰", "error");
    }
  } catch (_error) {
    // ignore status polling failure
  }
}

function htmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const SUBCATEGORY_SPLIT_REGEX = /[|,;\/、，；｜]+/;

function parseSubcategoryValues(value) {
  if (Array.isArray(value)) {
    return uniqueValues(value.map((item) => normalizeText(item)).filter(Boolean));
  }
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return uniqueValues(
    normalized
      .split(SUBCATEGORY_SPLIT_REGEX)
      .map((item) => normalizeText(item))
      .filter(Boolean)
  );
}

function stringifySubcategoryValues(values) {
  return parseSubcategoryValues(values).join("|");
}

function getSelectedValues(selectEl) {
  if (!(selectEl instanceof HTMLSelectElement)) return [];
  return uniqueValues(
    Array.from(selectEl.selectedOptions)
      .map((option) => normalizeText(option.value))
      .filter(Boolean)
  );
}

function getSubcategoryOptions(primaryValue, selectedValue = "") {
  const key = normalizeText(primaryValue);
  const selected = parseSubcategoryValues(selectedValue);
  const raw = SUBCATEGORY_OPTIONS_BY_PRIMARY[key] || ALL_SUBCATEGORY_OPTIONS;
  const options = uniqueValues(raw.map((item) => normalizeText(item)).filter(Boolean));
  selected.forEach((item) => {
    if (!options.includes(item)) {
      options.unshift(item);
    }
  });
  return options;
}

function renderSelectOptions(options, selectedValue, placeholderLabel) {
  const selected = normalizeText(selectedValue);
  const rows = [`<option value="">${htmlEscape(placeholderLabel)}</option>`];
  options.forEach((optionValue) => {
    const value = normalizeText(optionValue);
    if (!value) return;
    const selectedAttr = value === selected ? " selected" : "";
    rows.push(`<option value="${htmlEscape(value)}"${selectedAttr}>${htmlEscape(value)}</option>`);
  });
  return rows.join("");
}

function buildPrimarySelectHtml(rowId, selectedValue) {
  return `<select class="inline-select js-primary-category" data-id="${htmlEscape(
    rowId
  )}">${renderSelectOptions(PRIMARY_CATEGORY_OPTIONS, selectedValue, "Select primary category")}</select>`;
}


function renderMultiSelectOptions(options, selectedValues) {
  const selectedSet = new Set(parseSubcategoryValues(selectedValues));
  return options
    .map((optionValue) => {
      const value = normalizeText(optionValue);
      if (!value) return "";
      const selectedAttr = selectedSet.has(value) ? " selected" : "";
      return `<option value="${htmlEscape(value)}"${selectedAttr}>${htmlEscape(value)}</option>`;
    })
    .join("");
}

const SUBCATEGORY_PLACEHOLDER_SELECT_PRIMARY = "Select primary category first";
const SUBCATEGORY_PLACEHOLDER_CHOOSE = "Select subcategories";

function closeAllSubcategoryDropdowns(exceptEl = null) {
  document.querySelectorAll(".check-dropdown.is-open").forEach((dropdown) => {
    if (exceptEl && dropdown === exceptEl) return;
    dropdown.classList.remove("is-open");
  });
}

function bindSubcategoryDropdown(dropdownEl, selectEl) {
  if (!(dropdownEl instanceof HTMLElement) || !(selectEl instanceof HTMLSelectElement)) return;
  if (dropdownEl.dataset.bound === "1") return;
  dropdownEl.dataset.bound = "1";

  dropdownEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const trigger = target.closest(".check-dropdown__trigger");
    if (!trigger) return;

    event.preventDefault();
    if (trigger.hasAttribute("disabled")) return;

    const willOpen = !dropdownEl.classList.contains("is-open");
    closeAllSubcategoryDropdowns(willOpen ? dropdownEl : null);
    dropdownEl.classList.toggle("is-open", willOpen);
  });

  dropdownEl.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;

    const value = normalizeText(target.value);
    if (!value) return;

    Array.from(selectEl.options).forEach((option) => {
      option.selected = normalizeText(option.value) === value ? target.checked : option.selected;
    });

    selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    syncSubcategoryDropdown(selectEl);
  });
}

function syncSubcategoryDropdown(selectEl, placeholderLabel = "") {
  if (!(selectEl instanceof HTMLSelectElement) || !selectEl.multiple) return;

  const dropdownEl =
    (selectEl.previousElementSibling instanceof HTMLElement &&
      selectEl.previousElementSibling.classList.contains("js-subcategory-dropdown") &&
      selectEl.previousElementSibling) ||
    (selectEl.parentElement
      ? selectEl.parentElement.querySelector(".js-subcategory-dropdown")
      : null);

  if (!(dropdownEl instanceof HTMLElement)) return;
  bindSubcategoryDropdown(dropdownEl, selectEl);

  const placeholder =
    normalizeText(placeholderLabel) ||
    normalizeText(dropdownEl.dataset.placeholder) ||
    SUBCATEGORY_PLACEHOLDER_CHOOSE;

  const options = Array.from(selectEl.options).filter((option) => {
    const value = normalizeText(option.value);
    return value && !option.disabled;
  });

  const selectedValues = getSelectedValues(selectEl);
  const selectedSet = new Set(selectedValues);
  const selectedLabels = options
    .filter((option) => selectedSet.has(normalizeText(option.value)))
    .map((option) => normalizeText(option.textContent));

  if (!dropdownEl.querySelector(".check-dropdown__trigger")) {
    dropdownEl.innerHTML = `
      <button type="button" class="check-dropdown__trigger"></button>
      <div class="check-dropdown__panel"></div>
    `;
  }

  const triggerEl = dropdownEl.querySelector(".check-dropdown__trigger");
  const panelEl = dropdownEl.querySelector(".check-dropdown__panel");
  if (!(triggerEl instanceof HTMLButtonElement) || !(panelEl instanceof HTMLElement)) return;

  const triggerText = selectedLabels.length ? selectedLabels.join(", ") : placeholder;
  triggerEl.textContent = triggerText;
  triggerEl.title = triggerText;
  triggerEl.disabled = options.length === 0;

  if (!options.length) {
    panelEl.innerHTML = `<div class="check-dropdown__empty">${htmlEscape(placeholder)}</div>`;
    dropdownEl.classList.remove("is-open");
    return;
  }

  panelEl.innerHTML = options
    .map((option, index) => {
      const value = normalizeText(option.value);
      const textValue = normalizeText(option.textContent) || value;
      const checked = selectedSet.has(value) ? " checked" : "";
      const inputId = `subcat-${normalizeText(selectEl.getAttribute("data-id") || selectEl.id || "add")}-${index}`;
      return `
        <label class="check-dropdown__item" for="${htmlEscape(inputId)}">
          <input id="${htmlEscape(inputId)}" type="checkbox" value="${htmlEscape(value)}"${checked} />
          <span>${htmlEscape(textValue)}</span>
        </label>
      `;
    })
    .join("");
}

function buildSubcategorySelectHtml(rowId, primaryValue, selectedValue) {
  const options = getSubcategoryOptions(primaryValue, selectedValue);
  const size = Math.min(8, Math.max(4, options.length || 4));
  return `
    <div class="check-dropdown js-subcategory-dropdown" data-placeholder="${htmlEscape(SUBCATEGORY_PLACEHOLDER_CHOOSE)}"></div>
    <select multiple class="inline-select inline-select--multi js-subcategory native-multi-select" data-id="${htmlEscape(
      rowId
    )}" size="${size}">${renderMultiSelectOptions(options, selectedValue)}</select>
    <small class="field-hint">Subcategory supports multi-select via dropdown</small>
  `;
}

function setSelectOptions(selectEl, options, selectedValue, placeholderLabel) {
  if (!(selectEl instanceof HTMLSelectElement)) return;
  if (selectEl.multiple) {
    const normalizedOptions = uniqueValues(options.map((item) => normalizeText(item)).filter(Boolean));
    selectEl.innerHTML = renderMultiSelectOptions(normalizedOptions, selectedValue);
    selectEl.size = Math.min(8, Math.max(4, normalizedOptions.length || 4));
    if (!normalizedOptions.length) {
      selectEl.innerHTML = `<option value="" disabled>${htmlEscape(placeholderLabel)}</option>`;
    }
    syncSubcategoryDropdown(selectEl, placeholderLabel);
    return;
  }
  selectEl.innerHTML = renderSelectOptions(options, selectedValue, placeholderLabel);
}

function syncSubcategoryByPrimary(primarySelectEl, subcategorySelectEl) {
  if (!(primarySelectEl instanceof HTMLSelectElement) || !(subcategorySelectEl instanceof HTMLSelectElement)) return;
  const currentSubcategory = getSelectedValues(subcategorySelectEl);
  const options = getSubcategoryOptions(primarySelectEl.value, currentSubcategory);
  const placeholder = normalizeText(primarySelectEl.value)
    ? SUBCATEGORY_PLACEHOLDER_CHOOSE
    : SUBCATEGORY_PLACEHOLDER_SELECT_PRIMARY;
  setSelectOptions(subcategorySelectEl, options, currentSubcategory, placeholder);
}

function initAddFormCategorySelects() {
  if (!(dom.primaryCategory instanceof HTMLSelectElement) || !(dom.subcategory instanceof HTMLSelectElement)) return;
  const selectedPrimary = normalizeText(dom.primaryCategory.value);
  const selectedSubcategory = getSelectedValues(dom.subcategory);
  setSelectOptions(dom.primaryCategory, PRIMARY_CATEGORY_OPTIONS, selectedPrimary, "請選擇主分類");
  const options = getSubcategoryOptions(selectedPrimary, selectedSubcategory);
  const placeholder = selectedPrimary ? SUBCATEGORY_PLACEHOLDER_CHOOSE : SUBCATEGORY_PLACEHOLDER_SELECT_PRIMARY;
  setSelectOptions(dom.subcategory, options, selectedSubcategory, placeholder);
}

function cleanSystemNotes(value) {
  const raw = normalizeText(value);
  if (!raw) return "";
  const parts = raw
    .split(/[;\n]+/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
  const filtered = parts.filter((part) => !/^(source_link|resolved_link|place_tokens)\s*=/i.test(part));
  return filtered.join("; ");
}

function friendlyError(error) {
  const msg = String(error && error.message ? error.message : error || "");
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Cannot reach admin API. Start python admin_server.py and open http://127.0.0.1:5050/admin.";
  }
  if (msg === "GOOGLE_API_KEY_MISSING") {
    return "Google Maps API key is missing.";
  }
  if (msg === "GOOGLE_API_FORBIDDEN") {
    return "Google Maps API forbidden (403). Check key, Places API, and key restrictions.";
  }
  if (msg === "GOOGLE_API_OVER_QUERY_LIMIT") {
    return "Google Maps API quota exceeded.";
  }
  return msg || "Unknown error";
}

function buildPayload() {
  return {
    list_name: dom.listName.value.trim(),
    name: dom.name.value.trim(),
    address: dom.address.value.trim(),
    lat: dom.lat.value.trim(),
    lng: dom.lng.value.trim(),
    maps_url: dom.mapsUrl.value.trim(),
    primary_category: dom.primaryCategory.value.trim(),
    subcategory: stringifySubcategoryValues(getSelectedValues(dom.subcategory)),
    category: dom.category.value.trim(),
    phone: dom.phone.value.trim(),
    opening_hours: dom.openingHours.value.trim(),
    notes: dom.notes.value.trim(),
  };
}

async function fetchJson(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const json = await response
    .json()
    .catch(() => ({ ok: false, error: "Server response is not JSON" }));

  if (!response.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${response.status}`);
  }
  return json;
}

function renderRows(items) {
  if (!Array.isArray(items) || items.length === 0) {
    dom.placeBody.innerHTML = '<tr><td colspan="1">No data</td></tr>';
    return;
  }

  dom.placeBody.innerHTML = items
    .map((row) => {
      const lat = row.lat !== null && row.lat !== undefined ? row.lat : "";
      const lng = row.lng !== null && row.lng !== undefined ? row.lng : "";
      const mapsUrl = row.maps_url || "";
      const primaryCategory = row.primary_category || "";
      const subcategory = row.subcategory || "";
      const openingHours = row.opening_hours || "";
      const notes = cleanSystemNotes(row.notes || "");
      const updatedAt = row.updated_at || "";
      const mapLink = mapsUrl
        ? `<a href="${htmlEscape(mapsUrl)}" target="_blank" rel="noreferrer">Open</a>`
        : '<span class="meta-placeholder">N/A</span>';

      return `
      <tr>
        <td>
          <div class="place-editor" data-id="${htmlEscape(row.id)}">
            <div class="editor-row editor-row--top">
              <div class="editor-id">
                <span class="editor-label">ID</span>
                <strong>${htmlEscape(row.id)}</strong>
              </div>
              <label class="editor-field editor-field--name">
                <span class="editor-label">Name</span>
                <input class="inline-input js-name" data-id="${htmlEscape(row.id)}" value="${htmlEscape(row.name || "")}" />
              </label>
              <label class="editor-field editor-field--address">
                <span class="editor-label">Address</span>
                <input class="inline-input js-address" data-id="${htmlEscape(row.id)}" value="${htmlEscape(row.address || "")}" />
              </label>
              <label class="editor-field editor-field--phone">
                <span class="editor-label">Phone</span>
                <input class="inline-input js-phone" data-id="${htmlEscape(row.id)}" value="${htmlEscape(row.phone || "")}" />
              </label>
              <label class="editor-field editor-field--primary">
                <span class="editor-label">Primary Category</span>
                ${buildPrimarySelectHtml(row.id, primaryCategory)}
              </label>
              <label class="editor-field editor-field--subcategory">
                <span class="editor-label">Subcategory</span>
                ${buildSubcategorySelectHtml(row.id, primaryCategory, subcategory)}
              </label>
              <label class="editor-field editor-field--hours">
                <span class="editor-label">Opening Hours</span>
                <input class="inline-input js-opening-hours" data-id="${htmlEscape(row.id)}" value="${htmlEscape(openingHours)}" placeholder="Example: 11:00-21:00" />
              </label>
            </div>

            <div class="editor-row editor-row--bottom">
              <label class="editor-field editor-field--coord editor-field--lat">
                <span class="editor-label">Latitude</span>
                <input class="inline-input coord-input js-lat" data-id="${htmlEscape(row.id)}" value="${htmlEscape(lat)}" placeholder="lat" />
              </label>
              <label class="editor-field editor-field--coord editor-field--lng">
                <span class="editor-label">Longitude</span>
                <input class="inline-input coord-input js-lng" data-id="${htmlEscape(row.id)}" value="${htmlEscape(lng)}" placeholder="lng" />
              </label>
              <label class="editor-field editor-field--map-url">
                <span class="editor-label">Google Maps URL</span>
                <input class="inline-input js-maps-url" data-id="${htmlEscape(row.id)}" value="${htmlEscape(mapsUrl)}" placeholder="https://maps.app.goo.gl/..." />
              </label>
              <label class="editor-field editor-field--notes">
                <span class="editor-label">Notes</span>
                <textarea class="inline-textarea js-notes" data-id="${htmlEscape(row.id)}" rows="2">${htmlEscape(notes)}</textarea>
              </label>
              <div class="editor-meta editor-meta--map">
                <span class="editor-label">Map</span>
                ${mapLink}
              </div>
              <div class="editor-meta editor-meta--updated">
                <span class="editor-label">Updated</span>
                <span>${htmlEscape(updatedAt)}</span>
              </div>
              <div class="row-actions">
                <button class="mini-btn mini-btn--ghost js-fetch-hours" data-id="${htmlEscape(row.id)}">Fetch</button>
                <button class="mini-btn js-save" data-id="${htmlEscape(row.id)}">Save</button>
                <button class="mini-btn mini-btn--danger js-delete" data-id="${htmlEscape(row.id)}" data-name="${htmlEscape(row.name || "")}">Delete</button>
              </div>
            </div>
          </div>
        </td>
      </tr>
      `;
    })
    .join("");

  dom.placeBody.querySelectorAll(".js-subcategory").forEach((el) => {
    if (el instanceof HTMLSelectElement) syncSubcategoryDropdown(el);
  });
}

async function refreshList() {
  const listName = dom.listName.value.trim() || DEFAULT_LIST_NAME;
  const data = await fetchJson(`/places?list_name=${encodeURIComponent(listName)}&limit=300`);
  dom.countText.textContent = `${data.count} records (${data.list_name})`;
  renderRows(data.items);
}

async function onSubmit(event) {
  event.preventDefault();
  const payload = buildPayload();
  if (!payload.name) {
    log("新增失敗：請填寫點位名稱");
    return;
  }

  try {
    const data = await fetchJson("/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    log("新增成功，已重建前台資料。", data);
    dom.form.reset();
    dom.listName.value = payload.list_name || DEFAULT_LIST_NAME;
    initAddFormCategorySelects();
    await refreshList();
  } catch (error) {
    log(`新增失敗：${friendlyError(error)}`);
  }
}

async function onRebuild() {
  const payload = { list_name: dom.listName.value.trim() || DEFAULT_LIST_NAME };
  try {
    const data = await fetchJson("/rebuild", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    log("重建完成", data);
    await refreshList();
  } catch (error) {
    log(`重建失敗：${friendlyError(error)}`);
  }
}

async function onSyncWeeklyHours() {
  if (!(dom.syncWeeklyBtn instanceof HTMLButtonElement)) return;
  const payload = {
    list_name: dom.listName.value.trim() || DEFAULT_LIST_NAME,
    only_missing: false,
    limit: 1000,
  };
  const originalText = setButtonBusy(dom.syncWeeklyBtn, "同步中...");
  try {
    const data = await fetchJson("/sync-weekly-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    log("每週營業時間同步完成", data);
    await refreshList();
  } catch (error) {
    log(`每週同步失敗：${friendlyError(error)}`);
  } finally {
    restoreButton(dom.syncWeeklyBtn, originalText);
  }
}

function getRowInput(rowEl, selector) {
  const element = rowEl.querySelector(selector);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return element;
  }
  return null;
}

function setButtonBusy(buttonEl, busyText) {
  if (!(buttonEl instanceof HTMLButtonElement)) return "";
  const originalText = buttonEl.textContent || "";
  buttonEl.disabled = true;
  buttonEl.textContent = busyText;
  return originalText;
}

function restoreButton(buttonEl, originalText) {
  if (!(buttonEl instanceof HTMLButtonElement)) return;
  buttonEl.disabled = false;
  buttonEl.textContent = originalText;
}

async function saveInlineRow(placeId, rowEl, buttonEl, options = {}) {
  const nameInput = getRowInput(rowEl, ".js-name");
  const addressInput = getRowInput(rowEl, ".js-address");
  const phoneInput = getRowInput(rowEl, ".js-phone");
  const primaryCategoryInput = getRowInput(rowEl, ".js-primary-category");
  const subcategoryInput = getRowInput(rowEl, ".js-subcategory");
  const openingHoursInput = getRowInput(rowEl, ".js-opening-hours");
  const latInput = getRowInput(rowEl, ".js-lat");
  const lngInput = getRowInput(rowEl, ".js-lng");
  const mapsUrlInput = getRowInput(rowEl, ".js-maps-url");
  const notesInput = getRowInput(rowEl, ".js-notes");

  const payload = {
    list_name: dom.listName.value.trim() || DEFAULT_LIST_NAME,
    name: nameInput ? nameInput.value.trim() : "",
    address: addressInput ? addressInput.value.trim() : "",
    phone: phoneInput ? phoneInput.value.trim() : "",
    primary_category: primaryCategoryInput ? primaryCategoryInput.value.trim() : "",
    subcategory: subcategoryInput
      ? stringifySubcategoryValues(
        subcategoryInput instanceof HTMLSelectElement ? getSelectedValues(subcategoryInput) : subcategoryInput.value
      )
      : "",
    opening_hours: openingHoursInput ? openingHoursInput.value.trim() : "",
    lat: latInput ? latInput.value.trim() : "",
    lng: lngInput ? lngInput.value.trim() : "",
    maps_url: mapsUrlInput ? mapsUrlInput.value.trim() : "",
    notes: notesInput ? notesInput.value.trim() : "",
  };

  const skipRefresh = options.skipRefresh === true;
  const silentLog = options.silentLog === true;

  const originalText = setButtonBusy(buttonEl, "儲存中...");
  try {
    const data = await fetchJson(`/places/${encodeURIComponent(placeId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!silentLog) {
      log(`點位 ${placeId} 已修改（含主分類/子分類、座標、Google Maps 連結、備註、營業時間）`, data);
    }
    if (!skipRefresh) {
      await refreshList();
    }
    return true;
  } catch (error) {
    log(`修改失敗（ID ${placeId}）：${friendlyError(error)}`);
    return false;
  } finally {
    restoreButton(buttonEl, originalText);
  }
}

async function deleteRow(placeId, placeName, buttonEl) {
  const name = (placeName || "").trim() || `ID ${placeId}`;
  const ok = window.confirm(`確定要刪除「${name}」嗎？此操作無法還原。`);
  if (!ok) return;

  const originalText = setButtonBusy(buttonEl, "刪除中...");
  try {
    const data = await fetchJson(`/places/${encodeURIComponent(placeId)}`, {
      method: "DELETE",
    });
    log(`點位 ${placeId} 已刪除`, data);
    await refreshList();
  } catch (error) {
    log(`刪除失敗（ID ${placeId}）：${friendlyError(error)}`);
  } finally {
    restoreButton(buttonEl, originalText);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function uniqueValues(items) {
  return [...new Set(items.filter(Boolean))];
}

function safeDecodeURIComponent(value) {
  const text = String(value || "").replace(/\+/g, " ");
  try {
    return decodeURIComponent(text);
  } catch (_error) {
    return text;
  }
}

function extractQueryFromGoogleMapsUrl(url) {
  const raw = normalizeText(url);
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const query = parsed.searchParams.get("query") || parsed.searchParams.get("q");
    if (query) return normalizeText(safeDecodeURIComponent(query));

    const segments = parsed.pathname.split("/").filter(Boolean);
    const placeIndex = segments.findIndex((part) => part === "place");
    if (placeIndex >= 0 && segments[placeIndex + 1]) {
      return normalizeText(safeDecodeURIComponent(segments[placeIndex + 1]));
    }

    const searchIndex = segments.findIndex((part) => part === "search");
    if (searchIndex >= 0 && segments[searchIndex + 1]) {
      return normalizeText(safeDecodeURIComponent(segments[searchIndex + 1]));
    }
  } catch (_error) {
    return "";
  }

  return "";
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildLookupQueries(rowData) {
  const name = normalizeText(rowData.name);
  const address = normalizeText(rowData.address);
  const mapsUrl = normalizeText(rowData.mapsUrl);
  const areaHint = "台北市信義區";
  const lat = toNumber(rowData.lat);
  const lng = toNumber(rowData.lng);

  const queries = [];
  if (name && address && !isMissingValue(address)) queries.push(`${name} ${address}`);
  if (name) {
    queries.push(`${name} ${areaHint}`);
    queries.push(name);
  }
  const fromUrl = extractQueryFromGoogleMapsUrl(mapsUrl);
  if (fromUrl) queries.push(fromUrl);
  if (name && lat !== null && lng !== null) queries.push(`${name} ${lat},${lng}`);
  if (lat !== null && lng !== null) queries.push(`${lat},${lng}`);

  return uniqueValues(queries.map((item) => normalizeText(item)));
}

async function queryPlaceByText(query) {
  const googleMapsApiKey = getGoogleMapsApiKey();
  if (!googleMapsApiKey) {
    throw new Error("GOOGLE_API_KEY_MISSING");
  }

  let response;
  try {
    response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleMapsApiKey,
        "X-Goog-FieldMask": GOOGLE_PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "zh-TW",
        regionCode: "TW",
        maxResultCount: 3,
      }),
    });
  } catch (_error) {
    throw new Error("GOOGLE_API_NETWORK_ERROR");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("GOOGLE_API_FORBIDDEN");
  }
  if (response.status === 429) {
    throw new Error("GOOGLE_API_OVER_QUERY_LIMIT");
  }
  if (!response.ok) {
    throw new Error(`GOOGLE_API_HTTP_${response.status}`);
  }

  const payload = await response.json().catch(() => ({}));
  return Array.isArray(payload?.places) ? payload.places : [];
}

function getCandidateName(place) {
  return normalizeText(place?.displayName?.text || place?.displayName || "");
}

function getTaipeiDayIndex() {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Taipei",
      weekday: "short",
    }).format(new Date());
    const map = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const index = map[weekday];
    return Number.isInteger(index) ? index : new Date().getDay();
  } catch (_error) {
    return new Date().getDay();
  }
}

function parseTodayLine(lines) {
  if (!Array.isArray(lines) || !lines.length) return "";
  const normalizedLines = lines.map((line) => normalizeText(line)).filter(Boolean);
  if (!normalizedLines.length) return "";

  const todayIndex = getTaipeiDayIndex();
  const todayTokens = DAY_TOKENS[todayIndex].map((token) => token.toLowerCase());

  const byToken = normalizedLines.find((line) => {
    const lower = line.toLowerCase();
    return todayTokens.some((token) => lower.includes(token));
  });
  if (byToken) return byToken;

  if (normalizedLines.length === 7) {
    const first = normalizedLines[0].toLowerCase();
    const mondayFirst = DAY_TOKENS[1].some((token) => first.includes(token.toLowerCase()));
    const sundayFirst = DAY_TOKENS[0].some((token) => first.includes(token.toLowerCase()));
    const lineIndex = mondayFirst ? (todayIndex + 6) % 7 : sundayFirst ? todayIndex : (todayIndex + 6) % 7;
    return normalizedLines[lineIndex] || normalizedLines[0];
  }

  return normalizedLines[0];
}

function stripDayPrefix(line) {
  const text = normalizeText(line);
  if (!text) return "";
  const matched = text.match(/^[^:：]{1,12}[:：]\s*(.+)$/);
  const body = normalizeText(matched ? matched[1] : text);
  if (/^open 24 hours$/i.test(body)) return "24 小時營業";
  if (/^closed$/i.test(body)) return "今日休息";
  return body;
}

function extractTodayOpeningHours(place) {
  const lines = place?.regularOpeningHours?.weekdayDescriptions;
  const todayLine = parseTodayLine(lines);
  return stripDayPrefix(todayLine);
}

function scoreCandidate(place, sourceName) {
  let score = 0;
  const candidateName = getCandidateName(place);
  const name = normalizeText(sourceName).toLowerCase();
  if (candidateName && name && candidateName.toLowerCase().includes(name)) score += 20;
  if (extractTodayOpeningHours(place)) score += 100;
  if (normalizeText(place?.formattedAddress).includes("台北")) score += 8;
  if (normalizeText(place?.formattedAddress).includes("信義")) score += 6;
  return score;
}

function pickBestCandidate(places, sourceName) {
  if (!Array.isArray(places) || !places.length) return null;
  const sorted = [...places].sort((a, b) => scoreCandidate(b, sourceName) - scoreCandidate(a, sourceName));
  return sorted[0] || null;
}

function isMissingValue(value) {
  const normalized = normalizeText(value);
  return !normalized || normalized === "未提供" || normalized === "店家未提供";
}

async function fetchTodayHoursForRow(rowEl, triggerBtn, options = {}) {
  const autoSave = options.autoSave !== false;
  const skipRefreshOnSave = options.skipRefreshOnSave === true;
  const silentLog = options.silentLog === true;

  const placeId = normalizeText(rowEl.getAttribute("data-id"));
  if (!placeId) return { ok: false, reason: "missing-id" };

  const nameInput = getRowInput(rowEl, ".js-name");
  const addressInput = getRowInput(rowEl, ".js-address");
  const phoneInput = getRowInput(rowEl, ".js-phone");
  const openingHoursInput = getRowInput(rowEl, ".js-opening-hours");
  const latInput = getRowInput(rowEl, ".js-lat");
  const lngInput = getRowInput(rowEl, ".js-lng");
  const mapsUrlInput = getRowInput(rowEl, ".js-maps-url");

  const rowData = {
    name: nameInput ? nameInput.value : "",
    address: addressInput ? addressInput.value : "",
    phone: phoneInput ? phoneInput.value : "",
    openingHours: openingHoursInput ? openingHoursInput.value : "",
    lat: latInput ? latInput.value : "",
    lng: lngInput ? lngInput.value : "",
    mapsUrl: mapsUrlInput ? mapsUrlInput.value : "",
  };

  const queries = buildLookupQueries(rowData);
  if (!queries.length) {
    if (!silentLog) {
      log(`ID ${placeId} 無法組出查詢條件，請至少填名稱或地址。`);
    }
    return { ok: false, reason: "no-query" };
  }

  const originalText = setButtonBusy(triggerBtn, "抓取中...");

  try {
    let candidate = null;
    let matchedQuery = "";

    for (const query of queries) {
      let places = [];
      try {
        places = await queryPlaceByText(query);
      } catch (error) {
        const code = String(error && error.message ? error.message : "");
        if (
          code === "GOOGLE_API_KEY_MISSING" ||
          code === "GOOGLE_API_FORBIDDEN" ||
          code === "GOOGLE_API_OVER_QUERY_LIMIT"
        ) {
          throw error;
        }
        continue;
      }
      const best = pickBestCandidate(places, rowData.name);
      if (best) {
        candidate = best;
        matchedQuery = query;
        break;
      }
      await sleep(LOOKUP_THROTTLE_MS);
    }

    if (!candidate) {
      if (!silentLog) {
        log(`ID ${placeId} 找不到對應地點，請補完整名稱或地址後再試。`);
      }
      return { ok: false, reason: "not-found" };
    }

    const todayHours = extractTodayOpeningHours(candidate);
    const fromAddress = normalizeText(candidate?.formattedAddress);
    const fromPhone = normalizeText(candidate?.nationalPhoneNumber);
    const fromMapUri = normalizeText(candidate?.googleMapsUri);

    if (openingHoursInput && todayHours) {
      openingHoursInput.value = todayHours;
    }
    if (addressInput && isMissingValue(addressInput.value) && fromAddress) {
      addressInput.value = fromAddress;
    }
    if (phoneInput && isMissingValue(phoneInput.value) && fromPhone) {
      phoneInput.value = fromPhone;
    }
    if (mapsUrlInput && isMissingValue(mapsUrlInput.value) && fromMapUri) {
      mapsUrlInput.value = fromMapUri;
    }

    if (!silentLog) {
      const hoursText = todayHours || "Google 未提供今日營業時間";
      log(`ID ${placeId} 抓取成功：${hoursText}（查詢：${matchedQuery}）`);
    }

    if (autoSave) {
      const saveBtn = rowEl.querySelector(".js-save");
      if (saveBtn instanceof HTMLButtonElement) {
        const saved = await saveInlineRow(placeId, rowEl, saveBtn, {
          skipRefresh: skipRefreshOnSave,
          silentLog: true,
        });
        if (!saved) {
          return { ok: false, reason: "save-failed" };
        }
      }
    }

    return { ok: true, hasHours: Boolean(todayHours) };
  } catch (error) {
    if (!silentLog) {
      log(`抓取今日營業時間失敗（ID ${placeId}）：${friendlyError(error)}`);
    }
    return { ok: false, reason: "api-error" };
  } finally {
    restoreButton(triggerBtn, originalText);
  }
}

async function fillMissingTodayHours() {
  if (isBulkUpdatingHours) return;

  if (!getGoogleMapsApiKey()) {
    log("尚未設定 Google Maps API 金鑰，請先在上方貼上並儲存金鑰。");
    return;
  }

  const rows = Array.from(dom.placeBody.querySelectorAll(".place-editor"));
  const missingRows = rows.filter((rowEl) => {
    const input = getRowInput(rowEl, ".js-opening-hours");
    return isMissingValue(input ? input.value : "");
  });

  if (!missingRows.length) {
    log("目前所有點位都有營業時間，無需補齊。");
    return;
  }

  isBulkUpdatingHours = true;
  const originalText = setButtonBusy(dom.fillMissingHoursBtn, "補齊中...");

  let successCount = 0;
  let withHoursCount = 0;

  try {
    for (const rowEl of missingRows) {
      const fetchBtn = rowEl.querySelector(".js-fetch-hours");
      const result = await fetchTodayHoursForRow(
        rowEl,
        fetchBtn instanceof HTMLButtonElement ? fetchBtn : null,
        {
          autoSave: true,
          skipRefreshOnSave: true,
          silentLog: true,
        }
      );
      if (result.ok) {
        successCount += 1;
      }
      if (result.hasHours) {
        withHoursCount += 1;
      }
      await sleep(LOOKUP_THROTTLE_MS);
    }

    await refreshList();
    log(`批次完成：${successCount}/${missingRows.length} 筆已更新，${withHoursCount} 筆成功抓到今日營業時間。`);
  } finally {
    isBulkUpdatingHours = false;
    restoreButton(dom.fillMissingHoursBtn, originalText);
  }
}

async function saveApiKeyFromInput() {
  if (!(dom.apiKeyInput instanceof HTMLInputElement)) return;
  const inputKey = dom.apiKeyInput.value.trim();
  try {
    await saveApiKeyToServer(inputKey);
    runtimeGoogleMapsApiKey = inputKey;
    writeStoredApiKey(inputKey);
    syncApiKeyUi();
    if (inputKey) {
      log("Google Maps API 金鑰已儲存（瀏覽器 + 後台伺服器）。");
    } else {
      log("已清除 Google Maps API 金鑰。");
    }
  } catch (error) {
    log(`儲存金鑰失敗：${friendlyError(error)}`);
  }
}

async function clearApiKey() {
  try {
    await saveApiKeyToServer("");
    runtimeGoogleMapsApiKey = "";
    writeStoredApiKey("");
    syncApiKeyUi();
    log("已清除 Google Maps API 金鑰。");
  } catch (error) {
    log(`清除金鑰失敗：${friendlyError(error)}`);
  }
}

async function testApiKey() {
  if (!(dom.apiKeyTestBtn instanceof HTMLButtonElement)) return;
  const key = getGoogleMapsApiKey();
  if (!key) {
    setApiKeyHint("尚未設定金鑰，請先貼上後按「儲存金鑰」。", "error");
    return;
  }

  const originalText = setButtonBusy(dom.apiKeyTestBtn, "測試中...");
  try {
    const places = await queryPlaceByText("InterContinental 台北洲際酒店");
    if (Array.isArray(places) && places.length > 0) {
      setApiKeyHint(`金鑰可用（${maskApiKey(key)}）`, "ok");
      log("Google Maps API 金鑰測試成功。");
    } else {
      setApiKeyHint("金鑰可連線，但測試查詢回傳為空。", "error");
      log("Google Maps API 金鑰可連線，但測試查詢沒有回傳資料。");
    }
  } catch (error) {
    setApiKeyHint(`金鑰測試失敗：${friendlyError(error)}`, "error");
    log(`Google Maps API 金鑰測試失敗：${friendlyError(error)}`);
  } finally {
    restoreButton(dom.apiKeyTestBtn, originalText);
  }
}

runtimeGoogleMapsApiKey = readStoredApiKey() || CONFIG_GOOGLE_MAPS_API_KEY;
syncApiKeyUi();
syncApiKeyStatusFromServer();
initAddFormCategorySelects();

dom.form.addEventListener("submit", onSubmit);
dom.reloadBtn.addEventListener("click", () => {
  refreshList().catch((error) => log(`讀取失敗：${friendlyError(error)}`));
});
dom.rebuildBtn.addEventListener("click", () => {
  onRebuild();
});
if (dom.syncWeeklyBtn) {
  dom.syncWeeklyBtn.addEventListener("click", () => {
    onSyncWeeklyHours();
  });
}
if (dom.fillMissingHoursBtn) {
  dom.fillMissingHoursBtn.addEventListener("click", () => {
    fillMissingTodayHours().catch((error) => log(`補齊失敗：${friendlyError(error)}`));
  });
}
if (dom.apiKeySaveBtn) {
  dom.apiKeySaveBtn.addEventListener("click", () => {
    saveApiKeyFromInput();
  });
}
if (dom.apiKeyClearBtn) {
  dom.apiKeyClearBtn.addEventListener("click", () => {
    clearApiKey();
  });
}
if (dom.apiKeyTestBtn) {
  dom.apiKeyTestBtn.addEventListener("click", () => {
    testApiKey();
  });
}
if (dom.apiKeyInput) {
  dom.apiKeyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveApiKeyFromInput();
    }
  });
}
if (dom.primaryCategory instanceof HTMLSelectElement && dom.subcategory instanceof HTMLSelectElement) {
  dom.primaryCategory.addEventListener("change", () => {
    syncSubcategoryByPrimary(dom.primaryCategory, dom.subcategory);
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest(".check-dropdown")) return;
  closeAllSubcategoryDropdowns();
});

dom.placeBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.classList.contains("js-fetch-hours")) {
    const rowEditor = target.closest(".place-editor");
    if (!(rowEditor instanceof HTMLElement)) return;
    fetchTodayHoursForRow(rowEditor, target, {
      autoSave: true,
      skipRefreshOnSave: false,
      silentLog: false,
    });
    return;
  }

  if (target.classList.contains("js-save")) {
    const placeId = target.getAttribute("data-id");
    if (!placeId) return;
    const rowEditor = target.closest(".place-editor");
    if (!(rowEditor instanceof HTMLElement)) return;
    saveInlineRow(placeId, rowEditor, target);
    return;
  }

  if (target.classList.contains("js-delete")) {
    const placeId = target.getAttribute("data-id");
    if (!placeId) return;
    const rowEditor = target.closest(".place-editor");
    const nameInput = rowEditor ? rowEditor.querySelector(".js-name") : null;
    const placeName =
      (nameInput instanceof HTMLInputElement ? nameInput.value : "") || target.getAttribute("data-name") || "";
    deleteRow(placeId, placeName, target);
  }
});

dom.placeBody.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (!target.classList.contains("js-primary-category")) return;
  const rowEditor = target.closest(".place-editor");
  if (!(rowEditor instanceof HTMLElement)) return;
  const subcategorySelect = rowEditor.querySelector(".js-subcategory");
  if (!(subcategorySelect instanceof HTMLSelectElement)) return;
  syncSubcategoryByPrimary(target, subcategorySelect);
});

refreshList()
  .then(() => {
    log(`後台已就緒（API：${API_BASE}）`);
    if (!getGoogleMapsApiKey()) {
      log("提示：尚未設定 Google Maps API 金鑰，請先在上方儲存後再使用抓取功能。");
    }
  })
  .catch((error) => log(`初始化失敗：${friendlyError(error)}`));



