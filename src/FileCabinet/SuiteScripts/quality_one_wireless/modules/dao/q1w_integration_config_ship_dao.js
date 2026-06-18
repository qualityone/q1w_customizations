/**
 * q1w_integration_config_ship_dao.js
 * @NApiVersion 2.1
 * @module q1w_integration_config_ship_dao
 * @description Resolves external shipping codes to NetSuite ship items via integration config child records
 */

import log from 'N/log';
import query from 'N/query';
import record from 'N/record';
import CONSTANTS from '../../constants/q1w_global_constants';

const MODULE = 'q1w_integration_config_ship_dao';
const { SHIP_CONFIG } = CONSTANTS.MAGICJACK;

let shipMappingCache = null;
let shipReverseCache = null;

const normalizeExternalKey = (value = '') => {
  return String(value || '')
    .trim()
    .toUpperCase();
};

const clearCache = () => {
  shipMappingCache = null;
  shipReverseCache = null;
};

const getShipMappingCache = () => {
  if (shipMappingCache) {
    return shipMappingCache;
  }
  const logTitle = `${MODULE} => getShipMappingCache`;
  try {
    const sql = `
      SELECT
        id,
        ${SHIP_CONFIG.INTEGRATION} AS integration_id,
        ${SHIP_CONFIG.EXTERNAL_SHIPPING} AS external_shipping,
        ${SHIP_CONFIG.NETSUITE_SHIPPING} AS ship_method_id
      FROM ${SHIP_CONFIG.RECORD_TYPE}
      WHERE isinactive = 'F'
    `;
    const results = query.runSuiteQL({ query: sql }).asMappedResults() || [];
    shipMappingCache = {};
    shipReverseCache = {};
    results.forEach((row) => {
      const integrationId = String(row.integration_id || '');
      const externalKey = normalizeExternalKey(row.external_shipping);
      const externalShipping = String(row.external_shipping || '').trim();
      const shipMethodId = String(row.ship_method_id || '');
      if (!integrationId || !externalKey) {
        return;
      }
      if (!shipMappingCache[integrationId]) {
        shipMappingCache[integrationId] = {};
      }
      shipMappingCache[integrationId][externalKey] = {
        recordId: String(row.id || ''),
        shipMethodId,
        externalShipping,
      };
      if (shipMethodId) {
        if (!shipReverseCache[integrationId]) {
          shipReverseCache[integrationId] = {};
        }
        shipReverseCache[integrationId][shipMethodId] = externalShipping;
      }
    });
    return shipMappingCache;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const getMappingEntry = ({ integrationId, externalShipMethod }) => {
  const externalKey = normalizeExternalKey(externalShipMethod);
  if (!externalKey) {
    return null;
  }
  const cache = getShipMappingCache();
  return (cache[String(integrationId)] || {})[externalKey] || null;
};

const hasShipMappingRecord = ({ integrationId, externalShipMethod }) => {
  return Boolean(getMappingEntry({ integrationId, externalShipMethod }));
};

const isShipMappingComplete = ({ integrationId, externalShipMethod }) => {
  const entry = getMappingEntry({ integrationId, externalShipMethod });
  return Boolean(entry && entry.shipMethodId);
};

const getShipMethodId = ({ integrationId, externalShipMethod }) => {
  const logTitle = `${MODULE} => getShipMethodId`;
  try {
    const trimmed = String(externalShipMethod || '').trim();
    if (!trimmed) {
      return null;
    }
    const entry = getMappingEntry({ integrationId, externalShipMethod: trimmed });
    return entry && entry.shipMethodId ? entry.shipMethodId : null;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, integrationId, externalShipMethod }),
    });
    throw error;
  }
};

const getExternalShipMethodByNsId = ({ integrationId, shipMethodId }) => {
  const logTitle = `${MODULE} => getExternalShipMethodByNsId`;
  try {
    const nsShipMethodId = String(shipMethodId || '').trim();
    if (!nsShipMethodId || !integrationId) {
      return null;
    }
    getShipMappingCache();
    const reverseEntry = (shipReverseCache[String(integrationId)] || {})[nsShipMethodId];
    return reverseEntry || null;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, integrationId, shipMethodId }),
    });
    throw error;
  }
};

const createShipMappingStub = ({ integrationId, externalShipMethod }) => {
  const logTitle = `${MODULE} => createShipMappingStub`;
  try {
    const trimmed = String(externalShipMethod || '').trim();
    if (!trimmed || !integrationId) {
      throw new Error('integrationId and externalShipMethod are required');
    }
    if (hasShipMappingRecord({ integrationId, externalShipMethod: trimmed })) {
      return null;
    }

    const shipRecord = record.create({
      type: SHIP_CONFIG.RECORD_TYPE,
    });
    shipRecord.setValue({
      fieldId: SHIP_CONFIG.INTEGRATION,
      value: integrationId,
    });
    shipRecord.setValue({
      fieldId: SHIP_CONFIG.EXTERNAL_SHIPPING,
      value: trimmed,
    });
    const recordId = shipRecord.save();
    clearCache();
    log.audit({
      title: logTitle,
      details: JSON.stringify({ integrationId, externalShipMethod: trimmed, recordId }),
    });
    return String(recordId);
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({
        message: error.message,
        stack: error.stack,
        integrationId,
        externalShipMethod,
      }),
    });
    throw error;
  }
};

export default {
  clearCache,
  hasShipMappingRecord,
  isShipMappingComplete,
  getShipMethodId,
  getExternalShipMethodByNsId,
  createShipMappingStub,
};
