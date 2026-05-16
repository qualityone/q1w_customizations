import log from 'N/log';
import ErrorDecorator from '../helper/q1w_error_decorator';
import API_CONSTANTS from '../../constants/q1w_global_constants';
import RouteHandler from './q1w_route_handler';

const TITLE = 'q1w_route_handler';

/**
 *
 * @param {*} context
 */

const getAction = (context) => {
  const { ERRORS, VALIDATION } = API_CONSTANTS;

  try {
    const action = (context.action || '').toLowerCase();

    log.debug(`${TITLE} getAction (action)`, action);

    if (RouteHandler.routes[action]) {
      return RouteHandler.routes[action](context);
    }

    return ErrorDecorator.routesError({
      name: ERRORS.NOT_FOUND.TYPE,
      message: ERRORS.NOT_FOUND.MESSAGE,
    });
  } catch (error) {
    log.debug(`${TITLE} error`, error);

    if (error.message.includes(VALIDATION.ERROR_LABEL)) {
      return ErrorDecorator.routesError({
        name: ERRORS.BAD_REQUEST.TYPE,
        message: error.message.replace(VALIDATION.ERROR_LABEL, '').trim(),
      });
    }
    return ErrorDecorator.routesError({
      name: ERRORS.INTERNAL_SERVER_ERROR.TYPE,
      message: error.message,
    });
  }
};

export default {
  action: getAction,
};
