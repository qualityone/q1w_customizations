/**
 * q1w_inventory_item_dao.js
 * @NApiVersion 2.1
 */
import log from 'N/log';
import query from 'N/query';
import GenericDao from './q1w_base_dao';

const MODULE = 'q1w_inventory_item_dao';

let instance = null;
let itemSkuCache = null;

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

const getItemInternalIdBySku = (sku = '') => {
  const logTitle = `${MODULE} => getItemInternalIdBySku`;
  try {
    const trimmedSku = String(sku || '').trim();
    if (!trimmedSku) {
      return null;
    }

    if (!itemSkuCache) {
      itemSkuCache = {};
    }
    const cacheKey = trimmedSku.toUpperCase();
    if (Object.prototype.hasOwnProperty.call(itemSkuCache, cacheKey)) {
      return itemSkuCache[cacheKey];
    }

    const sql = `
      SELECT id, itemid
      FROM item
      WHERE isinactive = 'F'
        AND UPPER(itemid) = UPPER(?)
    `;
    const results = query
      .runSuiteQL({
        query: sql,
        params: [trimmedSku],
      })
      .asMappedResults();

    if (!results || results.length === 0) {
      itemSkuCache[cacheKey] = null;
      return null;
    }

    if (results.length > 1) {
      throw new Error(`Multiple NetSuite items found for SKU: ${trimmedSku}`);
    }

    const itemInternalId = String(results[0].id || '');
    itemSkuCache[cacheKey] = itemInternalId || null;
    return itemInternalId || null;
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, sku }),
    });
    throw error;
  }
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
  getItemInternalIdBySku,
  upsertItem,
  setConfiguration,
};
