/**
 * q1w_contact_dao.js
 * @NApiVersion 2.1
 */
import log from 'N/log';
import GenericDao from './q1w_base_dao';

let instance = null;

const INTERNALID = 'contact';

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

const upsertContact = ({ company, body, addresses = [] }) => {
  log.debug('company', company);
  const isFieldMap = true;
  const isDynamic = true;
  const contactCreateResp = {
    status: false,
    message: '',
    contactId: '',
  };
  try {
    initialize();
    const nsRec = instance.getNsRecordForUpsert(body, isDynamic);
    instance.setValuesToFields(nsRec, { ...body, company }, isFieldMap);
    instance.upsertAddressLinesToAddressBook(nsRec, addresses, isFieldMap);
    const contactId = nsRec.save();
    log.debug('contact upserted !', contactId);
  } catch (ex) {
    log.debug('Exception in contact create', ex);
    contactCreateResp.message = ex.message;
  }

  return contactCreateResp;
};

export default {
  setIdentifier,
  upsertContact,
};
