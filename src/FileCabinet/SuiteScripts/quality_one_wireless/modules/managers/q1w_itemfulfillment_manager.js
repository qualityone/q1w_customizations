'use strict';

/**
 * @NApiVersion 2.1
 * @module q1w_itemfulfillment_manager
 * @author Q1W
 * @description GRE/BBH device bind on Item Fulfillment create
 */

import log from 'N/log';
import https from 'N/https';
import record from 'N/record';
import ItemFulfillmentDao from '../dao/q1w_itemfulfillment_dao';
import CONSTANTS from '../../constants/q1w_global_constants';

const { BBH, CUSTOM_FIELD_IDS, RECORD_TYPES, SUBLIST_IDS, LINE_FIELDS, GLOBAL } = CONSTANTS;

const generateCorrelationId = () => {
  const logTitle = 'q1w_itemfulfillment_manager => generateCorrelationId';
  try {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      .replace(/[xy]/g, (char) => {
        const randomNibble = Math.floor(Math.random() * 16);
        const value = char === 'x' ? randomNibble : (randomNibble & 0x3) | 0x8;
        return value.toString(16);
      })
      .toUpperCase();
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    throw error;
  }
};

const postDeviceBind = (provisioningCode, serialId) => {
  const logTitle = 'q1w_itemfulfillment_manager => postDeviceBind';
  const correlationId = generateCorrelationId();
  try {
    const requestBody = JSON.stringify({
      CorrelationId: correlationId,
      RequestSource: BBH.REQUEST_SOURCE,
      ProvisioningCode: provisioningCode,
      SerialId: serialId,
    });
    log.debug({ title: `${logTitle} => request body`, details: requestBody });
    const response = https.post({
      url: BBH.DEVICE_BIND_URL,
      headers: {
        Authorization: BBH.AUTHORIZATION,
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });
    log.audit({
      title: logTitle,
      details: JSON.stringify({ correlationId, provisioningCode, serialId, httpCode: response.code }),
    });
    return Number(response.code) === BBH.SUCCESS_HTTP_CODE;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, correlationId, provisioningCode }),
    });
    return false;
  }
};

const getLineData = (fulfillmentRecord, line) => {
  const logTitle = 'q1w_itemfulfillment_manager => getLineData';
  try {
    const itemId = fulfillmentRecord.getSublistValue({
      sublistId: SUBLIST_IDS.ITEM,
      fieldId: LINE_FIELDS.ITEM,
      line,
    });
    if (!itemId) {
      return null;
    }
    const jptCode = String(
      fulfillmentRecord.getSublistValue({
        sublistId: SUBLIST_IDS.ITEM,
        fieldId: CUSTOM_FIELD_IDS.JPT_CODE,
        line,
      }) || ''
    ).trim();
    return { itemId: String(itemId), jptCode };
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack, line }) });
    throw error;
  }
};

/**
 * Reviews item lines in order and stops at the first failure.
 * A line fails when it has no JPT, no matching EDF IMEI, or when the bind API returns non-200.
 * @returns {boolean} true if the fulfillment failed validation
 */
const hasFailedValidation = (fulfillmentRecord) => {
  const logTitle = 'q1w_itemfulfillment_manager => hasFailedValidation';
  try {
    const imeisByItem = ItemFulfillmentDao.getImeisByItem(fulfillmentRecord.id);
    const lineCount = fulfillmentRecord.getLineCount({ sublistId: SUBLIST_IDS.ITEM });
    for (let line = 0; line < lineCount; line += 1) {
      const lineData = getLineData(fulfillmentRecord, line);
      if (!lineData) {
        continue;
      }
      const { itemId, jptCode } = lineData;
      // TODO: assumes one IMEI per line. Handle quantity > 1 (multiple IMEIs per item) properly later.
      const [serialId] = imeisByItem[itemId] || [];
      if (!jptCode || !serialId || !postDeviceBind(jptCode, serialId)) {
        log.audit({ title: logTitle, details: JSON.stringify({ failedLine: line, itemId, jptCode, serialId }) });
        return true;
      }
    }
    return false;
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    return true;
  }
};

const persistValidationFailed = (fulfillmentId) => {
  const logTitle = 'q1w_itemfulfillment_manager => persistValidationFailed';
  try {
    record.submitFields({
      type: RECORD_TYPES.ITEM_FULFILLMENT,
      id: fulfillmentId,
      values: { [CUSTOM_FIELD_IDS.BBH_VALIDATION_FAILED]: GLOBAL.BOOLEAN.TRUE },
      options: { enableSourcing: false, ignoreMandatoryFields: true },
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, fulfillmentId }),
    });
    throw error;
  }
};

const isGreBrand = (fulfillmentRecord) => {
  const logTitle = 'q1w_itemfulfillment_manager => isGreBrand';
  try {
    const brandId = String(fulfillmentRecord.getValue({ fieldId: CUSTOM_FIELD_IDS.BRAND_TRANSACTION }) || '');
    return brandId === String(BBH.BRAND_INTERNAL_ID);
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    throw error;
  }
};

const handleAfterSubmitCreate = (context) => {
  const logTitle = 'q1w_itemfulfillment_manager => handleAfterSubmitCreate';
  try {
    // if (context.type !== USER_EVENT_TYPES.CREATE) {
    //   return;
    // }
    const { newRecord } = context;
    if (!newRecord?.id || !isGreBrand(newRecord)) {
      return;
    }
    if (hasFailedValidation(newRecord)) {
      persistValidationFailed(newRecord.id);
    }
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    throw error;
  }
};

export default {
  handleAfterSubmitCreate,
};
