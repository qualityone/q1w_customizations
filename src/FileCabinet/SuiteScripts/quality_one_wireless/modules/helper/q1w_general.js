/**
 * q1w_general.js
 * @NApiVersion 2.1
 */

import search from 'N/search';
import log from 'N/log';
import runtime from 'N/runtime';
import task from 'N/task';
import format from 'N/format';
import _ from '../../modules/third_party/lodash';
import moment from '../../modules/third_party/moment';

let startTime = null;
const goLiveCheckErr = 'Transaction created before golive date';
const getScriptParams = (paramsMap = {}) => {
  const paramObj = {};
  const scriptObj = runtime.getCurrentScript();
  Object.keys(paramsMap).forEach((paramNode) => {
    const scriptParamValue =
      scriptObj.getParameter({
        name: paramsMap[paramNode],
      }) || null;
    paramObj[paramNode] = scriptParamValue;
  });

  log.debug('getScriptParams >> paramObj', paramObj);
  return paramObj;
};

/**
 * @param params
 */
const rescheduleScript = (params = {}) => {
  try {
    const reSchedule = task.create({
      taskType: task.TaskType.SCHEDULED_SCRIPT,
      scriptId: runtime.getCurrentScript().id,
      deploymentId: runtime.getCurrentScript().deploymentId,
      params,
    });

    reSchedule.submit();
  } catch (ex) {
    log.error('Exception at rescheduleScript', ex);
  }
};

/**
 * @param params.scriptId
 * @param params
 * @param params.deploymentId
 * @param params.params
 */
const scheduleScript = ({ scriptId, deploymentId, params = {} }) => {
  try {
    const reSchedule = task.create({
      taskType: task.TaskType.SCHEDULED_SCRIPT,
      scriptId,
      deploymentId,
      params,
    });

    reSchedule.submit();
  } catch (ex) {
    log.error('Exception at rescheduleScript', ex);
  }
};

const isReScheduleNeeded = (usageLimit = 1200) => {
  if (!startTime) {
    startTime = new Date();
  }
  log.debug('TESTING runtime', runtime.executionContext);
  if (
    runtime.executionContext === runtime.ContextType.SCHEDULED ||
    runtime.executionContext === runtime.ContextType.MAPREDUCE
  ) {
    const minutesAfterRescheduleScript = 50;

    const endTime = new Date().getTime();
    const minutes = Math.round(((endTime - startTime) / (1000 * 60)) * 100) / 100;

    const remainingUsage = runtime.getCurrentScript().getRemainingUsage();
    log.debug('Script Remaining Usage', { remainingUsage });
    log.debug('Script Minutes Utilized', { minutes });
    if (remainingUsage < usageLimit || minutes >= minutesAfterRescheduleScript) {
      return true;
    }
  }

  return false;
};

const runSearch = (options, convertToJson) => {
  log.debug('runSearch >> options', JSON.stringify(options));

  const { searchType, cols = [], filters, resultSize = -1 } = options;

  const filterChunk = [filters];

  let ResultSubSet = [];
  const maxSearchReturn = 800;
  let AllSearchResults = [];

  const convertToJsonCb =
    convertToJson ||
    function (res) {
      return res;
    };

  let alreadyHasInternalId = false;
  const searchCols = cols.map((colm) => {
    if (colm.name === 'internalid') {
      alreadyHasInternalId = true;
    }
    return search.createColumn(colm);
  });
  if (!alreadyHasInternalId) {
    searchCols.push(search.createColumn({ name: 'internalid', sort: search.Sort.ASC }));
  }

  for (let i = 0; i < filterChunk.length; i += 1) {
    const chunkedFilters = filterChunk[i];
    const searchObj = search.create({
      type: searchType,
      filters: chunkedFilters || [],
      columns: searchCols,
    });
    const Resultset = searchObj.run();

    let start = 0;
    let end = start + maxSearchReturn;

    do {
      ResultSubSet = Resultset.getRange({
        start,
        end,
      });
      AllSearchResults = AllSearchResults.concat(ResultSubSet);
      start = end;
      end = start + maxSearchReturn;

      if (resultSize > -1 && AllSearchResults.length >= resultSize) {
        break;
      }
    } while (ResultSubSet.length === maxSearchReturn);
  }

  return AllSearchResults.map((searchRes) => convertToJsonCb(searchRes, searchCols));
};

const removeElementFromArrayByIndex = (arr = [], index = 0) => {
  const arrClone = [...arr];
  arrClone.splice(index, 1);
  return arrClone;
};

const groupByProp = (dataArr = [], iteratee) => {
  return _.groupBy(dataArr, iteratee) || {};
};

const isArray = (dataVar = null) => {
  return _.isArray(dataVar);
};

const transformDateStr = (dateStr, dateformat, convertToDateFormat) => {
  const dateObj = moment(dateStr, dateformat);
  return dateObj.format(convertToDateFormat);
};

const isNullOrEmpty = (value) => {
  return value === null || value === '';
};

const transformDateStrToNSDateObj = (dateStr) => {
  const dateObj = format.parse({
    type: format.Type.DATE,
    value: dateStr,
  });
  return dateObj;
};

const transformDateStrToDateObj = (dateStr, dateFormat) => {
  const dateObj = moment(dateStr, dateFormat).toDate();
  return dateObj;
};

const checkGoLiveDate = (nsDateStr, dateStr, dateStrFormat) => {
  let isOnOrAfterGolive = true;
  const nsDate = transformDateStrToNSDateObj(nsDateStr);
  const extDate = transformDateStrToDateObj(dateStr, dateStrFormat);
  if (!extDate) {
    throw new Error('Payload returns null or undefined against golive date node');
  }
  isOnOrAfterGolive = extDate >= nsDate;
  if (!isOnOrAfterGolive) {
    log.debug('checkGoLiveDate', { input: { nsDateStr, dateStr, dateStrFormat }, nsDate, extDate });
    throw new Error(goLiveCheckErr);
  }
};

export default {
  rescheduleScript,
  scheduleScript,
  isReScheduleNeeded,
  runSearch,
  searchSort: search.Sort,
  getScriptParams,
  removeElementFromArrayByIndex,
  groupByProp,
  isArray,
  transformDateStr,
  isNullOrEmpty,
  transformDateStrToNSDateObj,
  transformDateStrToDateObj,
  checkGoLiveDate,
  moment,
  goLiveCheckErr,
};
