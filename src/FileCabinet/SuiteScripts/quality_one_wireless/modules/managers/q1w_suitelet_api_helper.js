/* eslint-disable no-unused-vars */
/**
 * q1w_suitelet_api_helper.js
 * @NApiVersion 2.1
 */

import log from 'N/log';
import Router from './q1w_router';
import Integration from './q1w_integration';
import DashboardRouteManager from './q1w_sync_routes';
import General from '../helper/q1w_general';

const getScriptDetails = (scriptDeploymentId) => {
  if (!scriptDeploymentId) {
    return {};
  }
  const results = General.runSearch(
    {
      searchType: 'scriptdeployment',
      filters: [['scriptid', 'is', scriptDeploymentId]],
      cols: [
        {
          name: 'scriptid',
          label: 'selectiveConsumerDeployment',
        },
        {
          name: 'scriptid',
          join: 'script',
          label: 'selectiveScriptId',
        },
      ],
    },
    (res, columns) => {
      const obj = {};
      columns.forEach((colObj) => {
        obj[colObj.label] = res.getValue(colObj);
      });
      return obj;
    }
  );
  return results[0] || null;
};

const getRouteDetailsFromObj = (featureObj) => {
  const featureDetails = {
    systemType: '',
    featureName: '',
    configId: '',
    producerScriptId: 'customscript_q1w_data_producer_ss',
    producerScriptDeploymentId: 'customdeploy_q1w_dshbrd_data_prdcr',
    selectiveConsumerDeployment: '',
    selectiveProducerId: '',
  };

  const configId = Object.keys(featureObj)[0] || '';
  if (configId) {
    featureDetails.configId = configId;
    const featureDetail = featureObj[configId].features[0] || {};
    featureDetails.systemType = featureDetail.SystemType;
    featureDetails.featureName = featureDetail.featureRoute || featureDetail.featureSlug;
    featureDetails.selectiveConsumerDeployment = featureDetail.selectiveConsumerDeployment;
    const selectiveProducerDeployment = featureDetail.selectiveProducerDeploymentId;
    const {
      selectiveScriptId: producerScriptId = 'customscript_q1w_data_producer_ss',
      selectiveConsumerDeployment: producerScriptDeploymentId = 'customdeploy_q1w_dshbrd_data_prdcr',
    } = getScriptDetails(selectiveProducerDeployment) || {};
    featureDetails.producerScriptId = producerScriptId;
    featureDetails.producerScriptDeploymentId = producerScriptDeploymentId;
  }

  return {
    ...featureDetails,
    ...getScriptDetails(featureDetails.selectiveConsumerDeployment),
  };
};

const invokeSync = ({ featureInternalId, recordId, producerScriptId = '', selectiveProducerScriptId = '' }) => {
  const featureObj = Integration.getConfigsAndFeatures(featureInternalId);
  const featureDetails = getRouteDetailsFromObj(featureObj);
  const {
    systemType,
    featureName,
    configId,
    selectiveConsumerDeployment,
    selectiveScriptId,
    producerScriptId: producerScriptIdFromFeature,
    producerScriptDeploymentId: prodScriptDepIdFromFeature,
  } = featureDetails;
  const routePath = `${systemType}/${featureName}/Selective/${configId}`;
  Integration.upsertSyncQueueEntry({
    externalSystem: configId,
    action: routePath,
    recordId,
    recordType: 'SELECTIVE_SYNC',
    data: JSON.stringify({
      selectiveScriptId,
      selectiveConsumerDeployment,
    }),
  });

  General.scheduleScript({
    scriptId: producerScriptId || producerScriptIdFromFeature || 'customscript_q1w_data_producer_ss',
    deploymentId: selectiveProducerScriptId || prodScriptDepIdFromFeature || 'customdeploy_q1w_dshbrd_data_prdcr',
  });
};

const invokeReSync = ({ featureInternalId, recordId }) => {
  const featureObj = Integration.getConfigsAndFeatures(featureInternalId);
  const featureDetails = getRouteDetailsFromObj(featureObj);
  const {
    systemType,
    featureName,
    configId,
    selectiveConsumerDeployment,
    selectiveScriptId,
    producerScriptId: producerScriptIdFromFeature,
    producerScriptDeploymentId: prodScriptDepIdFromFeature,
  } = featureDetails;
  const routePath = `${systemType}/${featureName}/Selective/${configId}`;
  Integration.requeueFailedEntry({ configId, action: featureName, recordId });

  Integration.upsertSyncQueueEntry({
    externalSystem: configId,
    action: routePath,
    recordId,
    recordType: 'SELECTIVE_SYNC',
    data: JSON.stringify({
      selectiveScriptId,
      selectiveConsumerDeployment,
    }),
  });

  General.scheduleScript({
    scriptId: producerScriptIdFromFeature || 'customscript_q1w_data_producer_ss',
    deploymentId: prodScriptDepIdFromFeature || 'customdeploy_q1w_dshbrd_data_prdcr',
  });
};

const getIntegrations = ({ method = '', body = {} }) => {
  return Integration.getConfigsAndFeatures();
};

const getQueuedEntries = ({ featureInternalId }) => {
  const featureObj = Integration.getConfigsAndFeatures(featureInternalId);
  const featureDetails = getRouteDetailsFromObj(featureObj);
  const { systemType, featureName, configId, selectiveConsumerDeployment, selectiveScriptId } = featureDetails;
  return Integration.getSelectivePendingEntries({
    configId,
    action: featureName,
    status: 'Pending',
  });
};

const getFailedEntries = ({ featureInternalId }) => {
  const featureObj = Integration.getConfigsAndFeatures(featureInternalId);
  const featureDetails = getRouteDetailsFromObj(featureObj);
  const { systemType, featureName, configId, selectiveConsumerDeployment, selectiveScriptId } = featureDetails;
  return Integration.getFailedEntries({
    configId,
    action: featureName,
  });
};

const manageRoute = ({ method = '', body = {} }) => {
  const resp = {
    status: true,
    message: '',
    data: null,
  };

  try {
    switch ((method || '').toLowerCase()) {
      case '': {
        resp.status = false;
        resp.message = 'Method not specified';
        break;
      }
      case 'getintegration':
        resp.data = getIntegrations({ method, body });
        break;
      case 'invokesync':
        resp.data = invokeSync(body);
        break;
      case 'invokeresync':
        resp.data = invokeReSync(body);
        break;
      case 'getqueuedentries':
        resp.data = getQueuedEntries(body);
        break;
      case 'getfailedentries':
        resp.data = getFailedEntries(body);
        break;
      default: {
        resp.status = false;
        resp.message = 'Method not specified';
        break;
      }
    }
  } catch (ex) {
    log.debug('manageRoute >> exception', ex);
    resp.status = false;
    resp.message = ex.message;
  }

  return resp;
};

export default {
  manageRoute,
};
