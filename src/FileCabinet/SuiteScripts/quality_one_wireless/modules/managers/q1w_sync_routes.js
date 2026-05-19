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

import Integration from './q1w_integration';

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

const getSelectiveSyncEntries = () => {
  return Integration.getSelectiveSyncEntries() || [];
};

export default {
  registerRoutes,
  getSelectiveSyncEntries,
};
