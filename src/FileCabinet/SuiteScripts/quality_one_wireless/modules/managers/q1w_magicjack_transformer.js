/**
 * @NApiVersion 2.1
 * @module q1w_magicjack_transformer
 * @author Q1W
 * @description Transforms MagicJack payloads into NetSuite payloads
 */

import log from 'N/log';
import CONSTANTS from '../../constants/q1w_global_constants';

const MODULE = 'q1w_magicjack_transformer';
const { MAGICJACK } = CONSTANTS;

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

const transformToCustomer = (validatedData = {}) => {
  const logTitle = `${MODULE} => transformToCustomer`;
  try {
    const country = normalizeCountry(validatedData.country);
    const firstName = validatedData.fname || '';
    const lastName = validatedData.lname || '';
    const isPerson = firstName || lastName;

    const body = {
      email: validatedData.memberid,
      phone: validatedData.billing_telephone || '',
    };

    if (isPerson) {
      body.isperson = true;
      body.firstname = firstName || 'MagicJack';
      body.lastname = lastName || 'Customer';
    } else {
      body.companyname = getDisplayName(validatedData);
    }

    const addresses = [
      {
        label: 'MagicJack',
        defaultbilling: true,
        defaultshipping: true,
        addr1: validatedData.addr1 || '',
        addr2: validatedData.addr2 || '',
        city: validatedData.city || '',
        state: validatedData.state || '',
        zip: validatedData.zip || '',
        country: country || '',
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

const transformToSalesOrder = ({ validatedData = {}, customerId, itemId, shipMethodId = null }) => {
  const logTitle = `${MODULE} => transformToSalesOrder`;
  try {
    const soBody = {
      entity: customerId,
      otherrefnum: validatedData.order_id,
      memo: `MagicJack Order ${validatedData.order_id}`,
    };
    if (shipMethodId) {
      soBody.shipmethod = shipMethodId;
    }

    const items = [
      {
        item: itemId,
        quantity: parseQuantity(validatedData.quantity),
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
  transformToCustomer,
  transformToSalesOrder,
  buildAckRow,
  buildShipmentRow,
};
