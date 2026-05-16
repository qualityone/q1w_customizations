/**
 * q1w_base_dao.js
 * @NApiVersion 2.1
 */

import log from 'N/log';
import record from 'N/record';
import General from '../helper/q1w_general';

const NSSearch = General;

const INSTANCES = {};

class GenericDAO {
  constructor() {
    this.internalId = '';
    this.fields = {};
    this.identifierField = { id: 'internalid' };
    this.configurationField = null;
    this.searchCols = [];
    this.searchColsObj = {};
    this.fieldDefaults = {};
    this.sublistMap = {};
    this.fieldMap = [];
  }

  setIdentifier = (identFld) => {
    this.identifierField = typeof identFld === 'object' ? identFld : { id: identFld };
  };

  setConfigurationField = (configField) => {
    this.configurationField = configField;
  };

  convertSearchToJson = (searchRes) => {
    // log.debug('convertSearchToJson???', searchRes);
    // log.debug('convertSearchToJson???this.fields', this.fields);

    const fields = Object.keys(this.searchColsObj).length > 0 ? { ...this.searchColsObj } : { ...this.fields };
    const obj = {
      id: '',
    };

    obj.id = searchRes.id;
    Object.keys(fields).forEach((jsonKey) => {
      if (jsonKey !== 'id') {
        let val = '';
        let text = '';
        if (typeof fields[jsonKey] === 'object') {
          val = searchRes.getValue({
            name: fields[jsonKey].id,
          });
          text = searchRes.getText({
            name: fields[jsonKey].id,
          });
        } else {
          val = searchRes.getValue({
            name: fields[jsonKey],
          });
          text = searchRes.getText({
            name: fields[jsonKey],
          });
        }
        obj[jsonKey] = {
          value: val,
          text,
        };
      }
    });
    return obj;
  };

  initializeSearchCols = (fieldsObj = null) => {
    this.searchCols = [];
    const searchFields = fieldsObj || this.fields;
    this.searchColsObj = searchFields;
    Object.keys(searchFields).forEach((jsonKey) => {
      if (typeof searchFields[jsonKey] === 'object') {
        this.searchCols.push({
          name: searchFields[jsonKey].id,
        });
      } else {
        this.searchCols.push({
          name: searchFields[jsonKey],
        });
      }
    });
    // log.debug('this.searchCols', this.searchCols);
    return this.searchCols;
  };

  getAll = (options) => {
    // log.debug(
    //   `${this.internalId} => getAll`,
    //   JSON.stringify({
    //     options,
    //     searchCols: this.searchCols.length > 0 ? this.searchCols : this.initializeSearchCols()
    //   })
    // );
    const recs = NSSearch.runSearch(
      {
        searchType: this.internalId,
        cols: this.searchCols.length > 0 ? this.searchCols : this.initializeSearchCols(),
        filters: options.filters ? options.filters : [],
      },
      this.convertSearchToJson
    );
    // log.debug(`${this.internalId} >> getAll results`, JSON.stringify(recs));
    return recs;
  };

  getByUniqueIdentifier = (recJson) => {
    const idFldDet = this.identifierField;
    const isFldDetObj = typeof idFldDet === 'object';
    const fldInternalId = isFldDetObj ? idFldDet.id : idFldDet;
    const fldFiltOp = isFldDetObj && idFldDet.isSelect ? 'anyof' : 'is';
    const filters = [];
    const filter = [
      fldInternalId,
      fldFiltOp,
      (recJson[this.identifierField] || recJson[fldInternalId]).toString().trim(),
    ];
    filters.push(filter);
    if (this.configurationField && recJson[this.configurationField]) {
      filters.push('AND');
      filters.push([this.configurationField, 'anyof', recJson[this.configurationField]]);
    }
    log.debug('getByUniqueIdentifier >> ', filters);
    return this.getAll({
      filters,
    });
  };

  setValuesToFields = (nsRec, recJson, isFieldMap = false) => {
    let recFields = this.fields;
    if (isFieldMap) {
      recFields = {};
      Object.keys(recJson).forEach((key) => {
        recFields[key] = key;
      });
    }
    const jsonKeys = Object.keys(recJson);

    jsonKeys.forEach((jsonKey) => {
      if (jsonKey !== 'id' && recFields[jsonKey] && typeof recJson[jsonKey] !== 'undefined') {
        if (typeof recFields[jsonKey] === 'object') {
          const methodName = recFields[jsonKey].isSelect ? 'setText' : 'setValue';

          nsRec[methodName](recFields[jsonKey].id, recJson[jsonKey]);
        } else {
          nsRec.setValue(recFields[jsonKey], recJson[jsonKey]);
        }
      }
    });
    // log.debug('setValuesToFields completed', { recJson, isFieldMap });
    // log.debug('setValuesToFields completed', nsRec);
  };

  removeUnnecessaryLines = (nsRec, recJson, upsertedLines, sublistId = '') => {
    const linesArr = [...recJson];
    const identifierFldObj = linesArr[0].identifierField || {};
    log.debug('removeUnnecessaryLines : ', { upsertedLines, sublistId });
    const lineCounter = nsRec.getLineCount({ sublistId }) || 0;
    const identifierCol = identifierFldObj.nsColumn;
    log.debug('removeLines : line count ', [lineCounter, identifierCol]);

    for (let lineIdx = lineCounter - 1; lineIdx >= 0; lineIdx--) {
      const lineValue = nsRec.getSublistValue({
        sublistId,
        fieldId: identifierCol,
        line: lineIdx,
      });

      log.debug('removeLines : lineValue iteration', { lineValue, lineIdx });
      log.debug('removeLines : upsertedLines.indexOf(lineValue)', upsertedLines.indexOf(lineValue) < 0);
      if (upsertedLines.indexOf(lineValue) < 0) {
        nsRec.removeLine({
          sublistId,
          line: lineIdx,
        });
      }
    }
  };

  setValuesToRemainingLines = (nsRec, recJson, upsertedLines = [], fieldValuesObj = {}, sublistId = '') => {
    const linesArr = [...recJson];
    let upsertedLinesClone = [...upsertedLines];
    const identifierFldObj = linesArr[0].identifierField || {};
    log.debug('setValuesToRemainingLines : ', { upsertedLinesClone, sublistId });
    const lineCounter = nsRec.getLineCount({ sublistId }) || 0;
    const identifierCol = identifierFldObj.nsColumn;
    log.debug('setValuesToRemainingLines : line count ', [lineCounter, identifierCol]);

    for (let lineIdx = lineCounter - 1; lineIdx >= 0; lineIdx--) {
      const lineValue = nsRec.getSublistValue({
        sublistId,
        fieldId: identifierCol,
        line: lineIdx,
      });
      const upsertedIdIdx = upsertedLinesClone.indexOf(lineValue);
      if (upsertedLinesClone.indexOf(lineValue) < 0) {
        upsertedLinesClone = General.removeElementFromArrayByIndex(upsertedLinesClone, upsertedIdIdx);
        if (nsRec.isDynamic) {
          this.setSublistLineValuesDynamicMode(nsRec, {
            sublistId,
            line: lineIdx,
            lineObj: fieldValuesObj,
          });
        } else {
          this.setSublistLineValuesStandardMode(nsRec, {
            sublistId,
            line: lineIdx,
            lineObj: fieldValuesObj,
          });
        }
      }
    }
  };

  setValuesToSublistLine = (nsRec, recJson, sublistId = '', isFieldMap = false) => {
    let upsertedLines = [];
    if (isFieldMap) {
      // eslint-disable-next-line no-unused-vars
      upsertedLines = this.setValuesToSublistLineByFieldMap(nsRec, recJson, sublistId);
    }
    this.setValuesToSublistLineBySublistMap(nsRec, recJson);
    return upsertedLines;
  };

  setItemPricingToColumn = (nsRec, columnIdx, pricesByPriceLevel) => {
    let priceLine = 0;
    Object.keys(pricesByPriceLevel).forEach((pricelevelFromEs) => {
      const price = pricesByPriceLevel[pricelevelFromEs];
      nsRec.selectLine({
        sublistId: 'price',
        line: priceLine,
      });
      nsRec.setCurrentMatrixSublistValue({
        sublistId: 'price',
        fieldId: 'price',
        column: columnIdx,
        value: price,
      });

      nsRec.commitLine({ sublistId: 'price' });
      log.debug('setValuesToPriceLine priceLine', [priceLine, columnIdx, price]);
      priceLine += 1;
    });
  };

  setValuesToPriceLine = (nsRec, qtyPricingObj = {}) => {
    // make sure that the qty keys are sorted in ascending order.
    let currentColumn = 0;
    log.debug('setValuesToPriceLine qtyPricingObj', qtyPricingObj);
    log.debug('setValuesToPriceLine', 'here');
    Object.keys(qtyPricingObj).forEach((pricingqty) => {
      if (pricingqty.length >= 8) {
        return;
      }
      log.debug('pricingqty', pricingqty);
      if (parseInt(pricingqty, 10) > 0) {
        nsRec.setMatrixHeaderValue({
          sublistId: 'price',
          fieldId: 'price',
          column: currentColumn,
          value: pricingqty,
        });
      }
      const pricingByPriceLevel = qtyPricingObj[pricingqty];
      this.setItemPricingToColumn(nsRec, currentColumn, pricingByPriceLevel);
      currentColumn += 1;

      log.debug('setValuesToPriceLine currentColumn', currentColumn);
    });
  };

  setSublistLineValuesStandardMode = (nsRec, { sublistId, line, lineObj }) => {
    const fieldCols = Object.keys(lineObj);
    // log.debug('setSublistLineValuesStandardMode', { fieldCols });
    fieldCols.forEach((col) => {
      if (col !== 'identifierField') {
        nsRec.setSublistValue({
          sublistId,
          fieldId: col,
          line,
          value: col === 'item' || col === 'internalid' ? parseInt(lineObj[col], 10) : lineObj[col],
        });
      }
    });
  };

  setSubRecordToSublist = (nsRec, mainSublistId, subRecordId, subRecSublistId, fieldMapArr) => {
    // log.debug('setSubRecordToSublist', {
    //   mainSublistId,
    //   subRecordId,
    //   subRecSublistId,
    //   fieldMapArr
    // });
    const subRec = nsRec.getCurrentSublistSubrecord({
      sublistId: mainSublistId,
      fieldId: subRecordId,
    });

    if (subRecSublistId) {
      fieldMapArr.forEach((lineObj) => {
        this.setSublistLineValuesDynamicMode(subRec, {
          sublistId: subRecSublistId,
          line: -1,
          lineObj,
        });
      });
    }
  };

  setSublistLineValuesDynamicMode = (nsRec, { sublistId, line, lineObj }) => {
    const fieldCols = Object.keys(lineObj);

    if (line < 0) {
      nsRec.selectNewLine({
        sublistId,
      });
    } else {
      nsRec.selectLine({
        sublistId,
        line,
      });
    }
    fieldCols.forEach((col) => {
      if (col !== 'identifierField') {
        if (typeof lineObj[col] === 'object' && lineObj[col].isSubRecord === true) {
          const { sublistIdForSubrecord: subRecordSublist, subRecordId, fieldMap: subRecordFieldMap } = lineObj[col];
          log.debug('setSubRecord', lineObj[col]);
          this.setSubRecordToSublist(nsRec, sublistId, subRecordId, subRecordSublist, subRecordFieldMap);
          log.debug('setSubRecord done ', lineObj[col]);
        } else if (typeof col === 'string') {
          nsRec.setCurrentSublistValue({
            sublistId,
            fieldId: col,
            value: lineObj[col],
          });
        }
      }
    });
    nsRec.commitLine({
      sublistId,
    });
  };

  setValuesToSublistLineByFieldMap = (nsRec, recJson, sublistId) => {
    const linesArr = [...recJson];
    const linesToInsert = [];
    const upsertedLineIds = [];
    linesArr.forEach((lineObj) => {
      // const fieldCols = Object.keys(lineObj);
      const identifierFldObj = lineObj.identifierField || {};
      const identifierCol = identifierFldObj.nsColumn;
      let existingLine = -1;
      if (identifierCol) {
        existingLine = nsRec.findSublistLineWithValue({
          sublistId,
          fieldId: identifierCol,
          // value: lineObj[identifierCol]
          value:
            identifierCol === 'item' || identifierCol === 'internalid'
              ? parseInt(lineObj[identifierCol], 10)
              : lineObj[identifierCol],
        });
      }
      if (existingLine > -1) {
        if (nsRec.isDynamic) {
          // set the sublist line as dynamic
          this.setSublistLineValuesDynamicMode(nsRec, {
            sublistId,
            line: existingLine,
            lineObj,
          });
        } else {
          this.setSublistLineValuesStandardMode(nsRec, {
            sublistId,
            line: existingLine,
            lineObj,
          });
        }
        upsertedLineIds.push(lineObj[identifierCol]);
      } else {
        linesToInsert.push(lineObj);
      }
    });

    let lineCounter = nsRec.getLineCount({ sublistId }) || 0;

    linesToInsert.forEach((lineObj) => {
      const fieldCols = Object.keys(lineObj);
      const identifierFldObj = lineObj.identifierField || {};
      const identifierCol = identifierFldObj.nsColumn;
      if (nsRec.isDynamic) {
        this.setSublistLineValuesDynamicMode(nsRec, {
          sublistId,
          line: -1,
          fieldCols,
          lineObj,
        });
      } else {
        this.setSublistLineValuesStandardMode(nsRec, {
          sublistId,
          line: lineCounter,
          fieldCols,
          lineObj,
        });
      }
      lineCounter += 1;
      upsertedLineIds.push(lineObj[identifierCol]);
    });

    log.debug('setValuesToSublistLineByFieldMap >> upsertedLines', upsertedLineIds);
    return upsertedLineIds;
  };

  setValuesToSublistLineBySublistMap = (nsRec, recJson) => {
    try {
      const jsonKeys = Object.keys(recJson);
      const { sublistMap = {} } = this;
      jsonKeys.forEach((jsonKey) => {
        if (jsonKey !== 'id' && sublistMap[jsonKey]) {
          const sublistMeta = sublistMap[jsonKey] || {};
          const sublistFields = sublistMeta.fields || {};
          const sublistId = sublistMeta.id;
          const linesArr = recJson[jsonKey] || [];
          linesArr.forEach((lineObj, idx) => {
            Object.keys(lineObj).forEach((lineColKey) => {
              if (typeof sublistFields[jsonKey] === 'object') {
                const methodName = sublistFields[jsonKey].isSelect ? 'setSublistText' : 'setSublistValue';
                const valNode = sublistFields[jsonKey].isSelect ? 'text' : 'value';
                nsRec[methodName]({
                  sublistId,
                  fieldId: sublistFields[lineColKey].id,
                  line: idx,
                  [valNode]: lineObj[lineColKey],
                });
              } else {
                nsRec.setSublistValue({
                  sublistId,
                  fieldId: sublistFields[lineColKey].id,
                  line: idx,
                  value: lineObj[lineColKey],
                });
              }
            });
          });
        }
      });
    } catch (ex) {
      log.error('failed here', ex);
    }
  };

  updateExistingAddresses = (nsRec, addressJsonArr = [], isFieldMap = false, lineMatchCriteriaCb = null) => {
    let unprocessedAddrArray = [...addressJsonArr];
    const addressLineCount = nsRec.getLineCount({
      sublistId: 'addressbook',
    });

    const isAddressLineExisting =
      lineMatchCriteriaCb ||
      function ({ addr1, addr2, zip, phone }, addrJsonArr = []) {
        let existingIdx = -1;
        addrJsonArr.every((elem, idx) => {
          let nsPhoneWithoutSpaces = (phone || '').trim().toLowerCase();
          nsPhoneWithoutSpaces = nsPhoneWithoutSpaces.replace(/ /g, '');
          const extPhone = (elem.addrphone || '').trim().toLowerCase().replace(/ /g, '');
          const addr1Matches = (addr1 || '').trim().toLowerCase() === elem.addr1.trim().toLowerCase();
          const addr2Matches = (addr2 || '').trim().toLowerCase() === (elem.addr2 || '').trim().toLowerCase();
          const zipCodeMatches = (zip || '').trim().toLowerCase() === elem.zip.trim().toLowerCase();
          // eslint-disable-next-line max-len
          // const phoneMatches = (phone || '').trim().toLowerCase() === (elem.addrphone || '').trim().toLowerCase();
          const phoneMatches = nsPhoneWithoutSpaces.includes(extPhone);
          log.debug('Address line Exists ?', {
            addr1,
            addr2,
            zip,
            nsPhoneWithoutSpaces,
            extPhone,
            elem,
            addr1Matches,
            addr2Matches,
            zipCodeMatches,
            phoneMatches,
          });
          if (addr1Matches && addr2Matches && zipCodeMatches && phoneMatches) {
            existingIdx = idx;
            return false;
          }
          return true;
        });

        if (existingIdx > -1) {
          log.debug('Address Exists:', existingIdx);
        }
        return existingIdx;
      };

    for (let line = 0; line < addressLineCount; line++) {
      nsRec.selectLine({
        sublistId: 'addressbook',
        fieldId: 'addressbookaddress',
        line,
      });
      const addressSubRec = nsRec.getCurrentSublistSubrecord({
        sublistId: 'addressbook',
        fieldId: 'addressbookaddress',
      });

      const addr1 = addressSubRec.getValue({ fieldId: 'addr1' }) || '';
      const addr2 = addressSubRec.getValue({ fieldId: 'addr2' }) || '';
      const zip = addressSubRec.getValue({ fieldId: 'zip' }) || '';
      const phone = addressSubRec.getValue({ fieldId: 'addrphone' }) || '';
      // log.debug(`iterating NS address ${line}`, {
      //   addr1,
      //   addr2,
      //   zip,
      //   phone
      // });
      let processedArrIdx = null;
      do {
        processedArrIdx = isAddressLineExisting(
          {
            addr1,
            addr2,
            zip,
            phone,
          },
          unprocessedAddrArray
        );
        if (processedArrIdx > -1) {
          const addrObj = unprocessedAddrArray[processedArrIdx];
          unprocessedAddrArray = General.removeElementFromArrayByIndex(unprocessedAddrArray, processedArrIdx);
          this.setValuesToFields(addressSubRec, addrObj, isFieldMap);
        }
      } while (processedArrIdx > -1);
      nsRec.commitLine({ sublistId: 'addressbook' });
    }

    return unprocessedAddrArray;
  };

  insertNewAddresses = (nsRec, addressJsonArr = [], isFieldMap = false) => {
    addressJsonArr.forEach((elem) => {
      nsRec.selectNewLine({ sublistId: 'addressbook' });
      const addrSubRec = nsRec.getCurrentSublistSubrecord({
        sublistId: 'addressbook',
        fieldId: 'addressbookaddress',
      });
      log.debug('setting new addr', elem);
      log.debug('setting new addr', addrSubRec);
      this.setValuesToFields(addrSubRec, elem, isFieldMap);
      nsRec.commitLine({ sublistId: 'addressbook' });
    });
  };

  upsertAddressLinesToAddressBook = (nsRec, addressJsonArr = [], isFieldMap = false, lineMatchCriteriaCb = null) => {
    const unProcessedAddrArray = [...addressJsonArr];
    for (let i = 0; i < unProcessedAddrArray.length; i++) {
      let addrArr = [unProcessedAddrArray[i]];
      addrArr = this.updateExistingAddresses(nsRec, addrArr, isFieldMap, lineMatchCriteriaCb);
      this.insertNewAddresses(nsRec, addrArr, isFieldMap);
    }
  };

  upsert = (recJson) => {
    log.debug(`[${this.internalId}] upsert >> recJson`, JSON.stringify(recJson));
    let nsRec = null;
    if (recJson.id) {
      nsRec = record.load({
        type: this.internalId,
        id: recJson.id,
      });
    } else if (recJson[this.identifierField]) {
      const searchResult = this.getByUniqueIdentifier(recJson);
      if (searchResult.length > 0) {
        nsRec = record.load({
          type: this.internalId,
          id: searchResult[0].id,
        });
      }
    }

    if (!nsRec) {
      nsRec = record.create({
        type: this.internalId,
      });
    }

    this.setValuesToFields(nsRec, recJson);
    this.setValuesToSublistLine(nsRec, recJson);

    let savedId = '';
    try {
      savedId = nsRec.save();
    } catch (ex) {
      // log.debug(`Exception in [${internalId}] upsert: `, JSON.stringify(ex));
      log.error(`Exception in [${this.internalId}] upsert: `, ex);
    }

    log.debug(`[${this.internalId}] upserted id: ${savedId}`, `saved id [${savedId}]`);
    return savedId;
  };

  getNsRecordForUpsert = (recJson, isDynamic = false, defaultValues = null) => {
    const identifierFldId = this.identifierField.id || this.identifierField;

    let nsRec = null;
    if (recJson.id) {
      nsRec = record.load({
        type: this.internalId,
        id: recJson.id,
        isDynamic,
      });
    } else if (recJson[identifierFldId]) {
      const searchResult = this.getByUniqueIdentifier(recJson);
      if (searchResult.length > 0) {
        nsRec = record.load({
          type: this.internalId,
          id: searchResult[0].id,
          isDynamic,
        });
      }
    }

    if (!nsRec) {
      nsRec = record.create({
        type: this.internalId,
        isDynamic,
        defaultValues: defaultValues || null,
      });
    }

    log.debug('getNsRecordForUpsert', {
      existingId: nsRec.id || null,
      recJson: recJson || {},
      identifierField: this.identifierField,
    });

    return nsRec;
  };

  transformRecord = (fromRecId, fromRecordType, isDynamic = false) => {
    const transformedRec = record.transform({
      fromType: fromRecordType,
      fromId: fromRecId,
      toType: this.internalId,
      isDynamic,
    });
    return transformedRec;
  };

  getModel = () => {
    const obj = {};
    Object.keys(this.fields).forEach((jsonKey) => {
      obj[jsonKey] = '';
    });
    return obj;
  };

  getRecordFieldsAsJson = (nsRec) => {
    const { fields = {} } = this;

    const obj = {
      id: '',
    };
    obj.id = nsRec.id;
    Object.keys(fields).forEach((jsonKey) => {
      if (jsonKey !== 'id') {
        let val = '';
        let text = '';
        let objGroupInJson = null;
        if (typeof fields[jsonKey] === 'object') {
          val = nsRec.getValue({
            fieldId: fields[jsonKey].id,
          });
          text = nsRec.getText({
            fieldId: fields[jsonKey].id,
          });
          if (fields[jsonKey].group) {
            objGroupInJson = fields[jsonKey].group;
          }
        } else {
          val = nsRec.getValue({
            fieldId: fields[jsonKey],
          });
          text = nsRec.getText({
            fieldId: fields[jsonKey],
          });
        }
        if (objGroupInJson) {
          if (!obj[objGroupInJson]) {
            obj[objGroupInJson] = {};
          }

          obj[objGroupInJson][jsonKey] = {
            value: val,
            text,
          };
        } else {
          obj[jsonKey] = {
            value: val,
            text,
          };
        }
      }
    });

    return obj;
  };

  getSublistAsJson = (nsRec, sublistMeta) => {
    if (typeof sublistMeta !== 'object') {
      return null;
    }

    if (!sublistMeta.name || !sublistMeta.id) {
      throw Error(`DAO [${this.internalId}] Sublist is missing name or id`);
    }

    const sublistId = sublistMeta.id;
    const sublistFieldsMeta = sublistMeta.fields || {};
    const linesArr = [];
    const linesCount = nsRec.getLineCount({ sublistId });

    for (let l = 0; l < linesCount; l++) {
      const obj = {};
      Object.keys(sublistFieldsMeta).forEach((jsonKey) => {
        if (jsonKey !== 'id') {
          let val = '';
          let text = '';
          if (typeof sublistFieldsMeta[jsonKey] === 'object') {
            val = nsRec.getSublistValue({
              sublistId,
              fieldId: sublistFieldsMeta[jsonKey].id,
              line: l,
            });
            text = nsRec.getSublistText({
              sublistId,
              fieldId: sublistFieldsMeta[jsonKey].id,
              line: l,
            });
          } else {
            val = nsRec.getSublistValue({
              sublistId,
              fieldId: sublistFieldsMeta[jsonKey],
              line: l,
            });
            text = nsRec.getSublistText({
              sublistId,
              fieldId: sublistFieldsMeta[jsonKey],
              line: l,
            });
          }
          obj[jsonKey] = {
            value: val,
            text,
          };
        }
      });
      linesArr.push(obj);
    }

    return linesArr;
  };

  getSublistsAsJson = (nsRec) => {
    const { sublistMap = {} } = this;
    const sublistObj = {};
    Object.keys(sublistMap).forEach((sublistId) => {
      sublistObj[sublistId] = this.getSublistAsJson(nsRec, sublistMap[sublistId]);
    });
    return sublistObj;
  };

  loadRecordAsJson = (recId) => {
    try {
      const nsRec = record.load({
        id: recId,
        type: this.internalId,
      });
      const jsonObj = {
        ...this.getRecordFieldsAsJson(nsRec),
        ...this.getSublistsAsJson(nsRec),
      };
      return jsonObj;
    } catch (ex) {
      log.error(`Exception in [${this.internalId}] loadRecordAsJson`, ex);
      return null;
    }
  };

  deleteRecord = (recId) => {
    try {
      record.delete({
        type: this.internalId,
        id: recId,
      });

      log.debug(`[${this.internalId}] >> deleteRecord`, `[${recId}] successfully deleted !!`);
    } catch (ex) {
      log.error(`[${this.internalId}] >> deleteRecord`, ex);
    }
  };

  submitFields = (recId, recJson = {}) => {
    try {
      const fieldsObjNs = {};
      const recFields = this.fields;
      const jsonKeys = Object.keys(recJson);

      jsonKeys.forEach((jsonKey) => {
        if (jsonKey !== 'id' && recFields[jsonKey] && typeof recJson[jsonKey] !== 'undefined') {
          if (typeof recFields[jsonKey] === 'object') {
            fieldsObjNs[recFields[jsonKey].id] = recJson[jsonKey];
          } else {
            fieldsObjNs[recFields[jsonKey]] = recJson[jsonKey];
          }
        }
      });

      log.debug(`${this.internalId} submitFields`, fieldsObjNs);

      record.submitFields({
        type: this.internalId,
        id: recId || recJson.id,
        values: fieldsObjNs,
      });

      log.debug(`${this.internalId} submitFields success !!`, '');
    } catch (ex) {
      log.debug(`Exception at ${this.internalId} submitFields`, ex);
    }
  };

  getLineCount = (nsRec, sublistId) => {
    return nsRec.getLineCount({
      sublistId,
    });
  };

  setSublistLineByJson = (nsRec, sublistId, line = 0, jsonObj = {}) => {
    Object.keys(jsonObj).forEach((colId) => {
      nsRec.setSublistValue({
        sublistId,
        fieldId: colId,
        line,
        value: jsonObj[colId],
      });
    });
  };

  setAddressOnRecord = (nsRec, payload, addressType) => {
    const payloadFields = ['country', 'attention', 'addressee', 'addrphone', 'addr1', 'addr2', 'city', 'state', 'zip'];
    let addrSubRecord = null;
    try {
      addrSubRecord = nsRec.getSubrecord({
        fieldId: addressType === 'bill' ? 'billingaddress' : 'shippingaddress',
      });
    } catch (error) {
      log.error('setAddressOnRecord => addressSubrecord not found', error);
    }
    if (addrSubRecord) {
      payloadFields.forEach((fldId) => {
        const nsFieldId = fldId;
        const payLoadId = `${addressType}${fldId}`;
        if (payload[payLoadId]) {
          // log.debug('setting addr', { nsFieldId, val: payload[payLoadId] });
          addrSubRecord.setValue({
            fieldId: nsFieldId,
            value: payload[payLoadId],
          });
        }
      });
    }
  };

  setAddressesToRecord = (nsRec, payload = {}) => {
    this.setAddressOnRecord(nsRec, payload, 'bill');
    this.setAddressOnRecord(nsRec, payload, 'ship');
  };
}

const initialize = ({ fields, internalId, defaults, sublists }) => {
  if (!INSTANCES[internalId]) {
    const genericDaoInstance = new GenericDAO();
    genericDaoInstance.internalId = internalId;
    genericDaoInstance.fieldDefaults = defaults;
    genericDaoInstance.sublistMap = sublists;
    genericDaoInstance.fields = {
      ...fields,
      ...{
        id: 'internalid',
      },
    };

    INSTANCES[internalId] = genericDaoInstance;
  }

  return INSTANCES[internalId];
};

export default {
  GenericDAO,
  initialize,
};
