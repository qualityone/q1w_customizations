/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import log from 'N/log';
import Router from '../modules/managers/q1w_router';
import DashboardManager from '../modules/managers/q1w_sync_routes';
import General from '../modules/helper/q1w_general';
import Integration from '../modules/managers/q1w_integration';

const IS_PRODUCER = true;

const handleSelectiveRecordsProduce = () => {
  const selectiveEntries = DashboardManager.getSelectiveSyncEntries();
  for (let i = 0; i < selectiveEntries.length; i++) {
    try {
      const selectiveEntry = selectiveEntries[i];
      log.debug('selectiveEntry', selectiveEntry);
      const routePath = selectiveEntry.action.value;
      const recordId = selectiveEntry.recordId.value;
      const dataObj = JSON.parse(selectiveEntry.data.value || '{}');
      const { selectiveScriptId, selectiveConsumerDeployment } = dataObj;
      Router.clearRoutes();
      DashboardManager.registerRoutes(recordId, selectiveEntry.integrationId.value);
      Router.executeByRoute({
        routePathStr: routePath,
        paramConfigId: selectiveEntry.integrationId.value,
        isProducer: IS_PRODUCER,
      });
      General.scheduleScript({
        scriptId: selectiveScriptId,
        deploymentId: selectiveConsumerDeployment,
      });
      Integration.deleteSelectiveOperationEntry(selectiveEntry.id);
      const isRescheduleNeeded = General.isReScheduleNeeded(2000);
      if (isRescheduleNeeded) {
        General.rescheduleScript();
        log.debug('Selective Producer Script Rescheduled !!', '');
        return;
      }
    } catch (ex) {
      log.debug('Exception during selective sync produce', ex);
    }
  }
};

const handleScheduledSyncRecordsProduce = () => {
  DashboardManager.registerProducerRoutes();
  Router.executeByRoute({
    routeParam: 'custscript_q1w_producer_route_path',
    configParam: 'custscript_q1w_producer_config_id',
    isProducer: IS_PRODUCER,
  });
};

const execute = () => {
  try {
    const scriptParams = General.getScriptParams({
      isSelective: 'custscript_q1w_prdcr_is_selective',
    });
    if (scriptParams.isSelective) {
      handleSelectiveRecordsProduce();
    } else {
      handleScheduledSyncRecordsProduce();
    }
  } catch (ex) {
    log.error('Exception during execution', ex);
  }
};

export default {
  execute,
};
