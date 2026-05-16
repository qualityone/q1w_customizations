/**
 * q1w_customer_dao.js
 * @NApiVersion 2.1
 */
import log from 'N/log';
import GenericDao from './q1w_base_dao';

let instance = null;

const INTERNALID = 'customer';

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

const setConfigurationField = (configFld) => {
  initialize();
  instance.setConfigurationField(configFld);
};

const upsertCustomer = ({ body, salesTeam = [], addresses = [] }) => {
  const isFieldMap = true;
  const customerCreateResp = {
    status: false,
    message: '',
    customerId: '',
  };
  initialize();
  log.debug('upsertCustomer: body', body);
  log.debug('upsertCustomer: addresses', addresses);
  log.debug('upsertCustomer: salesTeam', salesTeam);
  try {
    const isDynamic = true;
    const nsRec = instance.getNsRecordForUpsert(body, isDynamic);
    instance.setValuesToFields(nsRec, body, isFieldMap);
    if (salesTeam.length > 0) {
      instance.setValuesToSublistLine(nsRec, salesTeam, 'salesteam', isFieldMap);
    }
    const addressesFieldsAdded = addresses.map((elem) => ({
      addr1: '',
      addr2: '',
      zip: '',
      phone: '',
      ...elem,
    }));
    instance.upsertAddressLinesToAddressBook(nsRec, addressesFieldsAdded, isFieldMap);
    customerCreateResp.customerId = nsRec.save();
    log.debug('customer id ', customerCreateResp.customerId);
    try {
      const nsReloadedRec = instance.getNsRecordForUpsert(body, isDynamic);
      instance.setValuesToFields(nsReloadedRec, body, isFieldMap);
      customerCreateResp.customerId = nsReloadedRec.save();
      log.debug('customer id resave', customerCreateResp.customerId);
    } catch (ex) {
      log.debug('exception at customer resave', ex);
    }
    customerCreateResp.status = true;
  } catch (ex) {
    log.debug('upsertCustomer >> exception', ex);
    customerCreateResp.message = ex.message;
  }
  return customerCreateResp;
};

export default {
  setIdentifier,
  setConfigurationField,
  upsertCustomer,
};
