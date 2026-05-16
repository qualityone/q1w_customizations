/**
 * q1w_feature_config_dao.js
 * @NApiVersion 2.1
 */

import GenericDao from './q1w_base_dao';

let instance = null;

const INTERNALID = 'customrecord_q1w_feature_config';

const FIELDS = {
  id: 'internalid',
  featureName: 'name',
  feature: 'custrecord_q1w_fc_feature_route_slug',
  configId: 'custrecord_q1w_fc_config',
  lastSyncTimeStampStr: 'custrecord_q1w_fc_lst_sync_tmst_str',
  lastSyncTimeStampDate: 'custrecord_q1w_fc_lst_sync_tmst_ns',
  configJson: 'custrecord_q1w_fc_config_json',
  selectiveConsumerDeployment: 'custrecord_q1w_fc_sel_cns_scrpt_dplymnt',
  golive_date: 'custrecord_q1w_fc_golivedate',
  golive_date_node: 'custrecord_q1w_fc_golive_node',
  golive_date_format: 'custrecord_q1w_fc_golive_dateformat',
};

const initialize = () => {
  if (!instance) {
    instance = GenericDao.initialize({
      internalId: INTERNALID,
      fields: FIELDS,
      identifierField: 'feature',
    });
  }
};

const getAll = () => {
  initialize();
  return instance.getAll({
    filters: [['isinactive', 'is', 'F']],
  });
};

const getFeatureConfig = (feature, configId) => {
  initialize();
  const instanceToReturn =
    instance.getAll({
      filters: [[FIELDS.feature, 'is', feature], 'AND', [FIELDS.configId, 'is', configId]],
    })[0] || null;
  if (instanceToReturn) {
    const jsonConf = instanceToReturn.configJson.value || '{}';
    instanceToReturn.configJson = JSON.parse(jsonConf);
  } else {
    throw new Error(`Feature Config not setup for ${feature}`);
  }
  return instanceToReturn;
};

const upsertFeatureConfig = (args) => {
  initialize();
  const params = { ...args };
  if (!params.id) {
    const recs = instance.getAll({
      filters: [[FIELDS.feature, 'is', args.feature], 'AND', [FIELDS.configId, 'is', args.configId]],
    });

    if (recs.length > 0) {
      params.id = recs[0].id;
    }
  }
  if (params.configJson && typeof params.configJson !== 'string') {
    params.configJson = JSON.stringify(params.configJson.value || {});
  }
  return instance.upsert(params);
};

export default {
  getAll,
  getFeatureConfig,
  upsertFeatureConfig,
};
