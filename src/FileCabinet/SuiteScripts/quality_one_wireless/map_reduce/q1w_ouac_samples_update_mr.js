'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType MapReduceScript
 *
 * @description Reads OUAC samples CSV from File Cabinet, looks up each item by itemid,
 *   and sets custitem_nsc_ouac_samples = 1 when the itemid+type match is unique.
 *   Type-duplicates and not-found itemids are debug-logged in summarize for manual update.
 * @author Taha Aslam
 */

import file from 'N/file';
import log from 'N/log';
import record from 'N/record';
import search from 'N/search';

/** File Cabinet internal ID of netsuite_ouac_samples_update.csv — set before run */
const CSV_FILE_ID = 905598;
const OUAC_SAMPLES_FIELD = 'custitem_nsc_ouac_samples';
const OUAC_SAMPLES_VALUE = 1;
const NOT_FOUND_TYPE = 'NOT_FOUND';

/**
 * Search type (item.type) → record type string for submitFields.
 * Use string literals only — record.Type.* is unavailable during define/load.
 */
const SEARCH_TYPE_TO_RECORD_TYPE = {
  InvtPart: 'inventoryitem',
  Assembly: 'assemblyitem',
  NonInvtPart: 'noninventoryitem',
  Kit: 'kititem',
  Service: 'serviceitem',
  OthCharge: 'otherchargeitem',
  Description: 'descriptionitem',
  Discount: 'discountitem',
  GiftCert: 'giftcertificateitem',
  Group: 'itemgroup',
  Payment: 'paymentitem',
  Subtotal: 'subtotalitem',
  Markup: 'markupitem',
};

/**
 * @param {string} contents
 * @returns {string[]}
 */
const parseCsvItemIds = (contents) => {
  const logTitle = 'q1w_ouac_samples_update_mr => parseCsvItemIds';
  try {
    const itemIds = [];
    const lines = String(contents || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const itemId = (cols[0] || '').trim();
      if (itemId) {
        itemIds.push(itemId);
      }
    }
    return itemIds;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

/**
 * @param {string} itemId
 * @returns {{ itemId: string, internalId: string, type: string }[]}
 */
const searchItemsByItemId = (itemId) => {
  const logTitle = 'q1w_ouac_samples_update_mr => searchItemsByItemId';
  try {
    const results = [];
    search
      .create({
        type: search.Type.ITEM,
        filters: [['itemid', 'is', itemId]],
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'type' }),
          search.createColumn({ name: 'itemid' }),
        ],
      })
      .run()
      .each((result) => {
        results.push({
          itemId,
          internalId: result.getValue({ name: 'internalid' }),
          type: result.getValue({ name: 'type' }),
        });
        return true;
      });
    return results;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, itemId }),
    });
    throw error;
  }
};

/**
 * @param {string} searchType
 * @returns {string}
 */
const toRecordType = (searchType) => {
  const logTitle = 'q1w_ouac_samples_update_mr => toRecordType';
  try {
    const recordType = SEARCH_TYPE_TO_RECORD_TYPE[searchType];
    if (!recordType) {
      throw new Error(`Unsupported item search type: ${searchType}`);
    }
    return recordType;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, searchType }),
    });
    throw error;
  }
};

const getInputData = () => {
  const logTitle = 'q1w_ouac_samples_update_mr => getInputData';
  try {
    if (!CSV_FILE_ID) {
      throw new Error('CSV_FILE_ID is not set. Set the File Cabinet internal ID before running.');
    }
    const csvFile = file.load({ id: CSV_FILE_ID });
    const itemIds = parseCsvItemIds(csvFile.getContents());
    log.audit({ title: logTitle, details: `Loaded ${itemIds.length} itemid(s) from file ${CSV_FILE_ID}` });
    return itemIds;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    return [];
  }
};

const map = (context) => {
  const logTitle = 'q1w_ouac_samples_update_mr => map';
  try {
    const itemId = String(context.value || '').trim();
    if (!itemId) {
      return;
    }

    const matches = searchItemsByItemId(itemId);
    if (!matches.length) {
      context.write({
        key: `${itemId}|${NOT_FOUND_TYPE}`,
        value: JSON.stringify({ itemId, status: 'notFound' }),
      });
      return;
    }

    for (const match of matches) {
      context.write({
        key: `${match.itemId}|${match.type}`,
        value: JSON.stringify({
          itemId: match.itemId,
          internalId: match.internalId,
          type: match.type,
        }),
      });
    }
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
  }
};

const reduce = (context) => {
  const logTitle = 'q1w_ouac_samples_update_mr => reduce';
  try {
    const [itemId, type] = String(context.key).split('|');
    const parsedValues = context.values.map((raw) => JSON.parse(raw));

    if (type === NOT_FOUND_TYPE) {
      context.write({
        key: context.key,
        value: JSON.stringify({ status: 'notFound', itemId }),
      });
      return;
    }

    if (parsedValues.length > 1) {
      const internalIds = parsedValues.map((row) => row.internalId);
      context.write({
        key: context.key,
        value: JSON.stringify({
          status: 'duplicate',
          itemId,
          type,
          internalIds,
        }),
      });
      return;
    }

    const { internalId } = parsedValues[0];
    const recordType = toRecordType(type);

    record.submitFields({
      type: recordType,
      id: internalId,
      values: {
        [OUAC_SAMPLES_FIELD]: OUAC_SAMPLES_VALUE,
      },
    });

    context.write({
      key: context.key,
      value: JSON.stringify({
        status: 'updated',
        itemId,
        type,
        internalId,
      }),
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, key: context.key }),
    });
    context.write({
      key: context.key,
      value: JSON.stringify({
        status: 'error',
        key: context.key,
        message: error.message,
      }),
    });
  }
};

const summarize = (summary) => {
  const logTitle = 'q1w_ouac_samples_update_mr => summarize';
  try {
    let updated = 0;
    let duplicate = 0;
    let notFound = 0;
    let errors = 0;

    summary.output.iterator().each((key, value) => {
      try {
        const row = JSON.parse(value);
        if (row.status === 'duplicate') {
          duplicate += 1;
          log.debug({
            title: `${logTitle} — duplicate (manual update needed)`,
            details: JSON.stringify(row),
          });
        } else if (row.status === 'notFound') {
          notFound += 1;
          log.debug({
            title: `${logTitle} — not found`,
            details: JSON.stringify(row),
          });
        } else if (row.status === 'updated') {
          updated += 1;
        } else if (row.status === 'error') {
          errors += 1;
          log.debug({
            title: `${logTitle} — error row`,
            details: JSON.stringify(row),
          });
        }
      } catch (parseError) {
        errors += 1;
        log.error({
          title: `${logTitle} — output parse`,
          details: JSON.stringify({
            key,
            value,
            message: parseError.message,
            stack: parseError.stack,
          }),
        });
      }
      return true;
    });

    if (summary.inputSummary.error) {
      log.error({
        title: `${logTitle} — input error`,
        details: summary.inputSummary.error,
      });
    }

    summary.mapSummary.errors.iterator().each((key, error) => {
      log.error({ title: `${logTitle} — map error`, details: `${key}: ${error}` });
      return true;
    });

    summary.reduceSummary.errors.iterator().each((key, error) => {
      log.error({ title: `${logTitle} — reduce error`, details: `${key}: ${error}` });
      return true;
    });

    log.audit({
      title: `${logTitle} — complete`,
      details: JSON.stringify({
        updated,
        duplicate,
        notFound,
        errors,
        seconds: summary.seconds,
        usage: summary.usage,
      }),
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
  }
};

export default { getInputData, map, reduce, summarize };
