/**
 * q1w_telgoo5_order_middleware.js
 * @NApiVersion 2.1
 * @module q1w_telgoo5_order_middleware
 */

import log from 'N/log';
import Telgoo5XmlHelper from '../../modules/helper/q1w_telgoo5_xml_helper';
import Telgoo5Validator from '../lib/q1w_telgoo5_validator';
import ValidationErrors from '../lib/q1w_validation_error';

const { ValidationError } = ValidationErrors;

const TITLE = 'q1w_telgoo5_order_middleware';

const resolveMessageJson = (context) => {
  if (context.messageJson) {
    return context.messageJson;
  }

  const rawXml = Telgoo5XmlHelper.resolveRawXml(context);
  if (!rawXml || !String(rawXml).trim()) {
    throw new ValidationError('Request body is empty');
  }

  try {
    return Telgoo5XmlHelper.stripRoutingAction(Telgoo5XmlHelper.parseXmlToJson(rawXml));
  } catch (parseError) {
    log.error({
      title: `${TITLE} => resolveMessageJson`,
      details: JSON.stringify({ message: parseError.message, stack: parseError.stack }),
    });
    throw new ValidationError('Invalid XML payload');
  }
};

const validateAndParse = (context, next) => {
  const logTitle = `${TITLE} => validateAndParse`;
  try {
    const rawXml = context.rawXml || Telgoo5XmlHelper.resolveRawXml(context);
    const jsonObj = resolveMessageJson(context);

    if (jsonObj['sales-order-submission']?.detail) {
      Telgoo5XmlHelper.normalizeLineItems(jsonObj['sales-order-submission'].detail);
    }

    const validatedFields = Telgoo5Validator.validateOrder(jsonObj);

    return next({
      rawXml,
      jsonObj,
      validatedFields,
      routeAction: context.routeAction,
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
  validateAndParse,
};
