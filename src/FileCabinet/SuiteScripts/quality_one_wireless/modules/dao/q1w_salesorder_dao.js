/**
 * q1w_salesorder_dao.js
 * @NApiVersion 2.1
 */
import log from 'N/log';
import GenericDao from './q1w_base_dao';

let instance = null;

const INTERNALID = 'salesorder';

const initialize = () => {
  if (!instance) {
    instance = GenericDao.initialize({
      internalId: INTERNALID,
      fields: {},
    });
  }
};

const setIdentifier = (identFld) => {
  initialize();
  instance.setIdentifier(identFld);
};

const setConfiguration = (identFld) => {
  initialize();
  instance.setConfigurationField(identFld);
};

const closeSalesOrder = (internalId) => {
  initialize();
  const soRecord = instance.getNsRecordForUpsert({ id: internalId }, false);
  const lineCount = soRecord.getLineCount({
    sublistId: 'item',
  });
  for (let i = 0; i < lineCount; i++) {
    soRecord.setSublistValue({
      sublistId: 'item',
      fieldId: 'isclosed',
      line: i,
      value: true,
    });
  }
  return soRecord.save();
};

const createSalesOrder = ({ body, items }) => {
  const isFieldMap = true;
  const SOCreateResp = {
    status: false,
    message: '',
    upsertId: '',
  };
  initialize();
  try {
    log.debug('createSalesOrder: body', body);
    log.debug('createSalesOrder: items', items);
    const nsRec = instance.getNsRecordForUpsert(body, false);
    if (!nsRec.id) {
      instance.setValuesToFields(nsRec, body, isFieldMap);
      instance.setValuesToSublistLine(nsRec, items, 'item', isFieldMap);
      const soRecId = nsRec.save();
      const nsReloadedRec = instance.getNsRecordForUpsert(body, false);
      instance.setAddressesToRecord(nsReloadedRec, body);
      nsReloadedRec.save();
      log.debug('SO Created !!', soRecId);
      SOCreateResp.upsertId = soRecId;
    } else {
      const bodyFieldstoUpdate = { ...body };
      delete bodyFieldstoUpdate.entity;
      delete bodyFieldstoUpdate.subsidiary;
      log.debug('bodyFeidlstoupdate', bodyFieldstoUpdate);
      instance.setValuesToFields(nsRec, bodyFieldstoUpdate, isFieldMap);
      instance.setValuesToSublistLine(nsRec, items, 'item', isFieldMap);
      const soRecId = nsRec.save();
      log.debug('SO Updated !!', soRecId);
      SOCreateResp.upsertId = nsRec.id;
    }
    SOCreateResp.status = true;
  } catch (ex) {
    SOCreateResp.message = ex.message;
  }
  return SOCreateResp;
};

export default {
  setConfiguration,
  setIdentifier,
  closeSalesOrder,
  createSalesOrder,
};
