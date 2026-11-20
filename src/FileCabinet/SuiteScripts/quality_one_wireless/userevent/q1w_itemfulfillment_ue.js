'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 *
 * @description Item Fulfillment User Event — GRE/BBH device bind on create
 * @author Q1W
 * @version 1.0.0
 */

import log from 'N/log';
import ItemFulfillmentManager from '../modules/managers/q1w_itemfulfillment_manager';

const afterSubmit = (context) => {
  const logTitle = 'q1w_itemfulfillment_ue => afterSubmit';
  const startTime = Date.now();
  try {
    log.debug({ title: logTitle, details: `Type: ${context.type}, ID: ${context.newRecord.id}` });
    ItemFulfillmentManager.handleAfterSubmitCreate(context);
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
  } finally {
    log.audit({ title: logTitle, details: `Duration ms: ${Date.now() - startTime}` });
  }
};

export default { afterSubmit };
