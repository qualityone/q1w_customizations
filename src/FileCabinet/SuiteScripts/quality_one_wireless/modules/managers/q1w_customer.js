/* eslint-disable no-unused-vars */
/**
 * q1w_customer.js
 * @NApiVersion 2.1
 */

import log from 'N/log';
import CustomerDao from '../dao/q1w_customer_dao';
import ContactDao from '../dao/q1w_contact_dao';
import Integration from './q1w_integration';
// TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
// import FieldMap from './q1w_fieldmap';

const INTERNALID = 'customer';

const upsertCustomer = ({ data }) => {
  const customerPayload = data;

  // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
  // const customerBodyFieldMap = Integration.getFieldMapByType(`${INTERNALID}body`);
  // const customerAddressFieldMap = Integration.getFieldMapByType(`${INTERNALID}address`);
  // const customerContactFieldMap = Integration.getFieldMapByType(`${INTERNALID}contactbody`);
  // const customerSalesTeamFieldMap = Integration.getFieldMapByType(`${INTERNALID}salesteam`);
  // const nsBodyFieldsMap = FieldMap.transformMapForNsFieldsforObject(
  //   customerPayload,
  //   customerBodyFieldMap
  // );
  // const nsAddressFieldsMap = FieldMap.transformMapForNsFieldsForArrayObject(
  //   (customerPayload.addresses || []),
  //   customerAddressFieldMap
  // );
  // const nsSalesTeamFieldsMap = FieldMap.transformMapForNsFieldsForArrayObject(
  //   (customerPayload.salesTeam || []),
  //   customerSalesTeamFieldMap
  // );
  const nsBodyFieldsMap = {};
  const nsAddressFieldsMap = [];
  const nsSalesTeamFieldsMap = [];

  log.debug('nsArfldmap', nsAddressFieldsMap);

  // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
  // CustomerDao.setIdentifier('custentity_f3_lt_customer_no');
  // CustomerDao.setConfigurationField('custentity_f3_integration_system');
  // nsBodyFieldsMap.custentity_f3_integration_system = Integration.getCurrentConfig().id;

  const customerCreateResp = CustomerDao.upsertCustomer({
    body: nsBodyFieldsMap,
    salesTeam: nsSalesTeamFieldsMap,
    addresses: nsAddressFieldsMap,
  });
  if (
    customerCreateResp.status &&
    customerCreateResp.customerId &&
    customerPayload.contacts &&
    customerPayload.contacts.length > 0
  ) {
    // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
    // ContactDao.setIdentifier('custentity_f3_contact_id');
    const vendorContacts = customerPayload.contacts || [];

    // TODO(q1w-port): wire field-map / custom fields. See plan q1w-entity-dao-module-port.
    // const nsContactFieldsMap = FieldMap.transformMapForNsFieldsForArrayObject(
    //   vendorContacts,
    //   customerContactFieldMap
    // );
    const nsContactFieldsMap = [];

    nsContactFieldsMap.forEach((contactFieldMap) => {
      log.debug('contactFieldMap', contactFieldMap);

      ContactDao.upsertContact({ company: customerCreateResp.customerId, body: contactFieldMap });
    });
  }

  return customerCreateResp;
};

export default {
  upsertCustomer,
};
