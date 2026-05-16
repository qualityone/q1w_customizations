/**
 * q1w_lookup_table_dao.js
 * @NApiVersion 2.1
 */
import log from 'N/log';
import GenericDao from './q1w_base_dao';
import General from '../helper/q1w_general';

let LookupTable = null;
let instance = null;
const INTERNALID = 'customrecord_q1w_lookup_table';

const FIELDS = {
  integration: 'custrecord_q1w_lt_integration_system',
  mapType: 'custrecord_q1w_lt_maptype',
  lookupKey: 'custrecord_q1w_lt_key',
  lookupValue: 'custrecord_q1w_lt_value',
};

const initialize = () => {
  if (!instance) {
    instance = GenericDao.initialize({
      internalId: INTERNALID,
      fields: FIELDS,
    });
  }
};

const upsert = (args) => {
  initialize();
  const { integration, mapType, lookupKey } = args;
  const toUpsert = { ...args };
  const recs = instance.getAll({
    filters: [
      [FIELDS.integration, 'anyof', integration],
      'AND',
      [FIELDS.mapType, 'is', mapType],
      'AND',
      [FIELDS.lookupKey, 'is', lookupKey],
    ],
  });
  if (recs.length > 0) {
    toUpsert.id = recs[0].id;
  }
  return instance.upsert(toUpsert);
};

const getLookupTableFromNs = () => {
  const LookupTableMap = {};
  const searchCols = Object.keys(FIELDS).map((fldId) => {
    return {
      name: FIELDS[fldId],
      label: fldId,
    };
  });
  const convertSearchToJson = (searchRes, cols) => {
    const obj = {};
    cols.forEach((elem) => {
      const fldId = elem.label;
      const value = searchRes.getValue(elem);
      obj[fldId] = value;
    });
    return obj;
  };

  const lookupTableResults =
    General.runSearch(
      {
        searchType: INTERNALID,
        cols: searchCols,
        filters: [['isinactive', 'is', 'F']],
      },
      convertSearchToJson
    ) || [];

  lookupTableResults.forEach((lookupMapResult) => {
    const { integration = 'DEFAULT', mapType, lookupKey, lookupValue } = lookupMapResult;
    const configIdFromSearch = integration || 'DEFAULT';
    if (!LookupTableMap[configIdFromSearch]) {
      LookupTableMap[configIdFromSearch] = {};
    }
    if (!LookupTableMap[configIdFromSearch][mapType]) {
      LookupTableMap[configIdFromSearch][mapType] = {};
    }
    LookupTableMap[configIdFromSearch][mapType][lookupKey] = lookupValue || '';
    LookupTableMap[configIdFromSearch][mapType][lookupKey.toString().toLowerCase()] = lookupValue || '';
    LookupTableMap[configIdFromSearch][mapType][lookupKey.toString().toUpperCase()] = lookupValue || '';
  });
  log.debug('getLookupTableFromNs >> LookupTableMap', LookupTableMap);
  return LookupTableMap;
};

const getLookupTable = () => {
  if (!LookupTable) {
    LookupTable = getLookupTableFromNs();
  }
  return LookupTable;
};

const getLookupValueByType = (lookupType, lookupKey, configId, allowDefault = true) => {
  getLookupTable();
  const configObj = LookupTable[configId] || {};
  const configTypeObj = configObj[lookupType] || {};
  const configValue = configTypeObj[lookupKey] || configTypeObj[lookupKey.toUpperCase()] || '';

  const defaultObj = LookupTable.DEFAULT || {};
  const defaultTypeObj = defaultObj[lookupType] || {};
  const defaultValue = defaultTypeObj[lookupKey] || '';
  const valueToReturn = configValue || (allowDefault && defaultValue ? defaultValue : null);
  return valueToReturn;
};

export default {
  getLookupTable,
  getLookupValueByType,
  upsertReference: upsert,
};
