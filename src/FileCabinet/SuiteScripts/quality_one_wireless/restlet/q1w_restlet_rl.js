/**
 *@NApiVersion 2.1
 *@NScriptType Restlet
 *@NModuleScope Public
 */

import log from 'N/log';
import ErrorDecorator from '../modules/helper/q1w_error_decorator';
import RouteHandler from '../modules/managers/q1w_route_handler';

const TITLE = 'q1w_restlet_rl';

const get = (context) => {
  try {
    log.debug(`${TITLE} get context`, context);
    return RouteHandler.action(context);
  } catch (error) {
    log.error(`${TITLE} Error`, error);
    return ErrorDecorator.throwError(error.message);
  }
};

export default {
  get,
};
