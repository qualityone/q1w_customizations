/**
 * q1w_failed_records_dao.js
 * @NApiVersion 2.1
 */
import GenericDao from './q1w_base_dao';

let instance = null;

const INTERNALID = 'customrecord_q1w_failed_records';

const FIELDS = {
  id: 'internalid',
  q1wConfig: 'custrecord_q1w_fr_config_id',
  recordType: 'custrecord_q1w_cifr_record_type',
  feature: 'custrecord_q1w_fr_feature',
  recordId: 'custrecord_q1w_fr_record_id',
  lastAttempted: 'custrecord_q1w_fr_last_attempted',
  errorMessage: 'custrecord_q1w_fr_error_message',
  errorMessageDetails: 'custrecord_q1w_fr_error_detail',
};

const initialize = () => {
  if (!instance) {
    instance = GenericDao.initialize({
      internalId: INTERNALID,
      fields: FIELDS,
      identifierField: 'internalid',
    });
  }
};

const upsert = (args) => {
  initialize();
  const { q1wConfig, recordType, recordId, feature } = args;
  const toUpsert = { ...args };
  const recs = instance.getAll({
    filters: [
      [FIELDS.q1wConfig, 'anyof', q1wConfig],
      'AND',
      [FIELDS.recordType, 'is', recordType],
      'AND',
      [FIELDS.recordId, 'is', recordId],
      'AND',
      [FIELDS.feature, 'is', feature],
    ],
  });
  if (recs.length > 0) {
    toUpsert.id = recs[0].id;
  }
  return instance.upsert(toUpsert);
};

const getAll = (args) => {
  initialize();
  return instance.getAll(args);
};

const getModel = (args) => {
  initialize();
  return instance.getModel(args);
};

const loadRecordAsJson = (args) => {
  initialize();
  return instance.loadRecordAsJson(args);
};

const deleteFailedRecordEntry = (args) => {
  initialize();
  return instance.deleteRecord(args.id);
};

const removeFailedRecordIfExisted = (configId, recordId, recordType) => {
  const result = this.getAll({
    filters: [
      [this.FIELDS.q1wConfig, 'anyof', configId],
      'AND',
      [this.FIELDS.recordType, 'is', recordType],
      'AND',
      [this.FIELDS.recordId, 'is', recordId],
    ],
  });

  if (result.length) {
    this.deleteEntry(result[0].id);
  }
};

export default {
  upsert,
  getAll,
  loadRecordAsJson,
  getModel,
  deleteFailedRecordEntry,
  removeFailedRecordIfExisted,
};
