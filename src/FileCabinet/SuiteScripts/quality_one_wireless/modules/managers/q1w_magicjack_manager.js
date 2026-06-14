/**
 * @NApiVersion 2.1
 * @module q1w_magicjack_manager
 * @author Q1W
 * @description Producer/consumer callbacks for MagicJack route-driven integration
 */

import log from 'N/log';
import query from 'N/query';
import Papa from '../third_party/papaparse';
import Integration from './q1w_integration';
import Validator from './q1w_magicjack_validator';
import Transformer from './q1w_magicjack_transformer';
import CustomerDao from '../dao/q1w_customer_dao';
import SalesOrderDao from '../dao/q1w_salesorder_dao';
import SftpHelper from '../helper/q1w_sftp_helper';
import CONSTANTS from '../../constants/q1w_global_constants';

const MODULE = 'q1w_magicjack_manager';
const { MAGICJACK } = CONSTANTS;

const buildAckFileName = (sourceFileName = '') => {
  const indexOfLastDot = sourceFileName.lastIndexOf('.');
  if (indexOfLastDot <= 0) {
    return `${sourceFileName}_ACK`;
  }
  const baseName = sourceFileName.substring(0, indexOfLastDot);
  const extension = sourceFileName.substring(indexOfLastDot);
  return `${baseName}_ACK${extension}`;
};

const formatDateYYYYMMDD = (inputDate) => {
  const dateObj = inputDate ? new Date(inputDate) : new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const formatTimestampForFile = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
};

const getParsedRows = (fileContents = '') => {
  const parseResult = Papa.parse(fileContents, {
    delimiter: MAGICJACK.CSV_DELIMITER,
    skipEmptyLines: true,
  });
  const rows = parseResult.data || [];
  return rows
    .filter((row) => Array.isArray(row) && row.length > 0)
    .map((row) => row.map((value) => String(value || '').trim()));
};

const buildOrderFilePayload = (sourceFileName, csvRows = []) => {
  const rows = csvRows.map((csvRow) => ({
    csvRawData: csvRow,
    orderId: String(csvRow[MAGICJACK.CSV_COLUMNS.ORDER_ID] || '').trim(),
  }));
  const firstRow = rows[0] || { csvRawData: [] };
  return {
    recordId: sourceFileName,
    sourceFileName,
    order_init_date: String(firstRow.csvRawData[MAGICJACK.CSV_COLUMNS.ORDER_INIT_DATE] || '').trim(),
    TransactionType: MAGICJACK.RECORD_TYPES.INBOUND_ORDER_FILE,
    rows,
  };
};

const produceOrderFiles = (currentConfig = {}) => {
  const logTitle = `${MODULE} => produceOrderFiles`;
  try {
    const configJson = currentConfig.configJson || {};
    const connection = SftpHelper.createConnection(configJson);
    const fileEntries = SftpHelper.listFiles(connection, configJson.orderFileDirectory);
    const filePayloads = [];

    fileEntries.forEach((fileEntry) => {
      const fileName = fileEntry.name;
      const downloadedFile = SftpHelper.downloadFile(connection, fileName, configJson.orderFileDirectory);
      const csvRows = getParsedRows(downloadedFile.getContents() || '');
      if (csvRows.length === 0) {
        return;
      }
      Integration.ensureOrderMappingStubs(csvRows);
      filePayloads.push(buildOrderFilePayload(fileName, csvRows));
    });

    return {
      data: filePayloads,
      isRescheduleNeeded: false,
      getMoreRecords: false,
    };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const moveOrderFileToProcessed = (currentConfig = {}, sourceFileName = '') => {
  const logTitle = `${MODULE} => moveOrderFileToProcessed`;
  try {
    if (!sourceFileName) {
      return;
    }
    const configJson = currentConfig.configJson || {};
    const { orderFileDirectory } = configJson;
    const processedSubdir = configJson.processedSubdir || 'processed';
    const connection = SftpHelper.createConnection(configJson);
    const fromPath = SftpHelper.normalizePath(orderFileDirectory, sourceFileName);
    const toPath = SftpHelper.normalizePath(orderFileDirectory, processedSubdir, sourceFileName);
    SftpHelper.moveFile(connection, fromPath, toPath);
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, sourceFileName }),
    });
  }
};

const processSingleOrderRow = ({ rowPayload, storeDefaults }) => {
  const validatedResult = Validator.validateRow(rowPayload.csvRawData || []);
  if (!validatedResult.isValid) {
    throw new Error(`Row validation failed for order ${rowPayload.orderId}: ${validatedResult.errors.join('; ')}`);
  }

  const { validatedData } = validatedResult;
  const orderNumber = Transformer.makeOrderNumber(validatedData.order_id);

  const customerPayload = Transformer.transformToCustomer({ validatedData, storeDefaults });
  CustomerDao.setIdentifier('email');
  const customerResp = CustomerDao.upsertCustomer({
    body: customerPayload.body,
    addresses: customerPayload.addresses,
  });
  if (!customerResp.status || !customerResp.customerId) {
    throw new Error(`Customer upsert failed for order ${rowPayload.orderId}: ${customerResp.message}`);
  }

  const itemInternalId = Integration.resolveItemBySku(validatedData.ext_prod_code);

  const shipMethodInternalId = Integration.resolveShipMethod(validatedData.ship_method);

  SalesOrderDao.setIdentifier('externalid');
  const salesOrderPayload = Transformer.transformToSalesOrder({
    validatedData,
    storeDefaults,
    customerId: customerResp.customerId,
    itemId: itemInternalId,
    shipMethodId: shipMethodInternalId,
    orderNumber,
  });
  const salesOrderResp = SalesOrderDao.createSalesOrder(salesOrderPayload);
  if (!salesOrderResp.status || !salesOrderResp.upsertId) {
    throw new Error(`Sales order upsert failed for order ${rowPayload.orderId}: ${salesOrderResp.message}`);
  }

  Integration.upsertReference({
    recordId: rowPayload.orderId,
    recordReference: salesOrderResp.upsertId,
  });
};

const uploadAckForFile = ({ currentConfig, sourceFileName, rows }) => {
  const ackRows = rows.map((rowPayload) => Transformer.buildAckRow(rowPayload.csvRawData || []));
  const ackContent = ackRows.map((ackRow) => ackRow.join(MAGICJACK.CSV_DELIMITER)).join('\n');
  const ackFileName = buildAckFileName(sourceFileName);
  const ackFile = SftpHelper.createCsvFile(ackFileName, ackContent);
  const connection = SftpHelper.createConnection(currentConfig.configJson || {});
  SftpHelper.uploadFile(connection, ackFile, ackFileName, (currentConfig.configJson || {}).ackFileDirectory);
};

const processFile = (parsedEntry, currentConfig) => {
  const logTitle = `${MODULE} => processFile`;
  try {
    const queueData = parsedEntry.data || {};
    const sourceFileName = queueData.sourceFileName || parsedEntry.recordId;
    const rows = queueData.rows || [];

    if (!sourceFileName || !Array.isArray(rows) || rows.length === 0) {
      return {
        status: false,
        isReScheduleNeeded: false,
        isRescheduleNeeded: false,
        getMoreRecords: false,
        message: 'Invalid file payload: missing sourceFileName or rows',
        errorDetail: JSON.stringify({ sourceFileName, rowsLength: rows.length }),
      };
    }

    const storeDefaults = Integration.getStoreDefaults();
    Integration.validateOrderMappings(rows.map((row) => row.csvRawData || []));

    const rowErrors = [];
    for (let i = 0; i < rows.length; i++) {
      const rowPayload = rows[i];
      try {
        processSingleOrderRow({ rowPayload, storeDefaults });
      } catch (rowError) {
        rowErrors.push({
          index: i,
          orderId: rowPayload.orderId || '',
          error: rowError.message,
        });
      }
    }

    if (rowErrors.length > 0) {
      return {
        status: false,
        isReScheduleNeeded: false,
        isRescheduleNeeded: false,
        getMoreRecords: false,
        message: `File processing failed for ${sourceFileName}. ${rowErrors.length} row(s) failed.`,
        errorDetail: JSON.stringify({
          sourceFileName,
          failedCount: rowErrors.length,
          rowErrors,
        }),
      };
    }

    uploadAckForFile({
      currentConfig,
      sourceFileName,
      rows,
    });

    log.audit({
      title: logTitle,
      details: JSON.stringify({
        sourceFileName,
        processedRows: rows.length,
      }),
    });

    return {
      status: true,
      upsertId: sourceFileName,
      isReScheduleNeeded: false,
      isRescheduleNeeded: false,
      getMoreRecords: false,
    };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    return {
      status: false,
      isReScheduleNeeded: false,
      isRescheduleNeeded: false,
      getMoreRecords: false,
      message: error.message,
      errorDetail: error.stack,
    };
  }
};

const getCandidateFulfillments = () => {
  const sql = `
    SELECT
      ift.id AS fulfillment_id,
      ift.trandate AS shipped_date,
      so.otherrefnum AS external_order_id,
      cust.firstname AS first_name,
      cust.lastname AS last_name,
      so.shipaddress1 AS addr1,
      so.shipaddress2 AS addr2,
      so.shipcity AS city,
      so.shipstate AS state,
      so.shipzip AS zip,
      so.shipcountry AS country,
      item.itemid AS sku,
      ift.shipmethod AS ship_method,
      ift.trackingnumbers AS tracking_number
    FROM transaction ift
    INNER JOIN transactionline iftl ON iftl.transaction = ift.id AND iftl.mainline = 'T'
    LEFT JOIN transaction so ON so.id = ift.createdfrom
    LEFT JOIN customer cust ON cust.id = so.entity
    LEFT JOIN transactionline soline ON soline.transaction = so.id AND soline.mainline = 'F'
    LEFT JOIN item ON item.id = soline.item
    WHERE ift.recordtype = 'itemfulfillment'
      AND ift.shipstatus = 'C'
      AND ift.mainline = 'T'
      AND so.id IS NOT NULL
  `;
  return query
    .runSuiteQL({
      query: sql,
    })
    .asMappedResults();
};

const produceShipmentPayloads = () => {
  const logTitle = `${MODULE} => produceShipmentPayloads`;
  try {
    const fulfillments = getCandidateFulfillments() || [];
    const shipmentRows = [];

    for (let i = 0; i < fulfillments.length; i++) {
      const fulfillment = fulfillments[i];
      const fulfillmentId = String(fulfillment.fulfillment_id || '');
      if (!fulfillmentId) {
        continue;
      }
      const existingReference = Integration.getRecordReference({
        nsRecordId: fulfillmentId,
        flow: 'EXPORT',
      });
      if (existingReference) {
        continue;
      }

      shipmentRows.push({
        fulfillmentId,
        csvRawData: Transformer.buildShipmentRow({
          externalOrderId: fulfillment.external_order_id || '',
          firstName: fulfillment.first_name || '',
          lastName: fulfillment.last_name || '',
          addr1: fulfillment.addr1 || '',
          addr2: fulfillment.addr2 || '',
          city: fulfillment.city || '',
          state: fulfillment.state || '',
          zip: fulfillment.zip || '',
          country: fulfillment.country || '',
          sku: fulfillment.sku || '',
          shipMethod: fulfillment.ship_method || '',
          shippedDate: formatDateYYYYMMDD(fulfillment.shipped_date),
          trackingNumber: fulfillment.tracking_number || '',
        }),
      });
    }

    if (shipmentRows.length === 0) {
      return {
        data: [],
        isRescheduleNeeded: false,
        getMoreRecords: false,
      };
    }

    const timestamp = formatTimestampForFile(new Date());
    return {
      data: [
        {
          recordId: `SHIPMENT_BATCH_${timestamp}`,
          shippedDate: formatDateYYYYMMDD(new Date()),
          TransactionType: MAGICJACK.RECORD_TYPES.SHIPMENT,
          rows: shipmentRows,
        },
      ],
      isRescheduleNeeded: false,
      getMoreRecords: false,
    };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const consumeShipmentPayload = (parsedEntry, currentConfig) => {
  const logTitle = `${MODULE} => consumeShipmentPayload`;
  try {
    const queueData = parsedEntry.data || {};
    const rows = queueData.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        status: false,
        isReScheduleNeeded: false,
        isRescheduleNeeded: false,
        getMoreRecords: false,
        message: 'Invalid shipment payload rows',
      };
    }

    const reportFileName = `${MAGICJACK.SHIPMENT_FILE_PREFIX}${formatTimestampForFile(new Date())}.csv`;
    const reportContent = rows.map((row) => (row.csvRawData || []).join(MAGICJACK.CSV_DELIMITER)).join('\n');
    const reportFile = SftpHelper.createCsvFile(reportFileName, reportContent);

    const connection = SftpHelper.createConnection((currentConfig || {}).configJson || {});
    SftpHelper.uploadFile(
      connection,
      reportFile,
      reportFileName,
      ((currentConfig || {}).configJson || {}).shipFileDirectory
    );

    rows.forEach((row) => {
      Integration.upsertReference({
        recordId: row.fulfillmentId,
        recordReference: reportFileName,
      });
    });

    return {
      status: true,
      upsertId: reportFileName,
      isReScheduleNeeded: false,
      isRescheduleNeeded: false,
      getMoreRecords: false,
    };
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    return {
      status: false,
      isReScheduleNeeded: false,
      isRescheduleNeeded: false,
      getMoreRecords: false,
      message: error.message,
      errorDetail: error.stack,
    };
  }
};

export default {
  produceOrderFiles,
  moveOrderFileToProcessed,
  processFile,
  produceShipmentPayloads,
  consumeShipmentPayload,
};
