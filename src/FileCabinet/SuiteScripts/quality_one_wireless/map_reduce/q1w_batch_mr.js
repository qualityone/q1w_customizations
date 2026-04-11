'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType MapReduceScript
 *
 * @description [BATCH_PROCESS_NAME] Map/Reduce Script
 * @author Taha Aslam
 * @version 1.0.0
 */

import log from 'N/log';

const getInputData = () => {
  const logTitle = 'q1w_batch_mr => getInputData';
  try {
    log.debug({ title: logTitle, details: 'Fetching input data' });
    return [];
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    throw error;
  }
};

const map = (context) => {
  const logTitle = 'q1w_batch_mr => map';
  try {
    log.debug({ title: logTitle, details: `Key: ${context.key}` });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
  }
};

const reduce = (context) => {
  const logTitle = 'q1w_batch_mr => reduce';
  try {
    log.debug({ title: logTitle, details: `Key: ${context.key}, Values: ${context.values.length}` });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
  }
};

const summarize = (summary) => {
  const logTitle = 'q1w_batch_mr => summarize';
  try {
    log.audit({ title: logTitle, details: `Time: ${summary.seconds}s, Usage: ${summary.usage}` });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
  }
};

export default { getInputData, map, reduce, summarize };
