'use strict';

/**
 * q1w_global_helper
 * @author Taha Aslam
 * @description Common helper functions for UI, search, and utility operations
 */

import _ from '../third_party/lodash';
import search from 'N/search';
import runtime from 'N/runtime';
import log from 'N/log';

const percentToDecimalPoints = (percent, asRaw = false) => {
  percent = parseFloat(percent || 0);

  return asRaw ? percent : percent / 100;
};

const roundToDecimalPoints = (num, limit = 2) => _.round(num, limit);

const transformArrayToObject = (transformArray, key, value) => {
  return _.reduce(
    transformArray,
    function (transformObject, obj) {
      transformObject[obj[key]] = obj[value] ?? null;

      return transformObject;
    },
    {}
  );
};

const openDialog = () => {
  jQuery('.overlay').show();
};

const closeDialog = () => {
  //jQuery('.uir-message-buttons button').click();
  jQuery('.overlay').hide();
};

const searchRecords = (context) => {
  const { columns: daocols, filters, type, fieldmap } = context;

  const searchObj = search.create({
    type,
    columns: _.clone(daocols),
    filters,
  });

  let parsedObj = {};
  const results = [];

  // Using runPaged for optimized search execution
  const pagedResults = searchObj.runPaged({ pageSize: 1000 });

  pagedResults.pageRanges.forEach((pageRange) => {
    const page = pagedResults.fetch({ index: pageRange.index });

    page.data.forEach((result) => {
      parsedObj = { id: result.id, recordType: result.recordType };

      daocols.forEach((col) => {
        const mapping = col.mappedField || col.to;
        if (mapping) {
          parsedObj[mapping] = col.useText
            ? { text: result.getText(col), value: result.getValue(col) }
            : result.getValue(col);
        } else {
          parsedObj[fieldmap[col.name]] = col.useText
            ? { text: result.getText(col), value: result.getValue(col) }
            : result.getValue(col);
        }
      });

      results.push(parsedObj);
    });
  });

  return results;
};

const isCreatedFrom = (targetType, recordObj) => {
  if (!targetType) {
    return false;
  }

  const createdFromId = recordObj.getValue({ fieldId: 'createdfrom' });
  if (!createdFromId) {
    return false;
  }

  const lookupFields = search.lookupFields({
    type: search.Type.TRANSACTION,
    id: createdFromId,
    columns: ['type'],
  });
  const { type } = lookupFields;

  if (type.length && type[0]?.value === targetType) {
    return true;
  }

  return false;
};

const getNSUserDateFormat = () => {
  const userObj = runtime.getCurrentUser();
  let dateFormat = userObj.getPreference({
    name: 'DATEFORMAT',
  });

  // It is because MOMENT doesnot doesnot support MONTH AND Mon
  dateFormat = dateFormat.replace(/MONTH/, 'MMMM').replace(/Mon/, 'MMM');
  return dateFormat;
};

const isTOFulfillment = (recordObj) => {
  if (!recordObj) {
    return false;
  }

  const createdFrom = recordObj.getValue({
    fieldId: 'createdfrom',
  });

  if (!createdFrom) {
    return false;
  }

  const lookupValues = search.lookupFields({
    type: search.Type.TRANSACTION,
    id: createdFrom,
    columns: ['type'],
  });

  if (lookupValues?.type?.length) {
    return lookupValues.type[0].value !== 'SalesOrd';
  }

  return false;
};

const hideButtonsUE = (context, buttonIds = []) => {
  log.debug('hideButtons...', buttonIds);
  try {
    require(['N/ui/serverWidget'], (ui) => {
      const hiddenField = context.form.addField({
        id: `custpage_hide_redundant_buttons`,
        label: 'not shown - hidden',
        type: ui.FieldType.INLINEHTML,
      });
      let source = 'jQuery(() => {';
      buttonIds.forEach((id) => {
        source += `jQuery("${id}").hide();`;
      });
      source += '});';

      hiddenField.defaultValue = `<script>${source}</script>`;
    });
  } catch (error) {
    log.debug('Error => hideButtons', error);
  }
};

const addOverlay = ({ form }) => {
  require(['N/ui/serverWidget'], (ui) => {
    const loaderHtmlField = form.addField({
      id: 'custpage_loaderhtml',
      label: 'Loader HTML',
      type: ui.FieldType.INLINEHTML,
    });
    loaderHtmlField.defaultValue = `
    <style>
      .overlay{
        position: fixed;
        top: 0px;
        left: 0px;
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgb(96 119 153 / 35%);
        z-Index: 9;
        flex-direction: column;
      }
      
      .loader {
        border: 6px solid rgb(243 243 243 / 80%) !important;
        border-top: 6px solid #607799 !important;
        border-radius: 50% !important;
        width: 45px !important;
        height: 45px !important;
        animation: spin 2s linear infinite !important;
      }
      .loader + div {
        margin-top: 20px;
      }
      .loader + div span {
        font-size: 16px;
        color: #24385B;
        font-weight: 700;
        background-color:#dfdfdf;
        padding: 10px;
        border-radius: 10px; /* Adjust the value to change the roundness */
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); /* Adjust the values for shadow */
      }
      </style>
      
      <div class="overlay" style="display: none;">
        <div class="loader"></div>
        <div>
          <span>Please wait while we are processing your request...</span>
        </div>
      </div>
    `;
  });
};

/**
 * Returns the environment account identifier.
 * - Sandbox: returns the sub-account portion after '_' (e.g., 'SB1' from '1234567_SB1')
 * - Production/other: returns the envType value directly
 * @returns {string|number} Environment account identifier
 */
const getEnvAccount = () => {
  const logTitle = 'q1w_env_helper => getEnvAccount';
  try {
    const {
      envType: env,
      accountId,
      EnvType: { SANDBOX },
    } = runtime;
    return env === SANDBOX ? accountId.split('_')[1] : env;
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    throw error;
  }
};

export default {
  hideButtonsUE,
  percentToDecimalPoints,
  roundToDecimalPoints,
  transformArrayToObject,
  openDialog,
  closeDialog,
  addOverlay,
  searchRecords,
  isCreatedFrom,
  getNSUserDateFormat,
  isTOFulfillment,
  getEnvAccount,
};
