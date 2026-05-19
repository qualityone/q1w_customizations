/**
 * q1w_telgoo5_inbound_service.js
 * @NApiVersion 2.1
 * @module q1w_telgoo5_inbound_service
 */

import log from 'N/log';
import ConfigDao from '../../modules/dao/q1w_config_dao';
import Telgoo5InboundManager from '../../modules/managers/q1w_telgoo5_inbound_manager';
import Telgoo5XmlHelper from '../../modules/helper/q1w_telgoo5_xml_helper';
import ValidationErrors from '../lib/q1w_validation_error';

const { NotFoundError } = ValidationErrors;
const TITLE = 'q1w_telgoo5_inbound_service';

const resolveIntegrationConfig = (partnerName) => {
  const config = ConfigDao.getByPartnerName(partnerName);
  if (!config) {
    throw new NotFoundError(`Store with partner name ${partnerName} not found.`);
  }
  return config;
};

const processOrder = ({ jsonObj, validatedFields, routeAction = '' }) => {
  const logTitle = `${TITLE} => processOrder`;
  try {
    const config = resolveIntegrationConfig(validatedFields.partnerName);
    const { queueId } = Telgoo5InboundManager.enqueueOrder({
      integrationConfigId: config.id,
      jsonObj,
      validatedFields,
      routeAction,
    });

    return Telgoo5XmlHelper.buildSuccessResponse({
      messageId: validatedFields.messageId,
      partnerName: validatedFields.partnerName,
      sourceUrl: validatedFields.sourceUrl,
      transactionName: validatedFields.transactionName,
      eventId: queueId,
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const processReturn = ({ jsonObj, validatedFields, routeAction = '' }) => {
  const logTitle = `${TITLE} => processReturn`;
  try {
    const config = resolveIntegrationConfig(validatedFields.partnerName);
    const { queueId } = Telgoo5InboundManager.enqueueReturn({
      integrationConfigId: config.id,
      jsonObj,
      validatedFields,
      routeAction,
    });

    return Telgoo5XmlHelper.buildSuccessResponse({
      messageId: validatedFields.messageId,
      partnerName: validatedFields.partnerName,
      sourceUrl: validatedFields.sourceUrl,
      transactionName: validatedFields.transactionName,
      eventId: queueId,
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

export default {
  processOrder,
  processReturn,
};
