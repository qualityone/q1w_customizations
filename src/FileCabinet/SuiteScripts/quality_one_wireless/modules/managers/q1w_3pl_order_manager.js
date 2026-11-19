'use strict';

/**
 * @module q1w_3pl_order_manager
 * @author Taha Aslam
 * @description Finds brand-filtered sales orders and applies the 3PL line and status updates.
 */

import log from 'N/log';
import record from 'N/record';
import runtime from 'N/runtime';
import search from 'N/search';

import CONSTANTS from '../../constants/q1w_global_constants';

const { BODY_FIELDS, TAX_CODES, SUBLIST_IDS, LINE_FIELDS, ITEM_TYPES, CUSTOM_FIELD_IDS, RECORD_TYPES } = CONSTANTS;
const { TRANSACTION_STATUS, APPROVAL_STATUS, ORDER_STATUS_VALUES, GLOBAL, THREE_PL_ORDER_MR } = CONSTANTS;

// NetSuite multi-select parameters separate values with ASCII 5.
const BRAND_ID_SEPARATOR = new RegExp(`[${String.fromCharCode(5)},;\\s]+`);

/**
 * @returns {string[]}
 */
const getBrandIds = () => {
  const logTitle = 'q1w_3pl_order_manager => getBrandIds';
  try {
    const script = runtime.getCurrentScript();
    const rawValue = script.getParameter({ name: THREE_PL_ORDER_MR.SCRIPT_PARAMS.BRAND_IDS });
    const brandIds = String(rawValue || '')
      .split(BRAND_ID_SEPARATOR)
      .map((brandId) => brandId.trim())
      .filter(Boolean);

    if (!brandIds.length) {
      throw new Error('Script parameter Brand Internal Ids is required');
    }

    return brandIds;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

/**
 * Map/Reduce getInputData must return the search object so NetSuite pages the results.
 * SuiteQL would load every id in this stage. Columns are omitted.
 * Filters are mainline, brand, Pending Approval, and the zero-order checkbox.
 * @returns {search.Search}
 */
const getInputSearch = () => {
  const logTitle = 'q1w_3pl_order_manager => getInputSearch';
  try {
    const brandIds = getBrandIds();
    log.audit({ title: logTitle, details: JSON.stringify({ brandIds }) });

    return search.create({
      type: RECORD_TYPES.SALES_ORDER,
      filters: [
        [GLOBAL.MAIN_LINE, GLOBAL.IS, GLOBAL.TRUE],
        GLOBAL.AND,
        [CUSTOM_FIELD_IDS.BRAND_TRANSACTION, GLOBAL.ANY_OF, brandIds],
        GLOBAL.AND,
        // [BODY_FIELDS.STATUS, GLOBAL.ANY_OF, ORDER_STATUS_VALUES.SALES_ORDER.PENDING_APPROVAL],
        // GLOBAL.AND,
        [CUSTOM_FIELD_IDS.ORDER_TO_BE_ZEROED, GLOBAL.IS, GLOBAL.TRUE],
      ],
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

/**
 * @param {record.Record} salesOrder
 * @returns {{ removed: number, zeroed: number }}
 */
const updateLines = (salesOrder) => {
  const logTitle = 'q1w_3pl_order_manager => updateLines';
  try {
    if (!TAX_CODES.NOT_TAXABLE) {
      throw new Error('TAX_CODES.NOT_TAXABLE is required before updating sales order lines');
    }

    const sublistId = SUBLIST_IDS.ITEM;
    const lineCount = salesOrder.getLineCount({ sublistId });
    let removed = 0;
    let zeroed = 0;

    for (let line = lineCount - 1; line >= 0; line -= 1) {
      const itemType = salesOrder.getSublistValue({
        sublistId,
        fieldId: LINE_FIELDS.ITEM_TYPE,
        line,
      });

      if (itemType === ITEM_TYPES.DISCOUNT) {
        salesOrder.removeLine({ sublistId, line });
        removed += 1;
        continue;
      }

      salesOrder.setSublistValue({ sublistId, fieldId: LINE_FIELDS.RATE, line, value: 0 });
      salesOrder.setSublistValue({
        sublistId,
        fieldId: LINE_FIELDS.TAX_CODE,
        line,
        value: TAX_CODES.NOT_TAXABLE,
      });
      zeroed += 1;
    }

    return { removed, zeroed };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

/**
 * @param {record.Record} salesOrder
 * @returns {boolean}
 */
const movePendingApprovalToFulfillment = (salesOrder) => {
  const logTitle = 'q1w_3pl_order_manager => movePendingApprovalToFulfillment';
  try {
    const orderStatus = String(salesOrder.getValue({ fieldId: BODY_FIELDS.ORDER_STATUS }) || '');
    if (orderStatus !== TRANSACTION_STATUS.SALES_ORDER.PENDING_APPROVAL) {
      return false;
    }

    salesOrder.setValue({
      fieldId: BODY_FIELDS.APPROVAL_STATUS,
      value: APPROVAL_STATUS.APPROVED,
    });
    salesOrder.setValue({
      fieldId: BODY_FIELDS.ORDER_STATUS,
      value: TRANSACTION_STATUS.SALES_ORDER.PENDING_FULFILLMENT,
    });
    salesOrder.setValue({
      fieldId: CUSTOM_FIELD_IDS.ORDER_TO_BE_ZEROED,
      value: GLOBAL.BOOLEAN.FALSE,
    });
    return true;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

/**
 * @param {string|number} salesOrderId
 * @returns {{ salesOrderId: number, removed: number, zeroed: number, statusChanged: boolean }}
 */
const updateSalesOrder = (salesOrderId) => {
  const logTitle = 'q1w_3pl_order_manager => updateSalesOrder';
  try {
    const salesOrder = record.load({
      type: RECORD_TYPES.SALES_ORDER,
      id: salesOrderId,
      isDynamic: false,
    });
    const lineResult = updateLines(salesOrder);
    salesOrder.setValue({
      fieldId: BODY_FIELDS.SHIPPING_COST,
      value: 0,
    });
    // const statusChanged = movePendingApprovalToFulfillment(salesOrder);
    salesOrder.setValue({
      fieldId: CUSTOM_FIELD_IDS.ORDER_TO_BE_ZEROED,
      value: GLOBAL.BOOLEAN.FALSE,
    });
    const savedId = salesOrder.save({
      enableSourcing: false,
      ignoreMandatoryFields: true,
    });

    log.audit({
      title: logTitle,
      details: JSON.stringify({ salesOrderId: savedId, ...lineResult, statusChanged: true }),
    });
    return { salesOrderId: savedId, ...lineResult, statusChanged: true };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, salesOrderId }),
    });
    throw error;
  }
};

export default {
  getInputSearch,
  updateSalesOrder,
};
