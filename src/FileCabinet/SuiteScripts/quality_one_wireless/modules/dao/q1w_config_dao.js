/**
 * q1w_config_dao.js
 * @NApiVersion 2.1
 */
import log from 'N/log';
import GenericDao from './q1w_base_dao';

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

export default {
  getAll,
};
