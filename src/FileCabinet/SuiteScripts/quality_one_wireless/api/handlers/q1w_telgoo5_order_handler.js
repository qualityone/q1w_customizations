/**
 * q1w_telgoo5_order_handler.js
 * @NApiVersion 2.1
 * @module q1w_telgoo5_order_handler
 */

import log from 'N/log';
import Telgoo5XmlHelper from '../../modules/helper/q1w_telgoo5_xml_helper';
import OrderMiddleware from '../middlewares/q1w_telgoo5_order_middleware';
import InboundService from '../services/q1w_telgoo5_inbound_service';
import Telgoo5ErrorHelper from '../lib/q1w_telgoo5_error_helper';

const TITLE = 'q1w_telgoo5_order_handler';

const postOrder = (context) => {
  const logTitle = `${TITLE} => postOrder`;
  const requestId = Telgoo5XmlHelper.generateRequestId();
  try {
    log.debug({ title: logTitle, details: 'Triggered' });
    return OrderMiddleware.validateAndParse(context, (parsed) => InboundService.processOrder(parsed));
  } catch (error) {
    return Telgoo5ErrorHelper.toXmlErrorResponse(error, requestId);
  }
};

export default {
  postOrder,
};
