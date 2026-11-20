'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType MapReduceScript
 *
 * @description Generates Customer Deposits for new orders found by the "no customer deposit" saved search.
 * @author Taha Aslam
 */

import email from 'N/email';
import log from 'N/log';
import record from 'N/record';
import search from 'N/search';

/** Saved search listing orders that still need a Customer Deposit */
const NO_CUSTOMER_DEPOSIT_SEARCH_ID = 'customsearch6007';
/** Employee internal ID used as the email author (Scott) */
const EMAIL_AUTHOR_ID = 649896;
const EMAIL_RECIPIENTS = ['it@q1w.net'];

/**
 * @param {string} subject
 * @param {Error} error
 */
const sendErrorEmail = (subject, error) => {
  const logTitle = 'q1w_customer_deposit_mr => sendErrorEmail';
  try {
    email.send({
      author: EMAIL_AUTHOR_ID,
      recipients: EMAIL_RECIPIENTS,
      subject,
      body: JSON.stringify({ message: error.message, stack: error.stack }),
    });
  } catch (emailError) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: emailError.message, stack: emailError.stack }),
    });
  }
};

const getInputData = () => {
  const logTitle = 'q1w_customer_deposit_mr => getInputData';
  const orders = [];
  try {
    search
      .load({ id: NO_CUSTOMER_DEPOSIT_SEARCH_ID })
      .run()
      .each((result) => {
        const { columns } = result;
        orders.push({
          id: result.getValue(columns[0]),
          tranid: result.getValue(columns[1]),
          customer: result.getValue(columns[2]),
          amount: result.getValue(columns[3]),
          location: result.getValue(columns[4]),
        });
        return true;
      });
    log.debug({ title: logTitle, details: `Orders found: ${orders.length}` });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    sendErrorEmail('Error getting order data - Customer Deposits', error);
  }
  return orders;
};

const reduce = (context) => {
  const logTitle = 'q1w_customer_deposit_mr => reduce';
  let order = {};
  try {
    order = JSON.parse(context.values[0]);
    log.debug({ title: logTitle, details: `Creating Customer Deposit for ${order.id} : ${order.tranid}` });

    const depositRecord = record.create({
      type: record.Type.CUSTOMER_DEPOSIT,
      defaultValues: {
        entity: order.customer,
        salesorder: order.id,
      },
    });
    depositRecord.setValue({ fieldId: 'payment', value: order.amount });
    depositRecord.setValue({ fieldId: 'location', value: order.location });

    const depositId = depositRecord.save();
    log.debug({ title: logTitle, details: `Customer Deposit created: ${depositId}` });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, order }),
    });
    sendErrorEmail(`Error creating Customer Deposit on ${order.tranid}`, error);
  }
};

export default { getInputData, reduce };
