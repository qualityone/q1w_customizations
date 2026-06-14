/**
 * q1w_config_dao.js
 * @NApiVersion 2.1
 */
import log from 'N/log';
import query from 'N/query';
import GenericDao from './q1w_base_dao';
import CONSTANTS from '../../constants/q1w_global_constants';

let instance = null;

const INTERNALID = 'customrecord_q1w_integration_config';

const FIELDS = {
  id: 'internalid',
  system: 'custrecord_q1w_ic_system',
  configJson: 'custrecord_q1w_ic_configjson',
  endpoint: 'custrecord_q1w_ic_endpoint',
  username: 'custrecord_q1w_ic_username',
  password: 'custrecord_q1w_ic_password',
  selectiveProducerId: 'custrecord_q1w_ic_slctv_prdcr_dep_id',
  subsidiary: 'custrecord_q1w_ic_subsidiary',
  brand: 'custrecord_q1w_ic_brand',
  location: 'custrecord_q1w_ic_location',
  department: 'custrecord_q1w_ic_department',
  salesChannel: 'custrecord_q1w_ic_sales_channel',
  taxItem: 'custrecord_q1w_ic_tax_item',
};

const initialize = () => {
  if (!instance) {
    instance = GenericDao.initialize({
      internalId: INTERNALID,
      fields: FIELDS,
      identifierField: 'internalid',
    });
  }
};

const getAll = () => {
  try {
    initialize();
    return instance.getAll({
      filters: [['isinactive', 'is', 'F']],
    });
  } catch (ex) {
    log.debug('Errrrrr', ex);
    return [];
  }
};

const getByPartnerName = (partnerName) => {
  const logTitle = 'q1w_config_dao => getByPartnerName';
  try {
    if (!partnerName) {
      return null;
    }
    const sql = `
      SELECT id, name
      FROM customrecord_q1w_integration_config
      WHERE isinactive = 'F'
        AND custrecord_q1w_ic_system = ?
        AND name = ?
    `;
    const results = query
      .runSuiteQL({
        query: sql,
        params: [CONSTANTS.TELGOO5.SYSTEM, partnerName],
      })
      .asMappedResults();

    if (!results || results.length === 0) {
      return null;
    }
    return {
      id: String(results[0].id),
      name: results[0].name,
    };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const getStoreDefaults = (configId) => {
  const logTitle = 'q1w_config_dao => getStoreDefaults';
  try {
    if (!configId) {
      throw new Error('Integration config id is required');
    }
    const { INTEGRATION_CONFIG_FIELDS } = CONSTANTS.MAGICJACK;
    const sql = `
      SELECT
        ${INTEGRATION_CONFIG_FIELDS.SUBSIDIARY} AS subsidiary,
        ${INTEGRATION_CONFIG_FIELDS.BRAND} AS brand,
        ${INTEGRATION_CONFIG_FIELDS.LOCATION} AS location,
        ${INTEGRATION_CONFIG_FIELDS.DEPARTMENT} AS department,
        ${INTEGRATION_CONFIG_FIELDS.SALES_CHANNEL} AS sales_channel,
        ${INTEGRATION_CONFIG_FIELDS.TAX_ITEM} AS tax_item
      FROM ${INTERNALID}
      WHERE id = ?
        AND isinactive = 'F'
    `;
    const results = query
      .runSuiteQL({
        query: sql,
        params: [configId],
      })
      .asMappedResults();

    if (!results || results.length === 0) {
      throw new Error(`Integration config not found: ${configId}`);
    }

    const row = results[0];
    return {
      subsidiary: String(row.subsidiary || ''),
      brand: String(row.brand || ''),
      location: String(row.location || ''),
      department: String(row.department || ''),
      salesChannel: String(row.sales_channel || ''),
      taxItem: String(row.tax_item || ''),
    };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, configId }),
    });
    throw error;
  }
};

export default {
  getAll,
  getByPartnerName,
  getStoreDefaults,
};
