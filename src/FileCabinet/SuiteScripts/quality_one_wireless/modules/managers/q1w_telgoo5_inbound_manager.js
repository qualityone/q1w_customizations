/**
 * q1w_telgoo5_inbound_manager.js
 * @NApiVersion 2.1
 * @module q1w_telgoo5_inbound_manager
 */

import log from 'N/log';
import CONSTANTS from '../../constants/q1w_global_constants';
import Integration from './q1w_integration';

const { TELGOO5 } = CONSTANTS;
const TITLE = 'q1w_telgoo5_inbound_manager';

const buildValidatedPayload = ({ jsonObj, validatedFields, routeAction = '' }) => ({
  message: jsonObj,
  meta: {
    messageId: validatedFields.messageId,
    partnerName: validatedFields.partnerName,
    sourceUrl: validatedFields.sourceUrl,
    transactionName: validatedFields.transactionName,
    restletAction: routeAction,
    receivedAt: new Date().toISOString(),
  },
});

const enqueueOrder = ({ integrationConfigId, jsonObj, validatedFields, routeAction = '' }) => {
  const logTitle = `${TITLE} => enqueueOrder`;
  try {
    const validatedPayload = buildValidatedPayload({ jsonObj, validatedFields, routeAction });
    const queueId = Integration.upsertSyncQueueEntry({
      externalSystem: integrationConfigId,
      action: TELGOO5.QUEUE_ACTIONS.IMPORT_ORDER,
      recordType: TELGOO5.RECORD_TYPES.INBOUND_ORDER,
      recordId: String(validatedFields.customerOrderNumber),
      data: JSON.stringify(validatedPayload),
    });

    return {
      queueId: String(queueId),
      validatedPayload,
    };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const enqueueReturn = ({ integrationConfigId, jsonObj, validatedFields, routeAction = '' }) => {
  const logTitle = `${TITLE} => enqueueReturn`;
  try {
    const validatedPayload = buildValidatedPayload({ jsonObj, validatedFields, routeAction });
    const queueId = Integration.upsertSyncQueueEntry({
      externalSystem: integrationConfigId,
      action: TELGOO5.QUEUE_ACTIONS.IMPORT_RETURN,
      recordType: TELGOO5.RECORD_TYPES.INBOUND_RETURN,
      recordId: String(validatedFields.messageId),
      data: JSON.stringify(validatedPayload),
    });

    return {
      queueId: String(queueId),
      validatedPayload,
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
  enqueueOrder,
  enqueueReturn,
};
