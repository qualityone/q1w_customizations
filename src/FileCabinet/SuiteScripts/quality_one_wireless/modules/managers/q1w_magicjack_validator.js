/**
 * @NApiVersion 2.1
 * @module q1w_magicjack_validator
 * @author Q1W
 * @description Validates MagicJack inbound CSV rows
 */

import log from 'N/log';
import CONSTANTS from '../../constants/q1w_global_constants';

const MODULE = 'q1w_magicjack_validator';
const { MAGICJACK } = CONSTANTS;

const getStringValue = (row = [], index = 0) => {
  const value = row[index];
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

const validateRow = (csvRow = []) => {
  const logTitle = `${MODULE} => validateRow`;
  try {
    const errors = [];

    if (!Array.isArray(csvRow)) {
      return {
        isValid: false,
        errors: ['CSV row is not an array'],
        validatedData: null,
      };
    }

    if (csvRow.length !== MAGICJACK.EXPECTED_COLUMN_COUNT) {
      errors.push(`Invalid column count. Expected ${MAGICJACK.EXPECTED_COLUMN_COUNT}, received ${csvRow.length}`);
    }

    const validatedData = {
      order_id: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.ORDER_ID),
      fname: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.FNAME),
      middle_name: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.MIDDLE_NAME),
      lname: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.LNAME),
      addr1: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.ADDR1),
      addr2: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.ADDR2),
      city: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.CITY),
      state: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.STATE),
      zip: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.ZIP),
      country: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.COUNTRY),
      ext_prod_code: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.EXT_PROD_CODE),
      ship_method: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.SHIP_METHOD),
      quantity: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.QUANTITY),
      order_init_date: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.ORDER_INIT_DATE),
      memberid: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.MEMBERID),
      pin: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.PIN),
      service_activation_date: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.SERVICE_ACTIVATION_DATE),
      billing_telephone: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.BILLING_TELEPHONE),
      rma_number: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.RMA_NUMBER),
      rma_date: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.RMA_DATE),
      lob: getStringValue(csvRow, MAGICJACK.CSV_COLUMNS.LOB),
    };

    const requiredFields = ['order_id', 'memberid', 'addr1', 'city', 'state', 'zip', 'country', 'ext_prod_code'];
    requiredFields.forEach((fieldId) => {
      if (!validatedData[fieldId]) {
        errors.push(`Missing required field: ${fieldId}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      validatedData,
    };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

export default {
  validateRow,
};
