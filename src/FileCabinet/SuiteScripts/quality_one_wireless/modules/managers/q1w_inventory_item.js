/* eslint-disable no-unused-vars */
/**
 * q1w_inventory_item.js
 * @NApiVersion 2.1
 */

import log from 'N/log';
import ItemDao from '../dao/q1w_inventory_item_dao';
import Integration from './q1w_integration';
// TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
// import FieldMap from './q1w_fieldmap';

const INTERNALID = 'inventoryitem';

const upsertItem = ({ data }) => {
  const itemPayload = data;
  itemPayload.taxschedule = 1;

  // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
  // const itemBodyFieldMap = Integration.getFieldMapByType(`${INTERNALID}body`);
  // log.debug('upsertItem >> itemBodyFieldMap', itemBodyFieldMap);
  // const nsBodyFieldsMap = FieldMap.transformMapForNsFieldsforObject(
  //   itemPayload,
  //   itemBodyFieldMap
  // );
  const nsBodyFieldsMap = { ...itemPayload };

  // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
  // nsBodyFieldsMap.custitem_f3_imported_from = Integration.getCurrentConfig().id;

  log.debug('upsertItem >> nsBodyFieldsMap', nsBodyFieldsMap);

  // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
  // ItemDao.setIdentifier('custitem_f3_lt_item_name');
  // ItemDao.setConfiguration('custitem_f3_imported_from');
  return ItemDao.upsertItem({
    body: nsBodyFieldsMap,
  });
};

export default {
  upsertItem,
};
