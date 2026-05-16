/**
 * q1w_consumer.js
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

const validateGoliveFields = (featureConfig = {}) => {
  const {
    golive_date: { value: goliveDate },
    golive_date_node: { value: goliveDateNode },
    golive_date_format: { value: goliveDateFormat },
  } = featureConfig;
  if (!goliveDate) {
    throw new Error('Go Live Date not populated in Current Config');
  }
  if (!goliveDateNode) {
    throw new Error('Go Live Date Node not populated in Current Config');
  }
  if (!goliveDateFormat) {
    throw new Error('Go Live Date Format not populated in Current Config');
  }
};

const consumeRecords = (consumeCallBack, featureConfigObjectCb, getModulesCallback = defaultGetModulesCallBack) => {
  currentConfig = Integration.getCurrentConfig();
  currentFeatureConfig = Integration.getCurrentFeatureConfig();
  const {
    golive_date: { value: goliveDate },
    golive_date_node: { value: goliveDateNode },
    golive_date_format: { value: goliveDateFormat },
  } = currentFeatureConfig;
  validateGoliveFields(currentFeatureConfig);

  const { routeDetails } = currentFeatureConfig;
  const action = routeDetails.execMode === 'Selective' ? 'Selective' : 'Bulk';
  const { nsModule: nsModuleExternal, esModule: esModuleExternal } = getModulesCallback();
  nsModule = nsModuleExternal;
  esModule = esModuleExternal;
  let isRescheduleNeeded = false;
  // eslint-disable-next-line no-unused-vars
  let getMoreRecords = false;

  let pendingRecords = SyncQueueDao.getPendingEntriesBasedOnParameters({
    configId: currentConfig.id,
    status: SyncQueueDao.Status.Pending,
    action: `${currentFeatureConfig.feature.value}${action}`,
  });
  pendingRecords = pendingRecords || [];
  try {
    for (let i = 0; i < pendingRecords.length; i++) {
      try {
        const parsedEntry = {
          id: pendingRecords[i].id,
          action: pendingRecords[i].action.value,
          recordId: pendingRecords[i].recordId.value,
          status: pendingRecords[i].status.value,
          data: pendingRecords[i].data.value ? JSON.parse(pendingRecords[i].data.value) : {},
        };
        const goliveDateFromNode = (parsedEntry.data || {})[goliveDateNode];
        log.debug('consumeRecords >> currentFeatureConfig', {
          goliveDate,
          goliveDateNode,
          goliveDateFormat,
          goliveDateFromNode: goliveDateFromNode || null,
        });
        General.checkGoLiveDate(goliveDate, goliveDateFromNode, goliveDateFormat);
        const consumeResult = consumeCallBack(
          parsedEntry,
          currentConfig,
          currentFeatureConfig,
          nsModuleExternal,
          esModuleExternal
        );
        log.debug('consume result', {
          ...consumeResult,
        });
        if (!consumeResult) {
          log.error(
            'Missing implementation in the consume call back',
            `callback must return {
            isReScheduleNeeded: true|false,
            getMoreRecords: true|false,
            status: true|false
            upsertId: string|integer
          }`
          );
        }
        if (
          typeof consumeResult.isReScheduleNeeded !== 'boolean' ||
          typeof consumeResult.getMoreRecords !== 'boolean' ||
          typeof consumeResult.status !== 'boolean' ||
          (consumeResult.status && !consumeResult.upsertId)
        ) {
          log.error(
            'Missing implementation in the consume call back',
            `callback must return {
            isReScheduleNeeded: true|false,
            getMoreRecords: true|false,
            status: true|false
            upsertId: string|integer
          }`
          );
          throw new Error(
            'Cannot proceed with the execution of consumer. Please correct return type of consumeCallback'
          );
        }
        isRescheduleNeeded = consumeResult.isRescheduleNeeded;
        getMoreRecords = consumeResult.getMoreRecords;
        if (consumeResult.error || !consumeResult.status) {
          SyncQueueDao.upsert({
            recordId: pendingRecords[i].recordId.value,
            id: pendingRecords[i].id,
            status: SyncQueueDao.Status.Failed,
            errorDetail: consumeResult.errorDetail || consumeResult.message,
            error: consumeResult.error || consumeResult.message,
          });
          const options = {
            q1wConfig: currentFeatureConfig.configId.value,
            recordType: '',
            feature: currentFeatureConfig.feature.value,
            recordId: pendingRecords[i].recordId.value,
            lastAttempted: new Date(),
            errorMessage: consumeResult.message || consumeResult.errorMessage,
          };
          FailedRecordsDao.upsert({ ...options });
        } else {
          SyncQueueDao.upsert({
            id: pendingRecords[i].id,
            recordId: pendingRecords[i].recordId.value,
            status: SyncQueueDao.Status.Processed,
            error: '',
            errorDetail: '',
          });

          const recReference = consumeResult.upsertId || pendingRecords[i].recordId.value;

          Integration.upsertReference({
            recordId: pendingRecords[i].recordId.value,
            recordReference: recReference,
          });
        }
      } catch (loopEx) {
        log.debug('Error during record consumption', loopEx);
        SyncQueueDao.upsert({
          recordId: pendingRecords[i].recordId.value,
          id: pendingRecords[i].id,
          status: loopEx.message === General.goLiveCheckErr ? SyncQueueDao.Status.Skipped : SyncQueueDao.Status.Failed,
          errorDetail: loopEx.message,
          error: loopEx.message,
        });
        const options = {
          q1wConfig: currentFeatureConfig.configId.value,
          recordType: '',
          feature: currentFeatureConfig.feature.value,
          recordId: pendingRecords[i].recordId.value,
          lastAttempted: new Date(),
          errorMessage: loopEx.message,
        };
        FailedRecordsDao.upsert({ ...options });
      }

      isRescheduleNeeded = General.isReScheduleNeeded();
      if (isRescheduleNeeded) {
        General.rescheduleScript();
        log.debug('Script Rescheduled !!', '');
        break;
      }
    }

    if (getMoreRecords) {
      isRescheduleNeeded = true;
    }
  } catch (ex) {
    log.error('Error while consuming data', ex);

    const options = {
      q1wConfig: currentFeatureConfig.configId,
      recordType: '',
      feature: currentFeatureConfig.feature,
      recordId: '',
      lastAttempted: new Date(),
      errorMessage: ex,
    };
    FailedRecordsDao.upsert({ ...options });
  }
  // eslint-disable-next-line consistent-return
  return isRescheduleNeeded;
};

export default {
  consumeRecords,
};
