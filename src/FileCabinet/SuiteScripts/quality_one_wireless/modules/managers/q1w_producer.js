/**
 * q1w_producer.js
 * @NApiVersion 2.1
 */

import log from 'N/log';
import General from '../helper/q1w_general';
import Integration from './q1w_integration';
import SyncQueueDao from '../dao/q1w_sync_queue_dao';
import FailedRecordsDao from '../dao/q1w_failed_records_dao';

// eslint-disable-next-line no-unused-vars
let nsModule = null;
// eslint-disable-next-line no-unused-vars
let esModule = null;

let currentConfig = null;
let currentFeatureConfig = null;

const defaultGetModulesCallBack = () => {
  return {
    nsModule: {},
    esModule: {},
  };
};

const produceRecords = (produceCallBack, featureConfigObjectCb, getModulesCallback = defaultGetModulesCallBack) => {
  currentConfig = Integration.getCurrentConfig();
  currentFeatureConfig = Integration.getCurrentFeatureConfig();
  const { routeDetails } = currentFeatureConfig;
  const { nsModule: nsModuleExternal, esModule: esModuleExternal } = getModulesCallback();
  nsModule = nsModuleExternal;
  esModule = esModuleExternal;
  let isRescheduleNeeded = false;
  let getMoreRecords = false;

  if (typeof produceCallBack !== 'function') {
    log.debug('Inside produceRecords', typeof produceCallBack);
    FailedRecordsDao.upsert({
      q1wConfig: currentFeatureConfig.configId.value,
      recordType: '',
      feature: currentFeatureConfig.feature.value,
      recordId: '',
      lastAttempted: new Date(),
      errorMessage: `Produce Callback can only be a function but found ${typeof produceCallBack}`,
    });
    return;
  }
  try {
    const produceResult = produceCallBack(currentConfig, currentFeatureConfig, nsModuleExternal, esModuleExternal);
    const { data = [], alwaysUpsert } = produceResult;
    log.debug('Produced results response', {
      resultsLength: data.length,
      data: data[0] || [],
      isRescheduleNeeded: produceResult.isRescheduleNeeded,
      getMoreRecords: produceResult.getMoreRecords,
      currentConfig,
    });

    if (
      typeof produceResult.isRescheduleNeeded !== 'boolean' ||
      typeof produceResult.getMoreRecords !== 'boolean' ||
      !Array.isArray(produceResult.data)
    ) {
      log.error(
        'Missing implementation in the produce call back',
        `produce must return {
        isReScheduleNeeded: true|false,
        getMoreRecords: true|false,
        status: true|false
      }`
      );
      throw new Error('Cannot proceed with the execution of producer. Please correct return type of produceCallback');
    }
    isRescheduleNeeded = produceResult.isRescheduleNeeded;

    getMoreRecords = produceResult.getMoreRecords;
    for (let i = 0; !isRescheduleNeeded && i < data.length; i++) {
      const action = routeDetails.execMode === 'Selective' ? 'Selective' : 'Bulk';
      try {
        const dataObj = data[i];
        if (!dataObj.recordId) {
          throw new Error('recordId node missing. It should be unique');
        }
        SyncQueueDao.upsert({
          externalSystem: currentConfig.id,
          recordId: dataObj.recordId,
          transactionType: dataObj.TransactionType,
          data: typeof dataObj === 'object' ? JSON.stringify(dataObj) : dataObj,
          action: `${currentFeatureConfig.feature.value}${action}`,
          alwaysUpsert,
        });
        log.debug('upserted to queue', {
          externalSystem: currentConfig.id,
          recordId: dataObj.recordId,
          action: `${currentFeatureConfig.feature.value}${action}`,
        });
        const transformedObj = featureConfigObjectCb(dataObj) || {};
        log.debug('featureConfigObjectCb >> transformedObj', transformedObj);
        Integration.upsertFeatureConfig(transformedObj);

        isRescheduleNeeded = General.isReScheduleNeeded();
        if (isRescheduleNeeded) {
          General.rescheduleScript();
          log.debug('Script Rescheduled !!', '');
          break;
        }
      } catch (ex) {
        log.debug('Error while enqueuing data', ex);
      }
    }
    if (getMoreRecords) {
      isRescheduleNeeded = true;
    }
  } catch (ex) {
    log.error('Exception at produceRecords', ex);
    isRescheduleNeeded = false;
  }
  if (isRescheduleNeeded && getMoreRecords) {
    General.rescheduleScript();
    log.debug('Script Rescheduled To Get More Records', '');
  }
  // eslint-disable-next-line consistent-return
  return isRescheduleNeeded;
};

export default {
  produceRecords,
};
