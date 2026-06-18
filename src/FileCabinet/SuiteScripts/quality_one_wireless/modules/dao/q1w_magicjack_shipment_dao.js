/**
 * q1w_magicjack_shipment_dao.js
 * @NApiVersion 2.1
 * @module q1w_magicjack_shipment_dao
 * @author Q1W
 * @description Item fulfillment line and EDF serial searches for MagicJack shipment export
 */

import log from 'N/log';
import search from 'N/search';
import GlobalHelper from '../helper/q1w_global_helper';
import CONSTANTS from '../../constants/q1w_global_constants';

const MODULE = 'q1w_magicjack_shipment_dao';
const { MAGICJACK, CUSTOM_FIELD_IDS } = CONSTANTS;
const { SHIPMENT_SEARCH } = MAGICJACK;

const buildFulfillmentLineColumns = () => {
  const { ITEM_FIELDS, BODY_FIELDS } = SHIPMENT_SEARCH;
  return [
    { name: 'internalid', mappedField: 'fulfillmentId' },
    { name: 'tranid', mappedField: 'documentNumber' },
    { name: 'trandate', mappedField: 'shippedDate' },
    { name: 'trackingnumbers', mappedField: 'trackingNumber' },
    { name: 'quantity', mappedField: 'quantity' },
    { name: 'shipmethod', mappedField: 'shipMethodId' },
    { name: 'internalid', join: 'createdFrom', mappedField: 'salesOrderId' },
    { name: 'externalid', join: 'createdFrom', mappedField: 'salesOrderExternalId' },
    { name: 'shipaddress1', join: 'createdFrom', mappedField: 'addr1' },
    { name: 'shipaddress2', join: 'createdFrom', mappedField: 'addr2' },
    { name: 'shipcity', join: 'createdFrom', mappedField: 'city' },
    { name: 'shipstate', join: 'createdFrom', mappedField: 'state' },
    { name: 'shipzip', join: 'createdFrom', mappedField: 'zip' },
    { name: 'shipcountry', join: 'createdFrom', mappedField: 'country' },
    { name: 'firstname', join: 'customer', mappedField: 'firstName' },
    { name: 'lastname', join: 'customer', mappedField: 'lastName' },
    { name: 'internalid', join: 'item', mappedField: 'itemInternalId' },
    { name: 'itemid', join: 'item', mappedField: 'sku' },
    { name: ITEM_FIELDS.DEVICE_TYPE_HIDDEN, join: 'item', mappedField: 'deviceTypeHidden' },
    { name: BODY_FIELDS.CARRIER_RFSS, mappedField: 'carrierRfss' },
  ];
};

const buildFulfillmentLineFilters = (brandId) => {
  const { FULFILLMENT, LOOKBACK } = SHIPMENT_SEARCH;
  return [
    ['type', 'anyof', 'ItemShip'],
    'AND',
    ['status', 'anyof', 'ItemShip:C'],
    'AND',
    ['mainline', 'any', ''],
    'AND',
    ['createdfrom.subsidiary', 'anyof', ...FULFILLMENT.SUBSIDIARIES],
    'AND',
    ['shipping', 'is', 'F'],
    'AND',
    ['item', 'noneof', '@NONE@'],
    'AND',
    ['taxline', 'is', 'F'],
    'AND',
    ['cogs', 'is', 'F'],
    'AND',
    ['class', 'anyof', ...FULFILLMENT.CLASSES],
    'AND',
    ['lastmodifieddate', 'onorafter', LOOKBACK],
    'AND',
    [CUSTOM_FIELD_IDS.BRAND_TRANSACTION, 'anyof', brandId],
  ];
};

const buildEdfColumns = () => {
  const { FIELDS } = SHIPMENT_SEARCH.EDF;
  return [
    { name: FIELDS.PRIMARY_SN, mappedField: 'primarySn' },
    { name: 'internalid', join: FIELDS.SALES_ORDER, mappedField: 'salesOrderId' },
    { name: 'internalid', join: FIELDS.ITEM_RECORD_LINK, mappedField: 'itemInternalId' },
    { name: 'internalid', join: FIELDS.ITEM_FULFILLMENT, mappedField: 'fulfillmentId' },
  ];
};

const buildEdfFilters = (brandId) => {
  const { EDF, LOOKBACK } = SHIPMENT_SEARCH;
  const { FIELDS } = EDF;
  return [
    [FIELDS.SALES_ORDER, 'noneof', '@NONE@'],
    'AND',
    [`${FIELDS.SALES_ORDER}.class`, 'anyof', ...EDF.CLASSES],
    'AND',
    [`${FIELDS.SALES_ORDER}.mainline`, 'is', 'T'],
    'AND',
    [`${FIELDS.ITEM_FULFILLMENT}.mainline`, 'is', 'T'],
    'AND',
    [`${FIELDS.SALES_ORDER}.subsidiary`, 'anyof', ...EDF.SUBSIDIARIES],
    'AND',
    ['lastmodified', 'onorafter', LOOKBACK],
    'AND',
    [`${FIELDS.SALES_ORDER}.${CUSTOM_FIELD_IDS.BRAND_TRANSACTION}`, 'anyof', brandId],
  ];
};

const getFulfillmentLineResults = ({ brandId } = {}) => {
  const logTitle = `${MODULE} => getFulfillmentLineResults`;
  try {
    if (!brandId) {
      throw new Error('brandId is required for fulfillment line search');
    }
    return GlobalHelper.searchRecords({
      type: search.Type.ITEM_FULFILLMENT,
      filters: buildFulfillmentLineFilters(brandId),
      columns: buildFulfillmentLineColumns(),
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, brandId }),
    });
    throw error;
  }
};

const getEdfSerialResults = ({ brandId } = {}) => {
  const logTitle = `${MODULE} => getEdfSerialResults`;
  try {
    if (!brandId) {
      throw new Error('brandId is required for EDF serial search');
    }
    return GlobalHelper.searchRecords({
      type: SHIPMENT_SEARCH.EDF.RECORD_TYPE,
      filters: buildEdfFilters(brandId),
      columns: buildEdfColumns(),
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, brandId }),
    });
    throw error;
  }
};

export default {
  getFulfillmentLineResults,
  getEdfSerialResults,
};
