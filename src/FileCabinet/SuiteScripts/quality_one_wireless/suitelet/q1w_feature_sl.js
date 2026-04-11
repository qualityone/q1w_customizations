'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType Suitelet
 *
 * @description [FEATURE_NAME] Suitelet
 * @author Taha Aslam
 * @version 1.0.0
 */

import log from 'N/log';

const onRequest = (context) => {
  const logTitle = 'q1w_feature_sl => onRequest';
  try {
    log.debug({ title: logTitle, details: `Method: ${context.request.method}` });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
  }
};

export default { onRequest };
