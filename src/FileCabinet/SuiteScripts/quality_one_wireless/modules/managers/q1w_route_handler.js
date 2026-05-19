import log from 'N/log';
import CONSTANTS from '../../constants/q1w_global_constants';
import ApiRoutes from '../../api/routes/q1w_api_routes';
import Telgoo5XmlHelper from '../helper/q1w_telgoo5_xml_helper';
import ApiResponseHelper from '../../api/lib/q1w_api_response_helper';

const TITLE = 'q1w_route_handler';

/**
 *
 * @param {*} context
 */

const getAction = (context) => {
  const { API } = CONSTANTS;
  const { ERRORS, VALIDATION } = API;
  const requestId = Telgoo5XmlHelper.generateRequestId();
  const normalizedContext = Telgoo5XmlHelper.normalizeRestletContext(context);

  try {
    const rawXml = Telgoo5XmlHelper.resolveRawXml(normalizedContext);
    const trimmedRaw = String(rawXml || '').trim();

    let routeAction = '';
    if (normalizedContext.action) {
      routeAction = Telgoo5XmlHelper.coerceXmlText(normalizedContext.action).trim().toLowerCase();
    }
    let messageJson = null;

    if (trimmedRaw) {
      const envelope = Telgoo5XmlHelper.parseInboundEnvelope(trimmedRaw, normalizedContext);
      routeAction = envelope.routeAction;
      messageJson = envelope.messageJson;
    }

    log.debug(`${TITLE} getAction (routeAction)`, routeAction);

    const enrichedContext = {
      ...normalizedContext,
      routeAction,
      messageJson,
      rawXml: trimmedRaw,
    };

    if (routeAction && ApiRoutes.routes[routeAction]) {
      const result = ApiRoutes.routes[routeAction](enrichedContext);
      return ApiResponseHelper.coerceResponseFormat(enrichedContext, result, requestId);
    }

    return ApiResponseHelper.formatRouteNotFound(enrichedContext, requestId);
  } catch (error) {
    log.debug(`${TITLE} error`, error);

    if (
      error.isValidationError ||
      error.name === 'ValidationError' ||
      (error.message && error.message.includes(VALIDATION.ERROR_LABEL))
    ) {
      const validationMessage =
        error.message && error.message.includes(VALIDATION.ERROR_LABEL)
          ? error.message.replace(VALIDATION.ERROR_LABEL, '').trim()
          : error.message;
      return ApiResponseHelper.formatError(
        normalizedContext,
        {
          name: ERRORS.BAD_REQUEST.TYPE,
          message: validationMessage,
        },
        requestId
      );
    }
    if (error.name === 'NotFoundError') {
      return ApiResponseHelper.formatError(
        normalizedContext,
        {
          name: ERRORS.NOT_FOUND.TYPE,
          message: error.message,
        },
        requestId
      );
    }
    return ApiResponseHelper.formatError(
      normalizedContext,
      {
        name: ERRORS.INTERNAL_SERVER_ERROR.TYPE,
        message: error.message,
      },
      requestId
    );
  }
};

export default {
  action: getAction,
};
