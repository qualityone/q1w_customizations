'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType ScheduledScript
 *
 * @description Computes per–store kit quantities from member availability (min floor + buffer) and
 *   updates kit `custitem_*` fields; advances `LAST_QTY_AVAILABLE_CHANGE_KIT` on webstore config.
 * @author Taha Aslam
 */

import log from 'N/log';
import record from 'N/record';
import search from 'N/search';

import C from '../constants/q1w_global_constants';
import H from '../modules/helper/q1w_inventory_sync_helper';
import taskSs from './q1w_task_ss';

const PAGE_SIZE = 1000;
const GOVERNANCE_THRESHOLD = 5000;

/**
 * @param {search.Result} result
 * @param {{ value: string }} lastMemberChangeRef
 * @param {Map<string, { kitInternalId: string, storeField: string, buffer: number, memberFloors: Map<string, number> }>} groups
 */
const accumulateKitRow = (result, lastMemberChangeRef, groups) => {
  const kit = C.INVENTORY_SYNC.KIT_SEARCH;
  const cols = kit.COLUMNS;
  const memberJoin = kit.MEMBER_ITEM_JOIN;
  const crJoin = kit.ITEM_CUSTOM_RECORD_JOIN;

  const kitInternalId = String(result.getValue({ name: cols.INTERNAL_ID }) || '');
  const memberId = String(result.getValue({ name: cols.MEMBER_ITEM }) || '');

  const availRaw = result.getValue({ name: cols.MEMBER_QTY_AVAILABLE, join: memberJoin });
  const avail = parseFloat(String(availRaw)) || 0;

  const lastChangeText =
    result.getText({ name: cols.MEMBER_LAST_QTY_CHANGE, join: memberJoin }) ||
    String(result.getValue({ name: cols.MEMBER_LAST_QTY_CHANGE, join: memberJoin }) || '');
  lastMemberChangeRef.value = lastChangeText;

  const memberQty = parseFloat(String(result.getValue({ name: cols.MEMBER_QUANTITY }) || '0')) || 0;

  const bufferRaw = result.getValue({ name: cols.BUFFER, join: crJoin });
  const buffer = parseInt(String(bufferRaw), 10) || 0;

  const storeField = String(result.getValue({ name: cols.STORE_ITEM_FIELD, join: crJoin }) || '').trim();

  if (!kitInternalId || !memberId) {
    return;
  }

  if (!H.isValidStoreItemFieldId(storeField)) {
    log.audit({
      title: 'q1w_kit_inventory_sync_ss => accumulateKitRow',
      details: `skip invalid store field | kit=${kitInternalId} | ${storeField}`,
    });
    return;
  }

  if (memberQty <= 0) {
    log.audit({
      title: 'q1w_kit_inventory_sync_ss => accumulateKitRow',
      details: `skip memberQty<=0 | kit=${kitInternalId} | member=${memberId}`,
    });
    return;
  }

  const floor = Math.floor(avail / memberQty);
  const gKey = `${kitInternalId}|${storeField}`;
  if (!groups.has(gKey)) {
    groups.set(gKey, {
      kitInternalId,
      storeField,
      buffer,
      memberFloors: new Map(),
    });
  }
  const g = groups.get(gKey);
  g.memberFloors.set(memberId, floor);
  g.buffer = buffer;
};

const execute = (context) => {
  const logTitle = 'q1w_kit_inventory_sync_ss => execute';
  try {
    log.audit({ title: logTitle, details: `Type: ${context.type}` });
    const filterDate = H.getKitWatermarkDateText();
    const kitSearch = H.createKitChangedItemsSearch(filterDate);
    const paged = kitSearch.runPaged({ pageSize: PAGE_SIZE });

    /** @type {Map<string, { kitInternalId: string, storeField: string, buffer: number, memberFloors: Map<string, number> }>} */
    const groups = new Map();
    const lastMemberChangeRef = { value: '' };
    let aborted = false;

    paged.pageRanges.forEach((pageRange) => {
      if (aborted) {
        return;
      }
      if (!taskSs.checkGovernance(GOVERNANCE_THRESHOLD)) {
        aborted = true;
        return;
      }
      const page = paged.fetch({ index: pageRange.index });
      page.data.forEach((result) => {
        if (aborted) {
          return;
        }
        if (!taskSs.checkGovernance(GOVERNANCE_THRESHOLD)) {
          aborted = true;
          return;
        }
        accumulateKitRow(result, lastMemberChangeRef, groups);
      });
    });

    if (aborted) {
      log.audit({ title: logTitle, details: 'Stopped for governance; rescheduled continuation.' });
      return;
    }

    /** @type {Map<string, Map<string, number>>} */
    const kitToFields = new Map();
    groups.forEach((g) => {
      if (!g.memberFloors.size) {
        return;
      }
      const floors = [...g.memberFloors.values()];
      const minFloor = Math.min(...floors);
      const finalQty = Math.max(0, minFloor + g.buffer);
      if (!kitToFields.has(g.kitInternalId)) {
        kitToFields.set(g.kitInternalId, new Map());
      }
      kitToFields.get(g.kitInternalId).set(g.storeField, finalQty);
    });

    for (const [kitIdStr, fieldMap] of kitToFields) {
      const logTitleSave = 'q1w_kit_inventory_sync_ss => saveKit';
      try {
        if (!taskSs.checkGovernance(GOVERNANCE_THRESHOLD)) {
          aborted = true;
          break;
        }
        const kitRec = record.load({
          type: record.Type.KIT_ITEM,
          id: parseInt(kitIdStr, 10),
          isDynamic: false,
        });
        fieldMap.forEach((qty, fieldId) => {
          kitRec.setValue({ fieldId, value: qty });
        });
        kitRec.save({ ignoreMandatoryFields: true });
        log.audit({
          title: logTitleSave,
          details: `kit ${kitIdStr} | ${fieldMap.size} field(s)`,
        });
      } catch (saveErr) {
        log.error({
          title: logTitleSave,
          details: JSON.stringify({ message: saveErr.message, stack: saveErr.stack }),
        });
      }
    }

    if (aborted) {
      return;
    }

    if (lastMemberChangeRef.value.trim()) {
      const cfg = C.CUSTOM_RECORDS.ONLINE_WEBSTORE_CONFIG;
      const configRows = search
        .create({
          type: cfg.ID,
          columns: [search.createColumn({ name: C.GLOBAL.INTERNAL_ID })],
        })
        .run()
        .getRange({ start: 0, end: 1 });

      if (configRows.length) {
        record.submitFields({
          type: cfg.ID,
          id: configRows[0].id,
          values: {
            [cfg.FIELDS.LAST_QTY_AVAILABLE_CHANGE_KIT]: lastMemberChangeRef.value,
          },
        });
        log.audit({ title: `${logTitle} — config kit watermark`, details: lastMemberChangeRef.value });
      }
    }

    log.audit({ title: `${logTitle} — done`, details: `groups=${groups.size} kits=${kitToFields.size}` });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
  }
};

export default { execute };
