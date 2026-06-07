/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 * @author Q1W
 * @description One-time utility to capture an SFTP password and display the NetSuite passwordGuid for config JSON
 */

import log from 'N/log';
import serverWidget from 'N/ui/serverWidget';

const MODULE = 'q1w_sftp_credential_sl';

const CREDENTIAL_FIELD_ID = 'custpage_sftp_password';
const DOMAIN_FIELD_ID = 'custpage_sftp_host_domain';

const SFTP_SCRIPT_IDS = ['customscript_q1w_data_producer_ss', 'customscript_q1w_data_consumer_ss'];

const renderCaptureForm = () => {
  const form = serverWidget.createForm({ title: 'Q1W SFTP Password → passwordGuid' });

  const instructions = form.addField({
    id: 'custpage_instructions',
    type: serverWidget.FieldType.INLINEHTML,
    label: 'Instructions',
  });
  instructions.defaultValue = `
    <p>Enter the remote SFTP password once. NetSuite stores it securely and returns a <strong>passwordGuid</strong>
    to paste into Integration Config JSON as <code>sftpPasswordGuid</code>.</p>
    <p>Do not put the plaintext password in <code>custrecord_q1w_ic_configjson</code>.</p>
  `;

  const defaultSftpHost = 'eu-central-1.sftpcloud.io';

  form.addField({
    id: DOMAIN_FIELD_ID,
    type: serverWidget.FieldType.TEXT,
    label: 'SFTP host (domain restriction)',
  }).defaultValue = defaultSftpHost;

  form.addCredentialField({
    id: CREDENTIAL_FIELD_ID,
    label: 'SFTP Password',
    restrictToScriptIds: SFTP_SCRIPT_IDS,
    restrictToDomains: [defaultSftpHost],
  });
  form.addSubmitButton({ label: 'Save password and show GUID' });

  return form;
};

const renderGuidResultForm = (passwordGuid = '') => {
  const form = serverWidget.createForm({ title: 'Q1W SFTP passwordGuid (copy to config JSON)' });

  form.addField({
    id: 'custpage_guid',
    type: serverWidget.FieldType.LONGTEXT,
    label: 'sftpPasswordGuid',
  }).defaultValue = passwordGuid;

  form.addField({
    id: 'custpage_json_hint',
    type: serverWidget.FieldType.INLINEHTML,
    label: 'Usage',
  }).defaultValue = `
    <p>Add to <code>custrecord_q1w_ic_configjson</code>:</p>
    <pre>"sftpPasswordGuid": "${passwordGuid}"</pre>
  `;

  return form;
};

const onRequest = (context) => {
  const logTitle = `${MODULE} => onRequest`;
  try {
    if (context.request.method === 'GET') {
      context.response.writePage(renderCaptureForm());
      return;
    }

    const passwordGuid = context.request.parameters[CREDENTIAL_FIELD_ID] || '';
    if (!passwordGuid) {
      throw new Error('No passwordGuid returned. Submit the form with an SFTP password.');
    }

    log.audit({
      title: logTitle,
      details: JSON.stringify({
        message: 'SFTP credential captured; copy passwordGuid from the Suitelet page into Integration Config JSON',
        restrictedToScripts: SFTP_SCRIPT_IDS,
      }),
    });

    context.response.writePage(renderGuidResultForm(passwordGuid));
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

export default { onRequest };
