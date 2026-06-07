/* eslint-disable no-unused-vars */
/**
 * q1w_sync_routes.js
 * @NApiVersion 2.1
 *
 * Selective-sync route registration hook.
 *
 * The data producer scheduled script invokes registerRoutes() before
 * Router.executeByRoute() when running in selective-sync mode. Integration
 * authors should register their own routes here (one routeProcess() call per
 * `${systemType}/${featureRouteSlug}/Selective/${integrationId}` path) and
 * wire each callback to a ProducerLib.produceRecords() invocation.
 *
 * Example:
 *
 *   import Router from './q1w_router';
 *   import ProducerLib from './q1w_producer';
 *   import MyDataSource from '../../my_app/MyDataSource';
 *
 *   const registerRoutes = (recordId, integrationId) => {
 *     Router.routeProcess(
 *       `MySystem/MyFeature/Selective/${integrationId}`,
 *       () => {
 *         ProducerLib.produceRecords(
 *           () => MyDataSource.fetchOneRecord(recordId),
 *           () => ({})
 *         );
 *       }
 *     );
 *   };
 */

import Consumer from './q1w_consumer';
import Producer from './q1w_producer';
import Router from './q1w_router';
import Integration from './q1w_integration';
import MagicJackManager from './q1w_magicjack_manager';
import CONSTANTS from '../../constants/q1w_global_constants';

const { MAGICJACK } = CONSTANTS;

const registerRoutes = (recordId, integrationId) => {
  // No routes registered by default. Extend this function (or replace this
  // module with project-specific wiring) to add selective routes.
  //
  // Telgoo5 inbound consumer routes (follow-up):
  // Router.routeProcess(
  //   `Telgoo5/ImportOrder/Bulk/${integrationId}`,
  //   () => { /* consume Pending TELGOO5_INBOUND_ORDER queue rows */ }
  // );
  // Router.routeProcess(
  //   `Telgoo5/ImportReturnAuthorization/Bulk/${integrationId}`,
  //   () => { /* consume Pending TELGOO5_INBOUND_RETURN queue rows */ }
  // );
  // Router.routeProcess(
  //   `Telgoo5/ImportOrder/Selective/${integrationId}`,
  //   () => { /* selective sync for a single order queue recordId */ }
  // );
  // Router.routeProcess(
  //   `Telgoo5/ImportReturnAuthorization/Selective/${integrationId}`,
  //   () => { /* selective sync for a single return queue recordId */ }
  // );
};

const registerProducerRoutes = () => {
  Router.routeProcess(`MagicJack/${MAGICJACK.FEATURES.IMPORT_ORDER}/Bulk`, () => {
    const currentConfig = Integration.getCurrentConfig() || {};
    return Producer.produceRecords(
      () => MagicJackManager.produceOrderFiles(currentConfig),
      (dataObj) => {
        MagicJackManager.moveOrderFileToProcessed(currentConfig, dataObj.sourceFileName);
        return {};
      }
    );
  });

  Router.routeProcess(`MagicJack/${MAGICJACK.FEATURES.REPORT_SHIPMENTS}/Bulk`, () => {
    return Producer.produceRecords(
      () => MagicJackManager.produceShipmentPayloads(),
      () => ({})
    );
  });
};

const registerConsumerRoutes = () => {
  Router.routeProcess(`MagicJack/${MAGICJACK.FEATURES.IMPORT_ORDER}/Bulk`, () => {
    return Consumer.consumeRecords(MagicJackManager.processFile, () => ({}));
  });
  Router.routeProcess(`MagicJack/${MAGICJACK.FEATURES.REPORT_SHIPMENTS}/Bulk`, () => {
    return Consumer.consumeRecords(MagicJackManager.consumeShipmentPayload, () => ({}));
  });
};

const getSelectiveSyncEntries = () => {
  return Integration.getSelectiveSyncEntries() || [];
};

export default {
  registerRoutes,
  registerProducerRoutes,
  registerConsumerRoutes,
  getSelectiveSyncEntries,
};
