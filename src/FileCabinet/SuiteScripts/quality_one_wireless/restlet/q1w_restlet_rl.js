/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@NModuleScope Public
 */

import log from 'N/log';
import RouteHandler from '../modules/managers/q1w_route_handler';
import Telgoo5XmlHelper from '../modules/helper/q1w_telgoo5_xml_helper';
import ApiResponseHelper from '../api/lib/q1w_api_response_helper';

const TITLE = 'q1w_restlet_rl';

const handleRequest = (context) => {
  const requestId = Telgoo5XmlHelper.generateRequestId();
  const normalizedContext = Telgoo5XmlHelper.normalizeRestletContext(context);
  try {
    log.debug(`${TITLE} context`, normalizedContext);
    const result = RouteHandler.action(normalizedContext);
    return ApiResponseHelper.coerceResponseFormat(normalizedContext, result, requestId);
  } catch (error) {
    log.error({
      title: `${TITLE} Error`,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    let errorName = 'INTERNAL_SERVER_ERROR';
    if (error.isValidationError || error.name === 'ValidationError') {
      errorName = 'BAD_REQUEST';
    } else if (error.name === 'NotFoundError') {
      errorName = 'NOT_FOUND';
    } else if (error.name) {
      errorName = error.name;
    }
    return ApiResponseHelper.formatError(
      normalizedContext,
      {
        name: errorName,
        message: error.message,
      },
      requestId
    );
  }
};

const get = (context) => handleRequest(context);

const post = (context) => handleRequest(context);

export default {
  get,
  post,
};
