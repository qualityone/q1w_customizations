import log from 'N/log';
import CONSTANTS from '../../constants/q1w_global_constants';

const API_CONSTANTS = CONSTANTS.API;

const response = (payload) => {
  log.debug('response.body >', payload);
  const resp = payload.data === undefined ? payload : payload.data;
  return {
    code: API_CONSTANTS.RESPONSE.SUCCESS.CODE,
    message: API_CONSTANTS.RESPONSE.SUCCESS.TYPE,
    ...(payload.data !== undefined &&
      Array.isArray(payload.data) &&
      payload.total_records !== undefined && { total_records: payload.total_records }),
    ...(payload.data !== undefined &&
      Array.isArray(payload.data) &&
      payload.total_pages !== undefined && { total_pages: payload.total_pages }),
    data: resp === null || resp === undefined ? [] : resp,
  };
};
export default {
  response,
};
