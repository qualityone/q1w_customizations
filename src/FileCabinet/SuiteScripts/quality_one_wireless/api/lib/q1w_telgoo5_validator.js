/**
 * q1w_telgoo5_validator.js
 * @NApiVersion 2.1
 * @module q1w_telgoo5_validator
 * @description Validates Telgoo5 BPXML JSON trees (from xmlToJson)
 */

import CONSTANTS from '../../constants/q1w_global_constants';
import Telgoo5XmlHelper from '../../modules/helper/q1w_telgoo5_xml_helper';
import ValidationErrors from './q1w_validation_error';

const { ValidationError } = ValidationErrors;

const { TELGOO5 } = CONSTANTS;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const assertObject = (value, fieldPath) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`Missing or invalid ${fieldPath}`);
  }
};

const assertRequiredString = (value, fieldPath, { allowEmpty = false, maxLength = null } = {}) => {
  if (value === undefined || value === null) {
    throw new ValidationError(`Missing required field ${fieldPath}`);
  }
  const str = Telgoo5XmlHelper.coerceXmlText(value);
  if (!allowEmpty && str.trim() === '') {
    throw new ValidationError(`Missing required field ${fieldPath}`);
  }
  if (maxLength !== null && str.length > maxLength) {
    throw new ValidationError(`${fieldPath} must be at most ${maxLength} characters`);
  }
  return str;
};

const assertEmail = (value, fieldPath) => {
  const str = assertRequiredString(value, fieldPath);
  if (!EMAIL_REGEX.test(str)) {
    throw new ValidationError(`Invalid email for ${fieldPath}`);
  }
  return str;
};

const assertEnum = (value, fieldPath, allowed) => {
  const str = assertRequiredString(value, fieldPath);
  if (!allowed.includes(str)) {
    throw new ValidationError(`Invalid value for ${fieldPath}. Allowed: ${allowed.join(', ')}`);
  }
  return str;
};

const assertNumericString = (value, fieldPath) => {
  const str = assertRequiredString(value, fieldPath);
  if (Number.isNaN(Number(str))) {
    throw new ValidationError(`${fieldPath} must be a numeric string`);
  }
  return str;
};

const validateMessageHeader = (json, expectedTransactionName) => {
  assertObject(json, 'message root');
  const header = json['message-header'];
  assertObject(header, 'message-header');

  assertRequiredString(header['message-id'], 'message-header/message-id');
  assertRequiredString(header['create-timestamp'], 'message-header/create-timestamp');
  assertRequiredString(header['partner-name'], 'message-header/partner-name');
  assertRequiredString(header['source-url'], 'message-header/source-url');
  assertEnum(header['transaction-name'], 'message-header/transaction-name', [expectedTransactionName]);

  return header;
};

const validateShipmentInformation = (shipment, { requireShipVia = false } = {}) => {
  assertObject(shipment, 'shipment-information');
  assertRequiredString(shipment['ship-first-name'], 'shipment-information/ship-first-name');
  assertRequiredString(shipment['ship-last-name'], 'shipment-information/ship-last-name');
  assertRequiredString(shipment['ship-address1'], 'shipment-information/ship-address1');
  assertRequiredString(shipment['ship-address2'], 'shipment-information/ship-address2', { allowEmpty: true });
  assertRequiredString(shipment['ship-city'], 'shipment-information/ship-city');
  assertRequiredString(shipment['ship-state'], 'shipment-information/ship-state');
  assertRequiredString(shipment['ship-post-code'], 'shipment-information/ship-post-code');
  assertRequiredString(shipment['ship-country-code'], 'shipment-information/ship-country-code');
  assertRequiredString(shipment['ship-phone1'], 'shipment-information/ship-phone1');
  assertEmail(shipment['ship-email'], 'shipment-information/ship-email');
  if (requireShipVia) {
    assertEnum(shipment['ship-via'], 'shipment-information/ship-via', TELGOO5.SHIP_VIA);
  }
};

const validateOrderLineItems = (detail) => {
  assertObject(detail, 'detail');
  const lineItems = detail['line-item'];
  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
    throw new ValidationError('At least one line-item is required in detail');
  }
  lineItems.forEach((lineItem, index) => {
    assertObject(lineItem, `detail/line-item[${index}]`);
    assertRequiredString(lineItem['product-name'], `line-item[${index}]/product-name`);
    assertRequiredString(lineItem['line-reference'], `line-item[${index}]/line-reference`);
    assertNumericString(lineItem.quantity, `line-item[${index}]/quantity`);
    assertRequiredString(lineItem['item-code'], `line-item[${index}]/item-code`, { allowEmpty: true });
  });
};

const validateReturnLineItems = (detail) => {
  assertObject(detail, 'detail');
  const lineItems = detail['line-item'];
  if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
    throw new ValidationError('At least one line-item is required in detail');
  }
  lineItems.forEach((lineItem, index) => {
    assertObject(lineItem, `detail/line-item[${index}]`);
    assertRequiredString(lineItem['product-name'], `line-item[${index}]/product-name`);
    assertNumericString(lineItem.quantity, `line-item[${index}]/quantity`);
    assertRequiredString(lineItem['item-code'], `line-item[${index}]/item-code`, { allowEmpty: true });
    assertRequiredString(lineItem.esn, `line-item[${index}]/esn`, { allowEmpty: true });
    assertRequiredString(lineItem.imei, `line-item[${index}]/imei`, { allowEmpty: true });
    assertRequiredString(lineItem.iccid, `line-item[${index}]/iccid`, { allowEmpty: true });
  });
};

const validateOrder = (json) => {
  const header = validateMessageHeader(json, TELGOO5.TRANSACTION_NAMES.SALES_ORDER);
  const submission = json['sales-order-submission'];
  assertObject(submission, 'sales-order-submission');

  const submissionHeader = submission.header;
  assertObject(submissionHeader, 'sales-order-submission/header');
  assertRequiredString(submissionHeader['customer-id'], 'header/customer-id');

  const orderHeader = submissionHeader['order-header'];
  assertObject(orderHeader, 'order-header');
  assertRequiredString(orderHeader['customer-order-number'], 'order-header/customer-order-number', {
    maxLength: TELGOO5.MAX_ORDER_NUMBER_LENGTH,
  });
  assertRequiredString(orderHeader['customer-order-date'], 'order-header/customer-order-date');

  validateShipmentInformation(submissionHeader['shipment-information'], { requireShipVia: true });
  validateOrderLineItems(submission.detail);

  return {
    header,
    submission,
    customerOrderNumber: orderHeader['customer-order-number'],
    messageId: header['message-id'],
    partnerName: header['partner-name'],
    sourceUrl: header['source-url'],
    transactionName: header['transaction-name'],
  };
};

const validateReturn = (json) => {
  const header = validateMessageHeader(json, TELGOO5.TRANSACTION_NAMES.RETURN_AUTHORIZATION);
  const submission = json['return-authorization-submission'];
  assertObject(submission, 'return-authorization-submission');

  const submissionHeader = submission.header;
  assertObject(submissionHeader, 'return-authorization-submission/header');
  assertRequiredString(submissionHeader['customer-id'], 'header/customer-id');

  const orderHeader = submissionHeader['order-header'];
  assertObject(orderHeader, 'order-header');
  assertRequiredString(orderHeader['customer-order-number'], 'order-header/customer-order-number');
  assertRequiredString(orderHeader['customer-order-date'], 'order-header/customer-order-date');

  validateShipmentInformation(submissionHeader['shipment-information'], { requireShipVia: false });
  validateReturnLineItems(submission.detail);

  return {
    header,
    submission,
    customerOrderNumber: orderHeader['customer-order-number'],
    messageId: header['message-id'],
    partnerName: header['partner-name'],
    sourceUrl: header['source-url'],
    transactionName: header['transaction-name'],
  };
};

export default {
  validateOrder,
  validateReturn,
};
