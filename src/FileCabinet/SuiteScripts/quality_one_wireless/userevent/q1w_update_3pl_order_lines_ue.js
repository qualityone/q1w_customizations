'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 *
 * @description Sales Order beforeSubmit (Create / Edit). For the 3PL subsidiary:
 *   removes Discount line items, zeroes rate, and sets tax code to Not Taxable on remaining lines.
 * @author Taha Aslam
 */

import log from 'N/log';

import CONSTANTS from '../constants/q1w_global_constants';

const { BODY_FIELDS, SUBSIDIARIES, TAX_CODES, SUBLIST_IDS, LINE_FIELDS, ITEM_TYPES } = CONSTANTS;

/**
 * @param {Object} context - User event context
 */
const beforeSubmit = (context) => {
  const logTitle = 'q1w_update_3pl_order_lines_ue => beforeSubmit';
  const start = Date.now();
  try {
    log.debug({ title: logTitle, details: `Type: ${context.type}, ID: ${context.newRecord.id}` });

    if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.EDIT) {
      return;
    }

    const salesOrder = context.newRecord;

    // const isTestOrder = salesOrder.getValue({ fieldId: CUSTOM_FIELD_IDS.TEST_ORDER });
    // if (!isTestOrder) {
    //   return;
    // }

    const subsidiaryId = String(salesOrder.getValue({ fieldId: BODY_FIELDS.SUBSIDIARY }));
    if (subsidiaryId !== SUBSIDIARIES.THREE_PL) {
      return;
    }

    const sublistId = SUBLIST_IDS.ITEM;
    const lineCount = salesOrder.getLineCount({ sublistId });
    let removed = 0;
    let zeroed = 0;

    // Loop backwards so removeLine does not shift the next indexes.
    for (let i = lineCount - 1; i >= 0; i--) {
      const itemType = salesOrder.getSublistValue({
        sublistId,
        fieldId: LINE_FIELDS.ITEM_TYPE,
        line: i,
      });

      if (itemType === ITEM_TYPES.DISCOUNT) {
        salesOrder.removeLine({ sublistId, line: i });
        removed += 1;
        continue;
      }

      salesOrder.setSublistValue({
        sublistId,
        fieldId: LINE_FIELDS.RATE,
        line: i,
        value: 0,
      });
      salesOrder.setSublistValue({
        sublistId,
        fieldId: LINE_FIELDS.TAX_CODE,
        line: i,
        value: TAX_CODES.NOT_TAXABLE,
      });
      zeroed += 1;
    }

    log.audit({
      title: logTitle,
      details: `subsidiary ${subsidiaryId} | removed discount lines: ${removed} | zeroed lines: ${zeroed}`,
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    if (error.isValidationError) {
      throw error;
    }
  } finally {
    log.audit({ title: logTitle, details: `Duration: ${Date.now() - start}ms` });
  }
};

export default { beforeSubmit };
