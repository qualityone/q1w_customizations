/* eslint-disable no-undef */
/**
 * q1w_sync_queue_dao.js
 * @NApiVersion 2.1
 */
import GenericDao from './q1w_base_dao';

let instance = null;

const SYNC_QUEUE = {
  internalId: 'customrecord_q1w_sync_queue',
  fields: {
    id: { id: 'internalid', showInList: true, opr: 'anyof' },
    externalSystem: { id: 'custrecord_q1w_sync_q_store_id', showInList: true, opr: 'anyof' },
    action: { id: 'custrecord_q1w_sync_q_action', showInList: true, opr: 'is' },
    recordId: { id: 'custrecord_q1w_sync_q_record_id', showInList: true, opr: 'is' },
    recordType: { id: 'custrecord_q1w_sync_q_record_type', showInList: true, opr: 'is' },
    status: { id: 'custrecord_q1w_sync_q_status', showInList: true, opr: 'is' },
    data: { id: 'custrecord_q1w_sync_q_data', showInList: true, opr: 'is' },
    error: { id: 'custrecord_q1w_sync_q_error', showInList: true, opr: 'is' },
    errorDetail: { id: 'custrecord_q1w_sync_q_error_detail', showInList: true, opr: 'is' },
    inactive: { id: 'isinactive', showInList: true, opr: 'is' },
  },
  identifierField: 'internalid',
};

const RecordTypes = {
  Classification: 'classification',
  Location: 'location',
  TaxClass: 'salestaxitem',
  Vendor: 'vendor',
  Item: 'item',
  ItemImage: 'itemImage',
  PriceLevel: 'pricelevel',
  ItemPrice: 'itemPrice',
  ItemQuantity: 'itemQuantity',
  SalesOrder: 'salesorder',
  TransferOrder: 'transferOrder',
  Refund: 'refund',
  InventoryAdjustment: 'inventoryadjustment',
  CashSale: 'cashsale',
  Invoice: 'invoice',
  ItemFulfillment: 'itemfulfillment',
  CashRegister: 'cashregister',
  CancelOrder: 'cancelorder',
  ZReport: 'ZReport',
};

const Actions = {
  ExportClass: 'ExportClass',
  ExportLocation: 'ExportLocation',
  ExportTaxClass: 'ExportTaxClass',
  ExportVendor: 'ExportVendor',
  ExportImage: 'ExportImage',
  ExportPriceLevel: 'ExportPriceLevel',
  ExportItemPrice: 'ExportItemPrice',
  ExportItemQuantity: 'ExportItemQuantity',
  ImportOrder: 'ImportOrder',
  ImportFulfillment: 'ImportFulfillment',
  ImportCashSale: 'ImportCashSale',
  ExportItem: 'ExportItem',
  ImportTransferOrder: 'ImportTransferOrder',
  ImportRefund: 'ImportRefund',
  ImportInventoryAdjustment: 'ImportInventoryAdjustment',
  ImportCashRegister: 'ImportCashRegister',
  ImportCancelOrder: 'ImportCancelOrder',
  ImportZReport: 'ImportZReport',
};

const Status = {
  Failed: 'Failed',
  Pending: 'Pending',
  Processed: 'Processed',
  UnProcessed: 'UnProcessed',
  Skipped: 'Skipped',
};

const Operation = {
  IMPORT: 'IMPORT',
  EXPORT: 'EXPORT',
};

const getInstance = () => {
  if (!instance) {
    instance = GenericDao.initialize(SYNC_QUEUE);
  }
};

const getAll = (args) => {
  getInstance();
  return instance.getAll(args);
};

const upsert = (args) => {
  getInstance();
  const params = { ...args };
  if (!params.id) {
    const recs = instance.getAll({
      filters: [
        [
          [SYNC_QUEUE.fields.status.id, SYNC_QUEUE.fields.status.opr, Status.Pending],
          'OR',
          [SYNC_QUEUE.fields.status.id, SYNC_QUEUE.fields.status.opr, Status.Failed],
          'OR',
          [SYNC_QUEUE.fields.status.id, SYNC_QUEUE.fields.status.opr, Status.Skipped],
        ],
        'AND',
        [SYNC_QUEUE.fields.externalSystem.id, SYNC_QUEUE.fields.externalSystem.opr, args.externalSystem],
        'AND',
        [SYNC_QUEUE.fields.recordId.id, SYNC_QUEUE.fields.recordId.opr, args.recordId.toString()],
        'AND',
        [SYNC_QUEUE.fields.action.id, SYNC_QUEUE.fields.action.opr, args.action],
      ],
    });

    if (recs.length > 0) {
      params.id = recs[0].id;
    }

    if (params?.alwaysUpsert) {
      params.id = null;
    }
  }
  return instance.upsert({
    status: params.status || Status.Pending,
    ...params,
  });
};

const getPendingEntriesBasedOnParameters = ({ configId, action, status }) => {
  getInstance();
  return instance.getAll({
    filters: [
      [
        [SYNC_QUEUE.fields.action.id, SYNC_QUEUE.fields.action.opr, action],
        'AND',
        [SYNC_QUEUE.fields.status.id, SYNC_QUEUE.fields.status.opr, status],
        'AND',
        [SYNC_QUEUE.fields.externalSystem.id, SYNC_QUEUE.fields.externalSystem.opr, configId],
      ],
    ],
  });
};

const getSelectivePendingEntries = ({ configId, action, status }) => {
  getInstance();
  return instance.getAll({
    filters: [
      [
        [SYNC_QUEUE.fields.action.id, SYNC_QUEUE.fields.action.opr, `${action}Selective`.toString()],
        'AND',
        [SYNC_QUEUE.fields.status.id, SYNC_QUEUE.fields.status.opr, status],
        'AND',
        [SYNC_QUEUE.fields.externalSystem.id, SYNC_QUEUE.fields.externalSystem.opr, configId],
      ],
    ],
  });
};

const getFailedEntries = ({ configId, action, recordId = '' }) => {
  getInstance();
  instance.initializeSearchCols({
    integrationId: 'custrecord_q1w_sync_q_store_id',
    action: 'custrecord_q1w_sync_q_action',
    status: 'custrecord_q1w_sync_q_status',
    error: 'custrecord_q1w_sync_q_error',
    recordId: 'custrecord_q1w_sync_q_record_id',
    lastmodified: 'lastmodified',
  });
  const filters = [
    [
      [SYNC_QUEUE.fields.action.id, SYNC_QUEUE.fields.action.opr, `${action}Selective`.toString()],
      'OR',
      [SYNC_QUEUE.fields.action.id, SYNC_QUEUE.fields.action.opr, `${action}Bulk`.toString()],
    ],
    'AND',
    [SYNC_QUEUE.fields.status.id, SYNC_QUEUE.fields.status.opr, Status.Failed],
    'AND',
    [SYNC_QUEUE.fields.externalSystem.id, SYNC_QUEUE.fields.externalSystem.opr, configId],
  ];

  if (recordId) {
    filters.push('AND');
    filters.push([SYNC_QUEUE.fields.recordId.id, SYNC_QUEUE.fields.recordId.opr, recordId]);
  }

  const results = instance.getAll({
    filters,
  });

  return results.map((elem) => {
    const dataObj = { ...elem };
    delete dataObj.data;
    return dataObj;
  });
};

const getSelectiveSyncEntries = (args = {}) => {
  const { integrationId = null, systemType = null } = args;
  getInstance();
  instance.initializeSearchCols({
    integrationId: 'custrecord_q1w_sync_q_store_id',
    action: 'custrecord_q1w_sync_q_action',
    status: 'custrecord_q1w_sync_q_status',
    error: 'custrecord_q1w_sync_q_error',
    recordId: 'custrecord_q1w_sync_q_record_id',
    lastmodified: 'lastmodified',
    data: 'custrecord_q1w_sync_q_data',
  });
  const filters = [[SYNC_QUEUE.fields.recordType.id, SYNC_QUEUE.fields.recordType.opr, 'SELECTIVE_SYNC']];

  if (integrationId) {
    filters.push('AND');
    filters.push([SYNC_QUEUE.fields.externalSystem.id, SYNC_QUEUE.fields.externalSystem.opr, integrationId]);
  }

  if (systemType) {
    filters.push('AND');
    filters.push([`${SYNC_QUEUE.fields.externalSystem.id}.custrecord_q1w_ic_system`.toString(), 'is', systemType]);
  }

  const results = instance.getAll({
    filters,
  });

  return results.map((elem) => {
    const dataObj = { ...elem };
    return dataObj;
  });
};

const requeueForResync = ({ configId, action, recordId }) => {
  const queuedEntries = getFailedEntries({ configId, action, recordId }) || [];

  queuedEntries.forEach((entryRec) => {
    instance.deleteRecord(entryRec.id);
  });
};

const deleteSelectiveOperationEntry = (recId) => {
  instance.deleteRecord(recId);
};

const getRecordAsJson = (recId) => {
  getInstance();
  return instance.loadRecordAsJson(recId);
};

export default {
  SYNC_QUEUE,
  RecordTypes,
  Actions,
  Status,
  Operation,
  getAll,
  upsert,
  getPendingEntriesBasedOnParameters,
  getSelectivePendingEntries,
  getRecordAsJson,
  getFailedEntries,
  requeueForResync,
  getSelectiveSyncEntries,
  deleteSelectiveOperationEntry,
};
