'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType MapReduceScript
 *
 * @description Sales orders for the deployment's brand internal ids: remove Discount lines,
 *   set rate to 0, set tax code to Not Taxable, and move Pending Approval to Pending Fulfillment.
 * @author Taha Aslam
 */

import log from 'N/log';

import threePlOrderManager from '../modules/managers/q1w_3pl_order_manager';
import CONSTANTS from '../constants/q1w_global_constants';

const OUTPUT_KEYS = CONSTANTS.THREE_PL_ORDER_MR.MR_OUTPUT_KEYS;

const getInputData = () => {
  const logTitle = 'q1w_3pl_order_mr => getInputData';
  try {
    log.debug({ title: logTitle, details: 'Building sales order search' });
    return threePlOrderManager.getInputSearch();
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

/**
 * @param {object} context
 * @returns {string}
 */
const resolveSalesOrderId = (context) => {
  const logTitle = 'q1w_3pl_order_mr => resolveSalesOrderId';
  try {
    const parsed = JSON.parse(context.value);
    return String(parsed.id || context.key || '');
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, key: context.key }),
    });
    throw error;
  }
};

const map = (context) => {
  const logTitle = 'q1w_3pl_order_mr => map';
  try {
    const salesOrderId = resolveSalesOrderId(context);
    if (!salesOrderId) {
      log.audit({ title: logTitle, details: `Skipping empty sales order id: ${context.value}` });
      return;
    }

    log.debug({ title: logTitle, details: `Sales order ${salesOrderId}` });
    threePlOrderManager.updateSalesOrder(salesOrderId);
    context.write({ key: OUTPUT_KEYS.UPDATED, value: salesOrderId });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, key: context.key }),
    });
    context.write({ key: OUTPUT_KEYS.ERRORS, value: String(context.key || '') });
  }
};

/**
 * @param {string} outputKey
 * @param {object} summaryContext
 * @returns {number}
 */
const countOutput = (outputKey, summaryContext) => {
  const logTitle = 'q1w_3pl_order_mr => countOutput';
  try {
    let total = 0;
    summaryContext.output.iterator().each((key) => {
      if (key === outputKey) {
        total += 1;
      }
      return true;
    });
    return total;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, outputKey }),
    });
    throw error;
  }
};

const summarize = (summaryContext) => {
  const logTitle = 'q1w_3pl_order_mr => summarize';
  try {
    summaryContext.mapSummary.errors.iterator().each((key, err) => {
      log.error({ title: `${logTitle} — map error ${key}`, details: String(err) });
      return true;
    });

    log.audit({
      title: `${logTitle} — complete`,
      details: JSON.stringify({
        updated: countOutput(OUTPUT_KEYS.UPDATED, summaryContext),
        errors: countOutput(OUTPUT_KEYS.ERRORS, summaryContext),
        inputErrors: summaryContext.inputSummary.error,
        seconds: summaryContext.seconds,
        usage: summaryContext.usage,
      }),
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
  }
};

export default { getInputData, map, summarize };
