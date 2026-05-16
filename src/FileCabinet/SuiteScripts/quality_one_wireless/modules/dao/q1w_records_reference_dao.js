/**
 * q1w_records_reference_dao.js
 * @NApiVersion 2.1
 */
import log from 'N/log';
import GenericDao from './q1w_base_dao';

let instance = null;
const INTERNALID = 'customrecord_q1w_synced_record_reference';

const FIELDS = {
  integration: 'custrecord_q1w_srr_integration',
  featureConfig: 'custrecord_q1w_srr_feature_config',
  recordId: 'custrecord_q1w_srr_recordid',
  upsertId: 'custrecord_q1w_srr_upsertid',
};

const initialize = () => {
  if (!instance) {
    instance = GenericDao.initialize({
      internalId: INTERNALID,
      fields: FIELDS,
    });
  }
};

const upsert = (args) => {
  initialize();
  const { integration, featureConfig, recordId } = args;
  const toUpsert = { ...args };
  const recs = instance.getAll({
    filters: [
      [FIELDS.integration, 'anyof', integration],
      'AND',
      [FIELDS.featureConfig, 'is', featureConfig],
      'AND',
      [FIELDS.recordId, 'is', recordId],
    ],
  });
  if (recs.length > 0) {
    toUpsert.id = recs[0].id;
  }
  return instance.upsert(toUpsert);
};

const getRecordReference = ({
  integrationId,
  featureId,
  nsRecId,
  esRecId,
  flow = 'IMPORT',
  featureName = null,
  // eslint-disable-next-line consistent-return
}) => {
  initialize();
  let referenceId = null;
  let fieldToReturn = 'upsertId';
  if (!nsRecId && !esRecId) {
    throw new Error('nsRecId OR esRecId is mandatory');
  }
  const filters = [[FIELDS.integration, 'anyof', integrationId]];

  if (featureName) {
    filters.push('AND');
    filters.push([`${FIELDS.featureConfig}.name`, 'is', featureName]);
  } else {
    filters.push('AND');
    filters.push([FIELDS.featureConfig, 'is', featureId]);
  }

  if (nsRecId) {
    if (flow === 'IMPORT') {
      filters.push('AND');
      filters.push([FIELDS.upsertId, 'is', nsRecId]);
      fieldToReturn = 'recordId';
    } else if (flow === 'EXPORT') {
      filters.push('AND');
      filters.push([FIELDS.recordId, 'is', nsRecId]);
      fieldToReturn = 'upsertId';
    }
  } else if (esRecId) {
    if (flow === 'IMPORT') {
      filters.push('AND');
      filters.push([FIELDS.recordId, 'is', esRecId]);
      fieldToReturn = 'upsertId';
    } else if (flow === 'EXPORT') {
      filters.push('AND');
      filters.push([FIELDS.upsertId, 'is', esRecId]);
      fieldToReturn = 'recordId';
    }
  }

  const recs = instance.getAll({
    filters,
  });
  log.debug('getReference recs', recs);
  if (recs.length > 0) {
    referenceId = recs[0][fieldToReturn].value;
  }
  return referenceId;
};

export default {
  upsertReference: upsert,
  getRecordReference,
};
