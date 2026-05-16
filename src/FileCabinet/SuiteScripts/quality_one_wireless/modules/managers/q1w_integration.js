/**
 * q1w_integration.js
 * @NApiVersion 2.1
 */

import log from 'N/log';
import ConfigDao from '../dao/q1w_config_dao';
import FeatureConfigDao from '../dao/q1w_feature_config_dao';
import Lookup from '../dao/q1w_lookup_table_dao';
import RecordReference from '../dao/q1w_records_reference_dao';
import SyncQueueDao from '../dao/q1w_sync_queue_dao';
import General from '../helper/q1w_general';

let configInstances = null;
let currentConfig = null;
let currentFeatureConfig = null;

const loadConfigs = () => {
  if (!configInstances) {
    configInstances = ConfigDao.getAll() || [];
  }
  return configInstances;
};

const setCurrentConfig = (configId = '') => {
  const configs = loadConfigs();
  const configInstance = configs.filter((elem) => elem.id.toString() === configId.toString()) || [];
  currentConfig = configInstance[0] || {};
  if (currentConfig && currentConfig.configJson && typeof currentConfig.configJson.value === 'string') {
    const configJsonStr = currentConfig.configJson.value || '{}';
    const configJson = JSON.parse(configJsonStr);
    currentConfig.configJson = configJson;
  }
};

const setCurrentFeatureConfig = (feature, configId, routeDetails = {}) => {
  const featureConfigJson = FeatureConfigDao.getFeatureConfig(feature, configId);

  currentFeatureConfig = {
    ...featureConfigJson,
    routeDetails: routeDetails || {},
  };
};

const getCurrentConfig = () => {
  return currentConfig;
};

const getCurrentFeatureConfig = () => {
  return currentFeatureConfig;
};

const upsertFeatureConfig = (featureConfig = {}) => {
  FeatureConfigDao.upsertFeatureConfig({
    ...featureConfig,
    feature: currentFeatureConfig.feature.value,
    id: currentFeatureConfig.id,
    configId: currentConfig.id,
  });
};

const lookupValueByType = (lookupType, lookupKey, allowDefault = true, allowNullReturn = false) => {
  const configIdForLookup = currentConfig.id;
  const valToReturn = Lookup.getLookupValueByType(lookupType, lookupKey, configIdForLookup, allowDefault);

  log.debug('lookupValueByType', {
    lookupType: lookupType || null,
    lookupKey: lookupKey || null,
    value: valToReturn || null,
  });
  return valToReturn || (allowNullReturn ? null : lookupKey);
};

const upsertReference = ({ recordId, recordReference, featureConfigId }) => {
  RecordReference.upsertReference({
    integration: currentConfig.id,
    featureConfig: featureConfigId || currentFeatureConfig.id,
    recordId,
    upsertId: recordReference,
  });
};

const getRecordReference = ({ nsRecordId = null, esRecordId = null, flow, featureName = null }) => {
  return RecordReference.getRecordReference({
    integrationId: currentConfig.id,
    featureId: currentFeatureConfig.id,
    featureName,
    nsRecId: nsRecordId,
    esRecId: esRecordId,
    flow,
  });
};

const getConfigsAndFeatures = (featureInternalId) => {
  const configsMap = {};

  const convertToJson = (searchRes, cols) => {
    const obj = {};
    cols.forEach((elem) => {
      const jsonKey = elem.label;
      obj[jsonKey] = searchRes.getValue(elem);
    });
    if (!obj.featureName) {
      obj.featureName = obj.featureSlug;
    }
    configsMap[obj.configInternalId] = {
      configInternalId: obj.configInternalId,
      configName: obj.configName,
    };
    return obj;
  };

  const filters = [];
  if (featureInternalId) {
    filters.push(['internalid', 'anyof', featureInternalId]);
  } else {
    filters.push(['isinactive', 'is', 'F']);
  }

  const results = General.runSearch(
    {
      searchType: 'customrecord_q1w_feature_config',
      filters,
      cols: [
        {
          name: 'internalid',
          label: 'featureInternalId',
        },
        {
          name: 'internalid',
          join: 'CUSTRECORD_Q1W_FC_CONFIG',
          label: 'configInternalId',
        },
        {
          name: 'custrecord_q1w_ic_slctv_prdcr_dep_id',
          join: 'CUSTRECORD_Q1W_FC_CONFIG',
          label: 'selectiveProducerDeploymentId',
        },
        {
          name: 'name',
          join: 'CUSTRECORD_Q1W_FC_CONFIG',
          label: 'configName',
        },
        {
          name: 'custrecord_q1w_ic_system',
          join: 'CUSTRECORD_Q1W_FC_CONFIG',
          label: 'SystemType',
        },
        {
          name: 'custrecord_q1w_fc_feature_desc',
          label: 'featureName',
        },
        {
          name: 'custrecord_q1w_fc_feature_route_slug',
          label: 'featureRoute',
        },
        {
          name: 'name',
          label: 'featureSlug',
        },
        {
          name: 'custrecord_q1w_fc_sel_cns_scrpt_dplymnt',
          label: 'selectiveConsumerDeployment',
        },
      ],
    },
    convertToJson
  );
  const featuresByConfig = General.groupByProp(results, 'configInternalId') || {};
  const consolidatedObj = {};
  Object.keys(featuresByConfig).forEach((configId) => {
    consolidatedObj[configId] = {
      ...configsMap[configId],
      features: featuresByConfig[configId],
    };
  });

  return consolidatedObj;
};

const getSelectivePendingEntries = ({ configId, action, status }) => {
  return SyncQueueDao.getSelectivePendingEntries({ configId, action, status });
};

const getFailedEntries = ({ configId, action }) => {
  return SyncQueueDao.getFailedEntries({ configId, action });
};

const requeueFailedEntry = ({ configId, action, recordId }) => {
  return SyncQueueDao.requeueForResync({ configId, action, recordId });
};

const upsertSyncQueueEntry = ({ externalSystem, action, recordType, recordId, data = '{}' }) => {
  return SyncQueueDao.upsert({
    externalSystem,
    action,
    recordType,
    recordId,
    data,
  });
};

const getSelectiveSyncEntries = (args) => {
  return SyncQueueDao.getSelectiveSyncEntries(args);
};

const deleteSelectiveOperationEntry = (recId) => {
  return SyncQueueDao.deleteSelectiveOperationEntry(recId);
};

export default {
  loadConfigs,
  setCurrentConfig,
  getCurrentConfig,
  setCurrentFeatureConfig,
  getCurrentFeatureConfig,
  upsertFeatureConfig,
  lookupValueByType,
  upsertReference,
  getConfigsAndFeatures,
  getSelectivePendingEntries,
  getFailedEntries,
  requeueFailedEntry,
  upsertSyncQueueEntry,
  getSelectiveSyncEntries,
  deleteSelectiveOperationEntry,
  getRecordReference,
};
