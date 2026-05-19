/**
 * q1w_api_response_helper.js
 * @NApiVersion 2.1
 * @module q1w_api_response_helper
 * @description Detect XML vs JSON requests and format route-level errors accordingly
 */

import CONSTANTS from '../../constants/q1w_global_constants';
import ErrorDecorator from '../../modules/helper/q1w_error_decorator';
import Telgoo5XmlHelper from '../../modules/helper/q1w_telgoo5_xml_helper';
import Telgoo5ErrorHelper from './q1w_telgoo5_error_helper';

const { API, TELGOO5 } = CONSTANTS;

const looksLikeXmlBody = (context) => {
  const raw = Telgoo5XmlHelper.resolveRawXml(context);
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return false;
  }
  return (
    trimmed.startsWith('<?xml') ||
    trimmed.startsWith(`<${TELGOO5.MESSAGE_ROOT}`) ||
    trimmed.includes(`<${TELGOO5.ROUTING_ELEMENT}>`)
  );
};

const isXmlRequest = (context) => {
  if (looksLikeXmlBody(context)) {
    return true;
  }
  const action = (context?.routeAction || context?.action || '').toLowerCase();
  return TELGOO5.XML_ACTIONS.includes(action);
};

const isJsonErrorResponse = (value) => value !== null && typeof value === 'object' && value.status === 'false';

const formatError = (context, { name, message }, requestId) => {
  if (isXmlRequest(context)) {
    return Telgoo5ErrorHelper.toXmlRouteError({ name, message }, requestId);
  }
  return ErrorDecorator.routesError({ name, message });
};

const formatRouteNotFound = (context, requestId) => {
  const { ERRORS } = API;
  return formatError(
    context,
    {
      name: ERRORS.NOT_FOUND.TYPE,
      message: ERRORS.NOT_FOUND.MESSAGE,
    },
    requestId
  );
};

const jsonErrorToRouteError = (jsonError) => {
  const message = (jsonError.message || '').split('::').pop().trim();
  if (jsonError.errorCode === 404) {
    return { name: 'NOT_FOUND', message };
  }
  if (jsonError.errorCode === 400) {
    return { name: 'BAD_REQUEST', message };
  }
  return {
    name: 'INTERNAL_SERVER_ERROR',
    message: message || API.ERRORS.INTERNAL_SERVER_ERROR.MESSAGE,
  };
};

const coerceResponseFormat = (context, response, requestId) => {
  if (!isXmlRequest(context)) {
    return response;
  }
  if (typeof response === 'string') {
    return response;
  }
  if (isJsonErrorResponse(response)) {
    return Telgoo5ErrorHelper.toXmlRouteError(jsonErrorToRouteError(response), requestId);
  }
  return response;
};

export default {
  isXmlRequest,
  isJsonErrorResponse,
  formatError,
  formatRouteNotFound,
  coerceResponseFormat,
};
