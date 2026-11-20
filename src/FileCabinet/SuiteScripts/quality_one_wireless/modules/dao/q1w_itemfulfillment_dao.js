'use strict';

/**
 * @NApiVersion 2.1
 * @module q1w_itemfulfillment_dao
 * @author Q1W
 * @description EDF IMEI lookup for an Item Fulfillment
 */

import log from 'N/log';
import GlobalHelper from '../helper/q1w_global_helper';
import CONSTANTS from '../../constants/q1w_global_constants';

const { BBH, GLOBAL } = CONSTANTS;
const { EDF } = BBH;

/**
 * Returns EDF IMEIs for a fulfillment, keyed by item internal id.
 * Uses N/search (via searchRecords) because the EDF-to-IF join filter (`<field>.mainline`)
 * is the agreed search definition for this flow.
 * @param {string|number} fulfillmentId
 * @returns {Object<string, string[]>} e.g. { '1234': ['356938035643809'] }
 */
const getImeisByItem = (fulfillmentId) => {
  const logTitle = 'q1w_itemfulfillment_dao => getImeisByItem';
  try {
    const rows = GlobalHelper.searchRecords({
      type: EDF.RECORD_TYPE,
      filters: [
        [`${EDF.FIELDS.ITEM_FULFILLMENT}.${GLOBAL.INTERNAL_ID}`, GLOBAL.ANY_OF, fulfillmentId],
        GLOBAL.AND,
        [`${EDF.FIELDS.ITEM_FULFILLMENT}.${GLOBAL.MAIN_LINE}`, GLOBAL.IS, GLOBAL.TRUE],
      ],
      columns: [
        { name: EDF.FIELDS.IMEI, mappedField: 'imei' },
        { name: EDF.FIELDS.ITEM_RECORD_LINK, mappedField: 'itemId' },
      ],
    });
    return rows.reduce((imeisByItem, row) => {
      const imei = String(row.imei || '').trim();
      const itemId = String(row.itemId || '').trim();
      if (imei && itemId) {
        imeisByItem[itemId] = [...(imeisByItem[itemId] || []), imei];
      }
      return imeisByItem;
    }, {});
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, fulfillmentId }),
    });
    throw error;
  }
};

export default {
  getImeisByItem,
};
