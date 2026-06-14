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
import ShipConfigDao from '../dao/q1w_integration_config_ship_dao';
import PaymentConfigDao from '../dao/q1w_integration_config_pymt_dao';
import InventoryItemDao from '../dao/q1w_inventory_item_dao';
import General from '../helper/q1w_general';
import CONSTANTS from '../../constants/q1w_global_constants';

const { MAGICJACK } = CONSTANTS;

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

const getStoreDefaults = () => {
  const logTitle = 'q1w_integration => getStoreDefaults';
  try {
    if (!currentConfig || !currentConfig.id) {
      throw new Error('Current integration config is not set');
    }
    const storeDefaults = ConfigDao.getStoreDefaults(currentConfig.id);
    const requiredFields = ['subsidiary', 'brand', 'location', 'department', 'salesChannel', 'taxItem'];
    const missingFields = requiredFields.filter((fieldId) => !storeDefaults[fieldId]);
    if (missingFields.length > 0) {
      throw new Error(`Integration config missing required store defaults: ${missingFields.join(', ')}`);
    }
    return storeDefaults;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const getUniqueShipMethodsFromCsvRows = (csvRows = []) => {
  const shipMethods = new Set();
  csvRows.forEach((csvRow) => {
    if (!Array.isArray(csvRow)) {
      return;
    }
    const shipMethod = String(csvRow[MAGICJACK.CSV_COLUMNS.SHIP_METHOD] || '').trim();
    if (shipMethod) {
      shipMethods.add(shipMethod);
    }
  });
  return Array.from(shipMethods);
};

const resolveShipMethod = (externalShipMethod) => {
  const logTitle = 'q1w_integration => resolveShipMethod';
  try {
    const trimmed = String(externalShipMethod || '').trim();
    if (!trimmed) {
      return null;
    }
    if (
      !ShipConfigDao.hasShipMappingRecord({
        integrationId: currentConfig.id,
        externalShipMethod: trimmed,
      })
    ) {
      throw new Error(`Ship method mapping record not found for: ${trimmed}`);
    }
    if (
      !ShipConfigDao.isShipMappingComplete({
        integrationId: currentConfig.id,
        externalShipMethod: trimmed,
      })
    ) {
      throw new Error(`Ship method mapping not configured in NetSuite for: ${trimmed}`);
    }
    return ShipConfigDao.getShipMethodId({
      integrationId: currentConfig.id,
      externalShipMethod: trimmed,
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, externalShipMethod }),
    });
    throw error;
  }
};

const validatePaymentMapping = () => {
  const externalPaymentMethod = MAGICJACK.RAW_PAYMENT_METHOD;
  if (
    !PaymentConfigDao.hasPaymentMappingRecord({
      integrationId: currentConfig.id,
      externalPaymentMethod,
    })
  ) {
    throw new Error(`Payment method mapping record not found for: ${externalPaymentMethod}`);
  }
  if (
    !PaymentConfigDao.isPaymentMappingComplete({
      integrationId: currentConfig.id,
      externalPaymentMethod,
    })
  ) {
    throw new Error(`Payment method mapping not configured in NetSuite for: ${externalPaymentMethod}`);
  }
};

const ensureOrderMappingStubs = (csvRows = []) => {
  const logTitle = 'q1w_integration => ensureOrderMappingStubs';
  try {
    if (!currentConfig || !currentConfig.id) {
      throw new Error('Current integration config is not set');
    }
    let createdCount = 0;
    const uniqueShipMethods = getUniqueShipMethodsFromCsvRows(csvRows);
    uniqueShipMethods.forEach((shipMethod) => {
      const recordId = ShipConfigDao.createShipMappingStub({
        integrationId: currentConfig.id,
        externalShipMethod: shipMethod,
      });
      if (recordId) {
        createdCount += 1;
      }
    });

    const paymentRecordId = PaymentConfigDao.createPaymentMappingStub({
      integrationId: currentConfig.id,
      externalPaymentMethod: MAGICJACK.RAW_PAYMENT_METHOD,
    });
    if (paymentRecordId) {
      createdCount += 1;
    }

    if (createdCount > 0) {
      ShipConfigDao.clearCache();
      PaymentConfigDao.clearCache();
    }

    log.debug({
      title: logTitle,
      details: JSON.stringify({
        integrationId: currentConfig.id,
        uniqueShipMethods,
        createdCount,
      }),
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const validateOrderMappings = (csvRows = []) => {
  const logTitle = 'q1w_integration => validateOrderMappings';
  try {
    validatePaymentMapping();
    const uniqueShipMethods = getUniqueShipMethodsFromCsvRows(csvRows);
    uniqueShipMethods.forEach((shipMethod) => {
      if (
        !ShipConfigDao.hasShipMappingRecord({
          integrationId: currentConfig.id,
          externalShipMethod: shipMethod,
        })
      ) {
        throw new Error(`Ship method mapping record not found for: ${shipMethod}`);
      }
      if (
        !ShipConfigDao.isShipMappingComplete({
          integrationId: currentConfig.id,
          externalShipMethod: shipMethod,
        })
      ) {
        throw new Error(`Ship method mapping not configured in NetSuite for: ${shipMethod}`);
      }
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const validatePaymentMethod = () => {
  const logTitle = 'q1w_integration => validatePaymentMethod';
  try {
    validatePaymentMapping();
    return PaymentConfigDao.getPaymentMethodId({
      integrationId: currentConfig.id,
      externalPaymentMethod: MAGICJACK.RAW_PAYMENT_METHOD,
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const resolveItemBySku = (sku) => {
  const logTitle = 'q1w_integration => resolveItemBySku';
  try {
    const trimmed = String(sku || '').trim();
    if (!trimmed) {
      throw new Error('Item SKU is required');
    }
    const itemInternalId = InventoryItemDao.getItemInternalIdBySku(trimmed);
    if (!itemInternalId) {
      throw new Error(`NetSuite item not found for SKU: ${trimmed}`);
    }
    return itemInternalId;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, sku }),
    });
    throw error;
  }
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
  getStoreDefaults,
  resolveShipMethod,
  validatePaymentMethod,
  ensureOrderMappingStubs,
  validateOrderMappings,
  resolveItemBySku,
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
