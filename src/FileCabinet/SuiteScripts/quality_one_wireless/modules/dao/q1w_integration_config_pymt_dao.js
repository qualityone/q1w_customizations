/**
 * q1w_integration_config_pymt_dao.js
 * @NApiVersion 2.1
 * @module q1w_integration_config_pymt_dao
 * @description Resolves external payment methods to NetSuite payment methods via integration config child records
 */

import log from 'N/log';
import query from 'N/query';
import record from 'N/record';
import CONSTANTS from '../../constants/q1w_global_constants';

const MODULE = 'q1w_integration_config_pymt_dao';
const { PAYMENT_CONFIG } = CONSTANTS.MAGICJACK;

let paymentMappingCache = null;

const normalizeExternalKey = (value = '') => {
  return String(value || '')
    .trim()
    .toUpperCase();
};

const clearCache = () => {
  paymentMappingCache = null;
};

const getPaymentMappingCache = () => {
  if (paymentMappingCache) {
    return paymentMappingCache;
  }
  const logTitle = `${MODULE} => getPaymentMappingCache`;
  try {
    const sql = `
      SELECT
        id,
        ${PAYMENT_CONFIG.INTEGRATION} AS integration_id,
        ${PAYMENT_CONFIG.EXTERNAL_PAYMENT} AS external_payment,
        ${PAYMENT_CONFIG.NETSUITE_PAYMENT} AS payment_method_id
      FROM ${PAYMENT_CONFIG.RECORD_TYPE}
      WHERE isinactive = 'F'
    `;
    const results = query.runSuiteQL({ query: sql }).asMappedResults() || [];
    paymentMappingCache = {};
    results.forEach((row) => {
      const integrationId = String(row.integration_id || '');
      const externalKey = normalizeExternalKey(row.external_payment);
      if (!integrationId || !externalKey) {
        return;
      }
      if (!paymentMappingCache[integrationId]) {
        paymentMappingCache[integrationId] = {};
      }
      paymentMappingCache[integrationId][externalKey] = {
        recordId: String(row.id || ''),
        paymentMethodId: String(row.payment_method_id || ''),
      };
    });
    return paymentMappingCache;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const getMappingEntry = ({ integrationId, externalPaymentMethod }) => {
  const externalKey = normalizeExternalKey(externalPaymentMethod);
  if (!externalKey) {
    return null;
  }
  const cache = getPaymentMappingCache();
  return (cache[String(integrationId)] || {})[externalKey] || null;
};

const hasPaymentMappingRecord = ({ integrationId, externalPaymentMethod }) => {
  return Boolean(getMappingEntry({ integrationId, externalPaymentMethod }));
};

const isPaymentMappingComplete = ({ integrationId, externalPaymentMethod }) => {
  const entry = getMappingEntry({ integrationId, externalPaymentMethod });
  return Boolean(entry && entry.paymentMethodId);
};

const getPaymentMethodId = ({ integrationId, externalPaymentMethod }) => {
  const logTitle = `${MODULE} => getPaymentMethodId`;
  try {
    const trimmed = String(externalPaymentMethod || '').trim();
    if (!trimmed) {
      return null;
    }
    const entry = getMappingEntry({ integrationId, externalPaymentMethod: trimmed });
    return entry && entry.paymentMethodId ? entry.paymentMethodId : null;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({
        message: error.message,
        stack: error.stack,
        integrationId,
        externalPaymentMethod,
      }),
    });
    throw error;
  }
};

const createPaymentMappingStub = ({ integrationId, externalPaymentMethod }) => {
  const logTitle = `${MODULE} => createPaymentMappingStub`;
  try {
    const trimmed = String(externalPaymentMethod || '').trim();
    if (!trimmed || !integrationId) {
      throw new Error('integrationId and externalPaymentMethod are required');
    }
    if (hasPaymentMappingRecord({ integrationId, externalPaymentMethod: trimmed })) {
      return null;
    }

    const paymentRecord = record.create({
      type: PAYMENT_CONFIG.RECORD_TYPE,
    });
    paymentRecord.setValue({
      fieldId: PAYMENT_CONFIG.INTEGRATION,
      value: integrationId,
    });
    paymentRecord.setValue({
      fieldId: PAYMENT_CONFIG.EXTERNAL_PAYMENT,
      value: trimmed,
    });
    const recordId = paymentRecord.save();
    clearCache();
    log.audit({
      title: logTitle,
      details: JSON.stringify({ integrationId, externalPaymentMethod: trimmed, recordId }),
    });
    return String(recordId);
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({
        message: error.message,
        stack: error.stack,
        integrationId,
        externalPaymentMethod,
      }),
    });
    throw error;
  }
};

export default {
  clearCache,
  hasPaymentMappingRecord,
  isPaymentMappingComplete,
  getPaymentMethodId,
  createPaymentMappingStub,
};
