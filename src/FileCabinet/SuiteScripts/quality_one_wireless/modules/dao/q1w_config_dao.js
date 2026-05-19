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

export default {
  getAll,
  getByPartnerName,
};
