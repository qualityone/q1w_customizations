import log from 'N/log';
import ResponseDecorator from '../../modules/helper/q1w_response_decorator';

const TITLE = 'q1w_test_handler';

const getTest = (params) => {
  log.debug(`${TITLE} getTest`, 'Triggered');
  log.debug('params', params);

  return ResponseDecorator.response({ message: 'Test successful' });
};

export default {
  getTest,
};
