/**
 * @NApiVersion 2.1
 * @module q1w_magicjack_transformer
 * @author Q1W
 * @description Transforms MagicJack payloads into NetSuite payloads
 */

import log from 'N/log';
import CONSTANTS from '../../constants/q1w_global_constants';
import GlobalHelper from '../helper/q1w_global_helper';

const MODULE = 'q1w_magicjack_transformer';
const { MAGICJACK, CUSTOM_FIELD_IDS, ENVIRONMENT_SPECIFIC_CONSTANTS, GLOBAL } = CONSTANTS;

const normalizeCountry = (country = '') => {
  const upperCountry = String(country || '')
    .trim()
    .toUpperCase();
  if (!upperCountry) {
    return '';
  }
  return MAGICJACK.COUNTRY_MAP[upperCountry] || upperCountry;
};

const parseQuantity = (quantityStr) => {
  const quantity = Number(quantityStr || 1);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1;
  }
  return quantity;
};

const getDisplayName = (validatedData = {}) => {
  const firstName = validatedData.fname || '';
  const lastName = validatedData.lname || '';
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    return fullName;
  }
  return validatedData.memberid || 'MagicJack Customer';
};

const makeOrderNumber = (orderId = '') => {
  return `${MAGICJACK.ORDER_PREFIX}_${String(orderId || '').trim()}`;
};

const parseOrderInitDate = (value) => {
  const dateStr = String(value || '').trim();
  if (!dateStr || dateStr.length !== 8) {
    return new Date();
  }
  const year = Number(dateStr.substring(0, 4));
  const month = Number(dateStr.substring(4, 6)) - 1;
  const day = Number(dateStr.substring(6, 8));
  const parsedDate = new Date(year, month, day);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }
  return parsedDate;
};

const getSoCustomFormId = () => {
  const envKey = GlobalHelper.getEnvAccount();
  const envConfig = ENVIRONMENT_SPECIFIC_CONSTANTS[envKey] || ENVIRONMENT_SPECIFIC_CONSTANTS.PRODUCTION || {};
  return (envConfig.MAGICJACK || {}).SO_CUSTOM_FORM_ID || MAGICJACK.DEFAULT_SO_CUSTOM_FORM_ID || '';
};

const buildAddressFields = (validatedData = {}, addressType = 'ship') => {
  const prefix = addressType;
  const country = addressType === 'bill' ? MAGICJACK.CUSTOMER_BILLING_COUNTRY : normalizeCountry(validatedData.country);
  return {
    [`${prefix}addr1`]: validatedData.addr1 || '',
    [`${prefix}addr2`]: validatedData.addr2 || '',
    [`${prefix}city`]: validatedData.city || '',
    [`${prefix}state`]: validatedData.state || '',
    [`${prefix}zip`]: validatedData.zip || '',
    [`${prefix}country`]: country || '',
    [`${prefix}addressee`]: getDisplayName(validatedData),
    [`${prefix}addrphone`]: validatedData.billing_telephone || '',
  };
};

const transformToCustomer = ({ validatedData = {}, storeDefaults = {} }) => {
  const logTitle = `${MODULE} => transformToCustomer`;
  try {
    const shippingCountry = normalizeCountry(validatedData.country);
    const firstName = validatedData.fname || '';
    const lastName = validatedData.lname || '';

    const body = {
      externalid: validatedData.memberid,
      isperson: GLOBAL.TRUE,
      firstname: firstName || 'MagicJack',
      lastname: lastName || 'Customer',
      email: validatedData.memberid,
      phone: validatedData.billing_telephone || '',
      terms: MAGICJACK.CUSTOMER_TERMS_ID,
      subsidiary: storeDefaults.subsidiary,
      taxitem: storeDefaults.taxItem,
      [CUSTOM_FIELD_IDS.SALES_CHANNEL]: storeDefaults.salesChannel,
      [CUSTOM_FIELD_IDS.REGION]: MAGICJACK.CUSTOMER_REGION_ID,
    };

    const addresses = [
      {
        label: 'MagicJack Billing',
        defaultbilling: GLOBAL.TRUE,
        defaultshipping: GLOBAL.FALSE,
        addr1: validatedData.addr1 || '',
        addr2: validatedData.addr2 || '',
        city: validatedData.city || '',
        state: validatedData.state || '',
        zip: validatedData.zip || '',
        country: MAGICJACK.CUSTOMER_BILLING_COUNTRY,
        phone: validatedData.billing_telephone || '',
        addressee: getDisplayName(validatedData),
      },
      {
        label: 'MagicJack Shipping',
        defaultbilling: GLOBAL.FALSE,
        defaultshipping: GLOBAL.TRUE,
        addr1: validatedData.addr1 || '',
        addr2: validatedData.addr2 || '',
        city: validatedData.city || '',
        state: validatedData.state || '',
        zip: validatedData.zip || '',
        country: shippingCountry || '',
        phone: validatedData.billing_telephone || '',
        addressee: getDisplayName(validatedData),
      },
    ];

    return {
      body,
      addresses,
    };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const transformToSalesOrder = ({
  validatedData = {},
  storeDefaults = {},
  customerId,
  itemId,
  shipMethodId = null,
  orderNumber = '',
}) => {
  const logTitle = `${MODULE} => transformToSalesOrder`;
  try {
    const resolvedOrderNumber = orderNumber || makeOrderNumber(validatedData.order_id);
    const soBody = {
      externalid: resolvedOrderNumber,
      entity: customerId,
      trandate: parseOrderInitDate(validatedData.order_init_date),
      otherrefnum: resolvedOrderNumber,
      orderstatus: MAGICJACK.SO_ORDER_STATUS,
      class: storeDefaults.salesChannel,
      location: storeDefaults.location,
      department: storeDefaults.department,
      taxitem: storeDefaults.taxItem,
      subsidiary: storeDefaults.subsidiary,
      shippingcost: MAGICJACK.SO_SHIPPING_COST,
      memo: resolvedOrderNumber,
      istaxable: false,
      [CUSTOM_FIELD_IDS.BRAND_TRANSACTION]: storeDefaults.brand,
      [CUSTOM_FIELD_IDS.PACKING_SLIP_PASSTHRU]: '',
      ...buildAddressFields(validatedData, 'ship'),
      ...buildAddressFields(validatedData, 'bill'),
    };

    const customFormId = getSoCustomFormId();
    if (customFormId) {
      soBody.customform = customFormId;
    }
    if (shipMethodId) {
      soBody.shipmethod = shipMethodId;
    }

    const items = [
      {
        item: itemId,
        quantity: parseQuantity(validatedData.quantity),
        rate: MAGICJACK.SO_LINE_RATE,
        price: MAGICJACK.SO_PRICE_LEVEL_ID,
        istaxable: false,
      },
    ];

    return {
      body: soBody,
      items,
    };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const buildAckRow = (csvRawData = []) => {
  const logTitle = `${MODULE} => buildAckRow`;
  try {
    return ['ACK', ...csvRawData];
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const buildShipmentRow = (fulfillmentData = {}) => {
  const logTitle = `${MODULE} => buildShipmentRow`;
  try {
    return [
      'ACK',
      fulfillmentData.externalOrderId || '',
      fulfillmentData.firstName || '',
      fulfillmentData.lastName || '',
      fulfillmentData.addr1 || '',
      fulfillmentData.addr2 || '',
      fulfillmentData.city || '',
      fulfillmentData.state || '',
      fulfillmentData.zip || '',
      fulfillmentData.country || '',
      fulfillmentData.sku || '',
      fulfillmentData.shipMethod || '',
      'SUCCESS',
      '',
      'SHIPPED',
      fulfillmentData.shippedDate || '',
      fulfillmentData.trackingNumber || '',
      fulfillmentData.deviceIdentifiers || '',
      '',
      '',
      'VPS',
      '',
      '',
      '',
      '',
      '',
    ];
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

export default {
  normalizeCountry,
  makeOrderNumber,
  parseOrderInitDate,
  transformToCustomer,
  transformToSalesOrder,
  buildAckRow,
  buildShipmentRow,
};
