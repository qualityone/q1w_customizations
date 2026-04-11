'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType ClientScript
 *
 * @description [RECORD_TYPE] Client Script
 * @author Taha Aslam
 * @version 1.0.0
 */

import log from 'N/log';

const pageInit = (context) => {
  const logTitle = 'q1w_salesorder_cs => pageInit';
  try {
    log.debug({ title: logTitle, details: `Mode: ${context.mode}` });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
  }
};

const fieldChanged = (context) => {
  const logTitle = 'q1w_salesorder_cs => fieldChanged';
  try {
    log.debug({ title: logTitle, details: `Field: ${context.fieldId}` });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
  }
};

const validateField = (context) => {
  const logTitle = 'q1w_salesorder_cs => validateField';
  try {
    log.debug({ title: logTitle, details: `Field: ${context.fieldId}` });
    return true;
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    return true;
  }
};

const validateLine = (context) => {
  const logTitle = 'q1w_salesorder_cs => validateLine';
  try {
    log.debug({ title: logTitle, details: `Sublist: ${context.sublistId}` });
    return true;
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    return true;
  }
};

const saveRecord = (context) => {
  const logTitle = 'q1w_salesorder_cs => saveRecord';
  try {
    log.debug({ title: logTitle, details: `Record ID: ${context.currentRecord.id}` });
    return true;
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    return true;
  }
};

export default { pageInit, fieldChanged, validateField, validateLine, saveRecord };
