'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType MapReduceScript
 *
 * @description Syncs per–online-store item quantity fields for Assembly/Inventory items whose
 *   quantity available changed since the last run (watermark on `customrecord_q1w_online_webstore_config`).
 *   Watermark uses `lastquantityavailablechange` text as returned by search; reduce keeps the last value
 *   seen for the item, and summarize keeps the last reduce output (iterator order), not a max parse.
 * @author Taha Aslam
 */

import log from 'N/log';
import record from 'N/record';
import search from 'N/search';

import C from '../constants/q1w_global_constants';
import H from '../modules/helper/q1w_inventory_sync_helper';

const getInputData = () => {
  const logTitle = 'q1w_item_inventory_sync_mr => getInputData';
  try {
    const filterDate = H.getWatermarkDateText();
    return H.createChangedItemsSearch(filterDate);
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    log.audit({
      title: logTitle,
      details: 'Returning no-op item search; fix errors and re-run.',
    });
    return H.createNoopItemSearch();
  }
};

const map = (context) => {
  const logTitle = 'q1w_item_inventory_sync_mr => map';
  if (context.isRestarted) {
    log.audit({ title: `${logTitle} — restarted`, details: context.key });
  }
  try {
    const row = JSON.parse(context.value);
    const { values } = row;
    const cols = C.INVENTORY_SYNC.ITEM_SEARCH.COLUMNS;

    const itemId = H.getSearchCellValue(values, cols.INTERNAL_ID);
    const quantityAvailable = parseFloat(H.getSearchCellValue(values, cols.QTY_AVAILABLE)) || 0;
    const itemType = H.getSearchCellValue(values, cols.TYPE);

    // Joined keys use `fieldScriptId.JOINID` (e.g. custrecord_q1w_buffer.CUSTRECORD_Q1W_ITEM). MR JSON may return
    // those as plain strings; `getSearchCellValue` handles both that and `{ value, text }` shapes.
    const bufferKey = H.buildJoinedResultKey(cols.BUFFER);
    const storeFieldKey = H.buildJoinedResultKey(cols.STORE_ITEM_FIELD);
    const buffer = parseInt(H.getSearchCellValue(values, bufferKey), 10) || 0;
    const storeItemField = H.getSearchCellValue(values, storeFieldKey);

    const lastQtyChangeText = H.getSearchCellText(values, cols.LAST_QTY_CHANGE);

    if (!storeItemField) {
      log.audit({ title: `${logTitle} — skipping, no storeItemField`, details: itemId });
      return;
    }

    if (!H.isValidStoreItemFieldId(storeItemField)) {
      log.audit({
        title: `${logTitle} — skipping, storeItemField must start with ${C.INVENTORY_SYNC.STORE_ITEM_FIELD_ID_PREFIX}`,
        details: `${itemId} | ${storeItemField}`,
      });
      return;
    }

    context.write({
      key: itemId,
      value: JSON.stringify({
        quantityAvailable,
        buffer,
        storeItemField,
        lastQtyChangeText,
        itemType,
      }),
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
  }
};

const reduce = (context) => {
  const logTitle = 'q1w_item_inventory_sync_mr => reduce';
  if (context.isRestarted) {
    log.audit({ title: `${logTitle} — restarted`, details: context.key });
  }
  try {
    const itemId = context.key;
    let lastQtyChangeText = '';
    /** @type {Map<string, { storeItemField: string, finalQty: number, itemType: string }>} */
    const byStoreField = new Map();

    for (const rawValue of context.values) {
      try {
        const parsed = JSON.parse(rawValue);
        const { quantityAvailable, buffer, storeItemField, lastQtyChangeText: rowChangeText, itemType } = parsed;
        lastQtyChangeText = rowChangeText;
        if (!H.isValidStoreItemFieldId(storeItemField)) {
          log.audit({
            title: `${logTitle} — skipping invalid storeItemField`,
            details: `${itemId} | ${String(storeItemField)}`,
          });
          continue;
        }
        const finalQty = Math.max(0, quantityAvailable + buffer);
        byStoreField.set(storeItemField, { storeItemField, finalQty, itemType });
        log.audit({
          title: `${logTitle} — item ${itemId} / ${storeItemField}`,
          details: `qty=${quantityAvailable} buf=${buffer} final=${finalQty}`,
        });
      } catch (parseErr) {
        log.error({
          title: `${logTitle} — parse error item ${itemId}`,
          details: JSON.stringify({ message: parseErr.message, stack: parseErr.stack }),
        });
      }
    }

    const storeUpdates = [...byStoreField.values()].filter((u) => H.isValidStoreItemFieldId(u.storeItemField));
    if (!storeUpdates.length) {
      return;
    }

    const firstType = storeUpdates[0].itemType;
    const recordType = firstType === 'Assembly' ? record.Type.ASSEMBLY_ITEM : record.Type.INVENTORY_ITEM;

    const itemRecord = record.load({
      type: recordType,
      id: parseInt(itemId, 10),
      isDynamic: false,
    });

    for (const { storeItemField, finalQty } of storeUpdates) {
      itemRecord.setValue({ fieldId: storeItemField, value: finalQty });
    }
    itemRecord.save({ ignoreMandatoryFields: true });
    log.audit({
      title: `${logTitle} — saved item ${itemId}`,
      details: `${storeUpdates.length} field(s) updated`,
    });

    if (lastQtyChangeText) {
      context.write({
        key: C.INVENTORY_SYNC.MR_OUTPUT_KEY_LAST_QTY_CHANGE,
        value: lastQtyChangeText,
      });
    }
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
  }
};

const summarize = (context) => {
  const logTitle = 'q1w_item_inventory_sync_mr => summarize';
  try {
    context.mapSummary.errors.iterator().each((key, err) => {
      log.error({ title: `${logTitle} — map error ${key}`, details: String(err) });
      return true;
    });
    context.reduceSummary.errors.iterator().each((key, err) => {
      log.error({ title: `${logTitle} — reduce error ${key}`, details: String(err) });
      return true;
    });

    // Last `lastQtyChange` value wins (not chronological max); pairs with search sort on the column if needed.
    let watermarkText = '';
    context.output.iterator().each((key, value) => {
      if (key === C.INVENTORY_SYNC.MR_OUTPUT_KEY_LAST_QTY_CHANGE) {
        watermarkText = String(value);
      }
      return true;
    });

    if (!watermarkText.trim()) {
      log.audit({ title: `${logTitle} — no date to update`, details: '' });
      return;
    }

    // Same singleton assumption as `getWatermarkDateText`: one config row; first row only.
    const cfg = C.CUSTOM_RECORDS.ONLINE_WEBSTORE_CONFIG;
    const configRows = search
      .create({
        type: cfg.ID,
        columns: [search.createColumn({ name: C.GLOBAL.INTERNAL_ID })],
      })
      .run()
      .getRange({ start: 0, end: 1 });

    if (!configRows.length) {
      throw new Error(C.ERROR_MESSAGES.RECORD_NOT_FOUND);
    }

    const configRecordId = configRows[0].id;

    record.submitFields({
      type: cfg.ID,
      id: configRecordId,
      values: {
        [cfg.FIELDS.LAST_QTY_AVAILABLE_CHANGE]: watermarkText,
      },
    });
    log.audit({ title: `${logTitle} — config updated`, details: watermarkText });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
  }

  try {
    log.audit({
      title: `${logTitle} — complete`,
      details: `input: ${context.inputSummary.seconds}s | map: ${context.mapSummary.seconds}s | reduce: ${context.reduceSummary.seconds}s`,
    });
  } catch (auditErr) {
    log.error({
      title: `${logTitle} — timing audit`,
      details: JSON.stringify({ message: auditErr.message, stack: auditErr.stack }),
    });
  }
};

export default { getInputData, map, reduce, summarize };
