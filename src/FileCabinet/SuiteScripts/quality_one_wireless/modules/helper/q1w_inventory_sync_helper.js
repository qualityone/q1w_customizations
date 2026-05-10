'use strict';

/**
 * @module q1w_inventory_sync_helper
 * @author Taha Aslam
 * @description Watermark + item search builders for online store quantity Map/Reduce sync
 */

import format from 'N/format';
import log from 'N/log';
import search from 'N/search';

import C from '../../constants/q1w_global_constants';

const logError = (logTitle, error) => {
  log.error({
    title: logTitle,
    details: JSON.stringify({ message: error.message, stack: error.stack }),
  });
};

/**
 * @param {string} fieldScriptId
 * @returns {string} Expected key suffix pattern in map JSON `values` for joined columns
 */
const buildJoinedResultKey = (fieldScriptId) =>
  `${fieldScriptId}.${C.INVENTORY_SYNC.ITEM_SEARCH.ITEM_CUSTOM_RECORD_JOIN}`;

/**
 * Map/Reduce JSON for item search rows mixes shapes: some columns are `{ value, text }` or `[{ … }]`,
 * others (joined fields, quantity, dates) are often plain strings/numbers.
 *
 * @param {Record<string, unknown>} values
 * @param {string} fieldKey
 * @returns {unknown}
 */
const unwrapSearchField = (values, fieldKey) => {
  const raw = values[fieldKey];
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw !== 'object') {
    return raw;
  }
  return Array.isArray(raw) ? raw[0] : raw;
};

/**
 * @param {Record<string, unknown>} values
 * @param {string} fieldKey
 * @returns {string}
 */
const getSearchCellValue = (values, fieldKey) => {
  const cell = unwrapSearchField(values, fieldKey);
  if (cell === null || cell === undefined) {
    return '';
  }
  if (typeof cell !== 'object') {
    return String(cell);
  }
  if (!('value' in cell)) {
    return '';
  }
  const v = cell.value;
  if (v === null || v === undefined) {
    return '';
  }
  return String(v);
};

/**
 * @param {Record<string, unknown>} values
 * @param {string} fieldKey
 * @returns {string}
 */
const getSearchCellText = (values, fieldKey) => {
  const cell = unwrapSearchField(values, fieldKey);
  if (cell === null || cell === undefined) {
    return '';
  }
  if (typeof cell !== 'object') {
    return String(cell);
  }
  if ('text' in cell && cell.text) {
    return String(cell.text);
  }
  if ('value' in cell && cell.value !== null && cell.value !== undefined) {
    return String(cell.value);
  }
  return '';
};

/**
 * @param {string} [fieldId]
 * @returns {boolean} True when field id is a non-empty item custom field (`custitem_*`).
 */
const isValidStoreItemFieldId = (fieldId) => {
  const s = String(fieldId || '').trim();
  return s.startsWith(C.INVENTORY_SYNC.STORE_ITEM_FIELD_ID_PREFIX);
};

/**
 * Loads the webstore config custom record (singleton: first row only via `getRange` 0–1)
 * and returns watermark text for item search `onorafter`. If no row or empty field,
 * returns account-formatted current datetime.
 *
 * @returns {string}
 */
const getWatermarkDateText = () => {
  const logTitle = 'q1w_inventory_sync_helper => getWatermarkDateText';
  try {
    const cfg = C.CUSTOM_RECORDS.ONLINE_WEBSTORE_CONFIG;
    const results = search
      .create({
        type: cfg.ID,
        columns: [
          search.createColumn({ name: C.GLOBAL.INTERNAL_ID }),
          search.createColumn({ name: cfg.FIELDS.LAST_QTY_AVAILABLE_CHANGE }),
        ],
      })
      .run()
      .getRange({ start: 0, end: 1 });

    if (!results.length) {
      return format.format({ value: new Date(), type: format.Type.DATETIME }).replace(/:\d{2}(\s?[ap]m)/i, '$1');
    }

    const raw = results[0].getValue({ name: cfg.FIELDS.LAST_QTY_AVAILABLE_CHANGE });
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return format.format({ value: new Date(), type: format.Type.DATETIME }).replace(/:\d{2}(\s?[ap]m)/i, '$1');
    }
    return String(raw);
  } catch (error) {
    logError(logTitle, error);
    throw error;
  }
};

/**
 * Watermark for kit sync: `LAST_QTY_AVAILABLE_CHANGE_KIT` on singleton config record.
 *
 * @returns {string}
 */
const getKitWatermarkDateText = () => {
  const logTitle = 'q1w_inventory_sync_helper => getKitWatermarkDateText';
  try {
    const cfg = C.CUSTOM_RECORDS.ONLINE_WEBSTORE_CONFIG;
    const fieldKit = cfg.FIELDS.LAST_QTY_AVAILABLE_CHANGE_KIT;
    const results = search
      .create({
        type: cfg.ID,
        columns: [search.createColumn({ name: C.GLOBAL.INTERNAL_ID }), search.createColumn({ name: fieldKit })],
      })
      .run()
      .getRange({ start: 0, end: 1 });

    if (!results.length) {
      return format.format({ value: new Date(), type: format.Type.DATETIME }).replace(/:\d{2}(\s?[ap]m)/i, '$1');
    }

    const raw = results[0].getValue({ name: fieldKit });
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      return format.format({ value: new Date(), type: format.Type.DATETIME }).replace(/:\d{2}(\s?[ap]m)/i, '$1');
    }
    return String(raw);
  } catch (error) {
    logError(logTitle, error);
    throw error;
  }
};

/**
 * Item search that matches nothing (safe fallback when getInputData cannot build real input).
 *
 * @returns {search.Search}
 */
const createNoopItemSearch = () => {
  const logTitle = 'q1w_inventory_sync_helper => createNoopItemSearch';
  try {
    const inv = C.INVENTORY_SYNC.ITEM_SEARCH;
    return search.create({
      type: inv.TYPE,
      filters: [[inv.COLUMNS.INTERNAL_ID, 'anyof', C.INVENTORY_SYNC.NOOP_ITEM_INTERNAL_ID]],
      columns: [search.createColumn({ name: inv.COLUMNS.INTERNAL_ID, label: 'Internal ID' })],
    });
  } catch (error) {
    logError(logTitle, error);
    throw error;
  }
};

/**
 * @param {string} filterDate Text/datetime string for `lastquantityavailablechange` onorafter filter
 * @returns {search.Search}
 */
const createChangedItemsSearch = (filterDate) => {
  const logTitle = 'q1w_inventory_sync_helper => createChangedItemsSearch ';
  try {
    const inv = C.INVENTORY_SYNC.ITEM_SEARCH;
    const join = inv.ITEM_CUSTOM_RECORD_JOIN;
    const cols = inv.COLUMNS;

    return search.create({
      type: inv.TYPE,
      filters: [
        [cols.TYPE, C.GLOBAL.ANY_OF, ...inv.ITEM_TYPES],
        C.GLOBAL.AND,
        [inv.LAST_QTY_CHANGE_FIELD, 'onorafter', filterDate],
        C.GLOBAL.AND,
        [inv.ITEM_LINK_FILTER_FIELD, C.GLOBAL.NONE_OF, C.GLOBAL.NONE],
      ],
      columns: [
        search.createColumn({ name: cols.INTERNAL_ID, label: 'Internal ID' }),
        search.createColumn({ name: cols.ITEM_ID, label: 'Name' }),
        search.createColumn({ name: cols.TYPE, label: 'Type' }),
        search.createColumn({
          name: cols.LAST_QTY_CHANGE,
          label: 'Last Quantity Available Change',
          sort: search.Sort.ASC,
        }),
        search.createColumn({ name: cols.QTY_AVAILABLE, label: 'Available' }),
        search.createColumn({
          name: cols.STORE_ITEM_FIELD,
          join,
          label: 'Online Webstore Item Field',
        }),
        search.createColumn({
          name: cols.BUFFER,
          join,
          label: 'Buffer',
        }),
      ],
    });
  } catch (error) {
    logError(logTitle, error);
    throw error;
  }
};

/**
 * Kit item search: members whose last available-qty change is on/after the kit watermark.
 *
 * @param {string} filterDate Text/datetime for `memberitem.lastquantityavailablechange` onorafter
 * @returns {search.Search}
 */
const createKitChangedItemsSearch = (/*filterDate*/) => {
  const logTitle = 'q1w_inventory_sync_helper => createKitChangedItemsSearch';
  try {
    const kit = C.INVENTORY_SYNC.KIT_SEARCH;
    const join = kit.ITEM_CUSTOM_RECORD_JOIN;
    const memberJoin = kit.MEMBER_ITEM_JOIN;
    const cols = kit.COLUMNS;

    return search.create({
      type: kit.TYPE,
      filters: [
        [cols.TYPE, C.GLOBAL.ANY_OF, ...kit.ITEM_TYPES],
        C.GLOBAL.AND,
        [kit.ITEM_LINK_FILTER_FIELD, C.GLOBAL.NONE_OF, C.GLOBAL.NONE],
        // C.GLOBAL.AND,
        // [kit.MEMBER_LAST_QTY_FILTER_FIELD, 'onorafter', filterDate],
      ],
      columns: [
        search.createColumn({ name: cols.INTERNAL_ID, label: 'Internal ID' }),
        search.createColumn({ name: cols.ITEM_ID, label: 'Kit Item' }),
        search.createColumn({ name: cols.MEMBER_ITEM, label: 'Kit Member Item' }),
        search.createColumn({
          name: cols.MEMBER_QTY_AVAILABLE,
          join: memberJoin,
          label: 'Kit Member Item Available Quantity',
        }),
        search.createColumn({
          name: cols.MEMBER_LAST_QTY_CHANGE,
          join: memberJoin,
          label: 'Kit Member Item Last Quantity Available Change',
          sort: search.Sort.ASC,
        }),
        search.createColumn({ name: cols.MEMBER_QUANTITY, label: 'Member Item Quantity for Kit' }),
        search.createColumn({
          name: cols.BUFFER,
          join,
          label: 'Kit Item Buffer',
        }),
        search.createColumn({
          name: cols.STORE_ITEM_FIELD,
          join,
          label: 'Online Webstore Item Field',
        }),
      ],
    });
  } catch (error) {
    logError(logTitle, error);
    throw error;
  }
};

export default {
  buildJoinedResultKey,
  getSearchCellValue,
  getSearchCellText,
  isValidStoreItemFieldId,
  getWatermarkDateText,
  getKitWatermarkDateText,
  createNoopItemSearch,
  createChangedItemsSearch,
  createKitChangedItemsSearch,
};
