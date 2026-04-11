'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType UserEventScript
 *
 * @description [RECORD_TYPE] UserEvent Script
 * @author Taha Aslam
 * @version 1.0.0
 */

import log from 'N/log';

const beforeLoad = (context) => {
  const logTitle = 'q1w_salesorder_ue => beforeLoad';
  try {
    log.debug({ title: logTitle, details: `Type: ${context.type}, ID: ${context.newRecord.id}` });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
  }
};

const beforeSubmit = (context) => {
  const logTitle = 'q1w_salesorder_ue => beforeSubmit';
  try {
    log.debug({ title: logTitle, details: `Type: ${context.type}, ID: ${context.newRecord.id}` });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    if (error.isValidationError) {
      throw error;
    }
  }
};

const afterSubmit = (context) => {
  const logTitle = 'q1w_salesorder_ue => afterSubmit';
  try {
    log.debug({ title: logTitle, details: `Type: ${context.type}, ID: ${context.newRecord.id}` });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
  }
};

export default { beforeLoad, beforeSubmit, afterSubmit };
