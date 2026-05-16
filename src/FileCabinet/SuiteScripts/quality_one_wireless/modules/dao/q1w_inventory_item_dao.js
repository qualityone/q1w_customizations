/**
 * q1w_inventory_item_dao.js
 * @NApiVersion 2.1
 */
import log from 'N/log';
import GenericDao from './q1w_base_dao';

let instance = null;

const INTERNALID = 'inventoryitem';

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

const upsertItem = ({ body }) => {
  const isFieldMap = true;
  const itemCreateResp = {
    status: false,
    message: '',
    itemId: '',
  };
  initialize();
  try {
    const isDynamic = true;
    log.debug('upsertItemInventory', body);
    const nsRec = instance.getNsRecordForUpsert(body, isDynamic);
    if (nsRec.id) {
      // eslint-disable-next-line no-param-reassign
      delete body.unitstype;
    }
    instance.setValuesToFields(nsRec, body, isFieldMap);
    itemCreateResp.itemId = nsRec.save();
    itemCreateResp.status = true;
  } catch (ex) {
    log.debug('upsertItem >> exception', ex);
    itemCreateResp.message = ex.message;
  }
  return itemCreateResp;
};

export default {
  setIdentifier,
  upsertItem,
  setConfiguration,
};
