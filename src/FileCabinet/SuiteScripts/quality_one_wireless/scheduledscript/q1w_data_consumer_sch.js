/**
 *@NApiVersion 2.1
 *@NScriptType ScheduledScript
 */

import log from 'N/log';
import Router from '../modules/managers/q1w_router';
import SyncRoutes from '../modules/managers/q1w_sync_routes';

const IS_CONSUMER = true;

const execute = () => {
  try {
    SyncRoutes.registerConsumerRoutes();
    Router.executeByRoute({
      routeParam: 'custscript_q1w_consumer_route_path',
      configParam: 'custscript_q1w_consumer_config_id',
      isConsumer: IS_CONSUMER,
    });
  } catch (ex) {
    log.error('Exception during execution', ex);
  }
};

export default {
  execute,
};
