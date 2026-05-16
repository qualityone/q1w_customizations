/* eslint-disable no-unused-vars */
/**
 * q1w_salesorder.js
 * @NApiVersion 2.1
 */

import log from 'N/log';
import General from '../helper/q1w_general';
import SalesOrderDao from '../dao/q1w_salesorder_dao';
import Integration from './q1w_integration';
// TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
// import FieldMap from './q1w_fieldmap';

const INTERNALID = 'salesorder';

const getInvoiceByTicketNumbers = (ticketNumbers) => {
  const invoices = [];

  // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
  // Dropped reference to `custcol_f3_ticket_number` until the column is reintroduced.
  /*
  const results = General.runSearch({
    searchType: 'invoice',
    cols: [{
      name: 'internalid'
    }],
    filters: [
      ['custcol_f3_ticket_number', 'is', ticketNumbers[0]]
    ]
  });
  results.forEach(elem => {
    const internalId = elem.getValue({
      name: 'internalid'
    });
    invoices.push({
      internalId
    });
  });
  */
  log.debug('getInvoiceByTicketNumbers >> invoices Arr', invoices);
  return invoices;
};

const createSOInNetsuite = (payload = {}) => {
  const soPayload = { ...payload.data };

  // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
  // const soBodyFieldMap = Integration.getFieldMapByType(`${INTERNALID}body`);
  // const soItemLineFieldMap = Integration.getFieldMapByType(`${INTERNALID}itemline`);

  log.debug('createSOInNetsuite >> soPayload.items', soPayload.items);

  // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
  // The hard ticket-number lookup depends on the dropped `custcol_f3_ticket_number` column.
  // const ticketNumbers = soPayload.items.map(elem => (`${elem.TicketNumber}`));
  // const invoices = getInvoiceByTicketNumbers(ticketNumbers);
  const invoices = [];

  // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
  // const nsBodyFieldsMap = FieldMap.transformMapForNsFieldsforObject(soPayload, soBodyFieldMap);
  // const { nsFieldMapArr: nsItemLineFieldsMap = [], unMappedValuesArr = [] } = FieldMap.transformMapForNsFieldsForArrayObject(
  //   soPayload.items,
  //   soItemLineFieldMap,
  //   true
  // );
  const nsBodyFieldsMap = {};
  const nsItemLineFieldsMap = [];
  const unMappedValuesArr = [];

  if (invoices && invoices.length > 0) {
    for (let i = 0; i < nsItemLineFieldsMap.length; i++) {
      nsItemLineFieldsMap[i].isclosed = true;
    }
  }
  log.debug('createSOInNetsuite >> body', nsBodyFieldsMap);
  log.debug('createSOInNetsuite >> items', nsItemLineFieldsMap);
  if (unMappedValuesArr.length > 0) {
    throw new Error(unMappedValuesArr.join('\n'));
  }

  // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
  // SalesOrderDao.setIdentifier('custbody_f3_transaction_id');
  // SalesOrderDao.setConfiguration('custbody_f3_integration_config');
  // nsBodyFieldsMap.custbody_f3_integration_config = Integration.getCurrentConfig().id;
  return SalesOrderDao.createSalesOrder({
    body: nsBodyFieldsMap,
    items: nsItemLineFieldsMap,
  });
};

export default {
  createSOInNetsuite,
};
