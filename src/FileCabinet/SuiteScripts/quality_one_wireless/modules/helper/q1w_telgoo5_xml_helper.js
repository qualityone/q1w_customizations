/**
 * q1w_telgoo5_xml_helper.js
 * @NApiVersion 2.1
 * @module q1w_telgoo5_xml_helper
 * @description Parse BPXML to JSON and build Telgoo5 XML response envelopes
 */

import xml from 'N/xml';
import moment from '../third_party/moment';
import CONSTANTS from '../../constants/q1w_global_constants';
import ValidationErrors from '../../api/lib/q1w_validation_error';

const { TELGOO5 } = CONSTANTS;
const { ValidationError } = ValidationErrors;

const coerceXmlText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object') {
    if (value['#text'] !== undefined && value['#text'] !== null) {
      return String(value['#text']);
    }

    const keys = Object.keys(value);
    if (keys.length === 0 || (keys.length === 1 && keys[0] === '#text')) {
      return '';
    }

    try {
      return JSON.stringify(value);
    } catch (jsonError) {
      return '';
    }
  }
  return String(value);
};

const normalizeRestletContext = (context) => (typeof context === 'string' ? { requestBody: context } : context || {});

const xmlToJson = (xmlNode) => {
  const obj = Object.create(null);

  if (xmlNode.nodeType === xml.NodeType.ELEMENT_NODE) {
    if (xmlNode.hasAttributes()) {
      obj['@attributes'] = Object.create(null);
      const attrCount = xmlNode.attributes.length;
      for (let j = 0; j < attrCount; j += 1) {
        const attr = xmlNode.attributes[j];
        obj['@attributes'][attr.name] = attr.value;
      }
    }
  } else if (xmlNode.nodeType === xml.NodeType.TEXT_NODE) {
    return xmlNode.nodeValue;
  }

  if (xmlNode.hasChildNodes()) {
    for (let i = 0; i < xmlNode.childNodes.length; i += 1) {
      const childItem = xmlNode.childNodes[i];
      const { nodeName } = childItem;
      const childJson = xmlToJson(childItem);

      if (nodeName in obj) {
        if (!Array.isArray(obj[nodeName])) {
          obj[nodeName] = [obj[nodeName]];
        }
        obj[nodeName].push(childJson);
      } else {
        obj[nodeName] = childJson;
      }
    }
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return '';
  }
  if (keys.length === 1 && keys[0] === '#text') {
    return obj['#text'];
  }

  return obj;
};

const parseXmlToJson = (xmlString) => {
  const xmlObj = xml.Parser.fromString({ text: xmlString });
  return xmlToJson(xmlObj.documentElement);
};

const resolveRawXml = (context) => {
  if (typeof context === 'string') {
    return context;
  }
  if (!context || typeof context !== 'object') {
    return '';
  }
  return context.requestBody || context.body || context.xml || context.data || '';
};

const stripRoutingAction = (envelopeJson) => {
  const messageJson = { ...envelopeJson };
  delete messageJson[TELGOO5.ROUTING_ELEMENT];
  return messageJson;
};

const resolveRouteAction = (envelopeJson, context) => {
  let queryAction = '';
  if (context && typeof context === 'object' && context.action) {
    queryAction = coerceXmlText(context.action).trim().toLowerCase();
  }
  const bodyAction = coerceXmlText(envelopeJson[TELGOO5.ROUTING_ELEMENT]).trim().toLowerCase();
  return queryAction || bodyAction;
};

const parseInboundEnvelope = (rawXml, context) => {
  const trimmed = String(rawXml || '').trim();
  if (!trimmed) {
    throw new ValidationError('Request body is empty');
  }

  let envelopeJson;
  try {
    envelopeJson = parseXmlToJson(trimmed);
  } catch (parseError) {
    throw new ValidationError('Invalid XML payload');
  }

  const routeAction = resolveRouteAction(envelopeJson, context);
  if (!routeAction) {
    throw new ValidationError('Missing action element or query parameter');
  }

  if (!TELGOO5.XML_ACTIONS.includes(routeAction)) {
    throw new ValidationError(`Unknown action: ${routeAction}`);
  }

  return {
    routeAction,
    messageJson: stripRoutingAction(envelopeJson),
    rawXml: trimmed,
  };
};

const normalizeLineItems = (detail) => {
  if (!detail || typeof detail !== 'object') {
    return detail;
  }
  const lineItems = detail['line-item'];
  if (lineItems && !Array.isArray(lineItems)) {
    detail['line-item'] = [lineItems];
  }
  return detail;
};

const formatTimestamp = () => moment().format('YYYYMMDDHHmmss');

const escapeXml = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return coerceXmlText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const buildSuccessResponse = ({
  messageId,
  partnerName,
  sourceUrl,
  transactionName,
  eventId,
  statusDescription = TELGOO5.SUCCESS_DESCRIPTION,
  comments = TELGOO5.SUCCESS_DESCRIPTION,
}) => {
  const timestamp = formatTimestamp();
  return `<?xml version="1.0" encoding="UTF-8"?>
<message>
  <message-header>
    <message-id>${escapeXml(messageId)}</message-id>
    <transaction-name>${escapeXml(transactionName)}</transaction-name>
    <partner-name>${escapeXml(partnerName)}</partner-name>
    <source-url>${escapeXml(sourceUrl)}</source-url>
    <create-timestamp>${escapeXml(timestamp)}</create-timestamp>
    <response-request>0</response-request>
  </message-header>
  <message-status>
    <status-code>0</status-code>
    <status-description>${escapeXml(statusDescription)}</status-description>
    <comments>${escapeXml(comments)}</comments>
    <response-timestamp>${escapeXml(timestamp)}</response-timestamp>
    <filename>${escapeXml(TELGOO5.FILENAME)}</filename>
  </message-status>
  <transactionInfo>
    <eventID>${escapeXml(eventId)}</eventID>
  </transactionInfo>
</message>`;
};

const buildErrorResponse = ({
  requestId,
  name,
  description,
}) => `<?xml version="1.0" encoding="UTF-8" standalone="yes" ?>
<message>
  <requestId>${escapeXml(requestId)}</requestId>
  <error>
    <name>${escapeXml(name)}</name>
    <description>${escapeXml(description)}</description>
  </error>
</message>`;

const generateRequestId = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;

export default {
  xmlToJson,
  parseXmlToJson,
  coerceXmlText,
  normalizeRestletContext,
  resolveRawXml,
  parseInboundEnvelope,
  stripRoutingAction,
  normalizeLineItems,
  formatTimestamp,
  buildSuccessResponse,
  buildErrorResponse,
  generateRequestId,
  escapeXml,
};
