import TestHandler from '../handlers/q1w_test_handler';
import Telgoo5OrderHandler from '../handlers/q1w_telgoo5_order_handler';
import Telgoo5ReturnHandler from '../handlers/q1w_telgoo5_return_handler';

const getTest = (context) => TestHandler.getTest(context);
const postTelgoo5Order = (context) => Telgoo5OrderHandler.postOrder(context);
const postTelgoo5Return = (context) => Telgoo5ReturnHandler.postReturn(context);

import CONSTANTS from '../../constants/q1w_global_constants';

const { TELGOO5 } = CONSTANTS;

export default {
  routes: {
    get_test: getTest,
    post_telgoo5_order: postTelgoo5Order,
    post_telgoo5_return: postTelgoo5Return,
  },
  xmlActions: TELGOO5.XML_ACTIONS,
};
