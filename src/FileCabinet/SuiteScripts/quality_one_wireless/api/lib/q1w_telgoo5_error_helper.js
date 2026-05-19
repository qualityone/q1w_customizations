/**
 * q1w_telgoo5_error_helper.js
 * @NApiVersion 2.1
 * @module q1w_telgoo5_error_helper
 */

import log from 'N/log';
import CONSTANTS from '../../constants/q1w_global_constants';
import Telgoo5XmlHelper from '../../modules/helper/q1w_telgoo5_xml_helper';

const { TELGOO5 } = CONSTANTS;
const TITLE = 'q1w_telgoo5_error_helper';

const toXmlErrorResponse = (error, requestId) => {
  const logTitle = `${TITLE} => toXmlErrorResponse`;
  log.error({
    title: logTitle,
    details: JSON.stringify({ message: error.message, stack: error.stack, requestId }),
  });

  if (error.isValidationError || error.name === 'ValidationError') {
    return Telgoo5XmlHelper.buildErrorResponse({
      requestId,
      name: TELGOO5.XML_ERRORS.VALIDATION_ERROR,
      description: error.message,
    });
  }

  if (error.name === 'NotFoundError') {
    return Telgoo5XmlHelper.buildErrorResponse({
      requestId,
      name: TELGOO5.XML_ERRORS.NOT_FOUND,
      description: error.message,
    });
  }

  return Telgoo5XmlHelper.buildErrorResponse({
    requestId,
    name: TELGOO5.XML_ERRORS.INTERNAL_SERVER_ERROR,
    description: 'Internal Server Error',
  });
};

const toXmlRouteError = ({ name, message }, requestId) => {
  if (name === 'NOT_FOUND') {
    return Telgoo5XmlHelper.buildErrorResponse({
      requestId,
      name: TELGOO5.XML_ERRORS.NOT_FOUND,
      description: message,
    });
  }

  if (name === 'BAD_REQUEST' || name === 'ValidationError') {
    return Telgoo5XmlHelper.buildErrorResponse({
      requestId,
      name: TELGOO5.XML_ERRORS.VALIDATION_ERROR,
      description: message,
    });
  }

  return Telgoo5XmlHelper.buildErrorResponse({
    requestId,
    name: TELGOO5.XML_ERRORS.INTERNAL_SERVER_ERROR,
    description: message || 'Internal Server Error',
  });
};

export default {
  toXmlErrorResponse,
  toXmlRouteError,
};
