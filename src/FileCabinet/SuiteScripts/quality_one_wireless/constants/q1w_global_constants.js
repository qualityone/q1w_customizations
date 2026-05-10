'use strict';

/**
 * Global Constants
 * Centralized storage for all hardcoded values used across the project
 * Supports environment-specific configurations (PRODUCTION, SANDBOX)
 *
 * @module q1w_global_constants
 * @author Taha Aslam
 * @version 1.0.0
 */

/**
 * Environment-Specific Constants
 * URLs, IDs, and values that differ between environments
 */
const ENVIRONMENT_SPECIFIC_CONSTANTS = {
  PRODUCTION: {
    URLS: {
      // Add production URLs here
      // SUITELET_URL: 'https://ACCOUNT_ID.app.netsuite.com/...',
    },
    IMAGES: {
      // Add production image URLs here
      // LOADING_IMAGE: 'https://ACCOUNT_ID.app.netsuite.com/...',
    },
    // Anything else
  },
  SB2: {
    URLS: {},
    IMAGES: {},
    // Anything else
  },
  SB1: {
    URLS: {},
    IMAGES: {},
    // Anything else
  },
};

/**
 * NetSuite Record Types
 */
const RECORD_TYPES = {
  // Transactions
  SALES_ORDER: 'salesorder',
  INVOICE: 'invoice',
  CASH_SALE: 'cashsale',
  CREDIT_MEMO: 'creditmemo',
  CUSTOMER_PAYMENT: 'customerpayment',
  CUSTOMER_REFUND: 'customerrefund',
  CUSTOMER_DEPOSIT: 'customerdeposit',
  ESTIMATE: 'estimate',
  OPPORTUNITY: 'opportunity',
  PURCHASE_ORDER: 'purchaseorder',
  VENDOR_BILL: 'vendorbill',
  VENDOR_PAYMENT: 'vendorpayment',
  VENDOR_CREDIT: 'vendorcredit',
  ITEM_FULFILLMENT: 'itemfulfillment',
  ITEM_RECEIPT: 'itemreceipt',
  RETURN_AUTHORIZATION: 'returnauthorization',
  TRANSFER_ORDER: 'transferorder',
  BIN_TRANSFER: 'bintransfer',
  INVENTORY_ADJUSTMENT: 'inventoryadjustment',

  // Entities
  CUSTOMER: 'customer',
  VENDOR: 'vendor',
  EMPLOYEE: 'employee',
  CONTACT: 'contact',

  // Items
  INVENTORY_ITEM: 'inventoryitem',
  NON_INVENTORY_ITEM: 'noninventoryitem',
  SERVICE_ITEM: 'serviceitem',
  KIT_ITEM: 'kititem',
  ASSEMBLY_ITEM: 'assemblyitem',
  DISCOUNT_ITEM: 'discountitem',

  // Other
  TRANSACTION: 'transaction',
  BIN: 'bin',
};

/**
 * Standard Body Field IDs
 */
const BODY_FIELDS = {
  // Entity
  ENTITY: 'entity',
  CUSTOMER: 'entity',
  VENDOR: 'entity',

  // Transaction
  TRAN_ID: 'tranid',
  TRAN_DATE: 'trandate',
  STATUS: 'status',
  MEMO: 'memo',
  PO_NUMBER: 'otherrefnum',
  CREATED_FROM: 'createdfrom',

  // Location/Classification
  SUBSIDIARY: 'subsidiary',
  LOCATION: 'location',
  INVENTORY_LOCATION: 'inventorylocation',
  INVENTORY_SUBSIDIARY: 'inventorysubsidiary',
  DEPARTMENT: 'department',
  CLASS: 'class',

  // Amounts
  TOTAL: 'total',
  SUBTOTAL: 'subtotal',
  TAX_TOTAL: 'taxtotal',
  DISCOUNT_TOTAL: 'discounttotal',
  SHIPPING_COST: 'shippingcost',
  AMOUNT_REMAINING: 'amountremaining',
  AMOUNT_PAID: 'amountpaid',

  // Shipping
  SHIP_DATE: 'shipdate',
  SHIP_METHOD: 'shipmethod',
  SHIP_ADDRESS: 'shipaddress',
  SHIP_STATUS: 'shipstatus',
  SHIP_CARRIER: 'shipcarrier',
  EXPECTED_SHIP_DATE: 'expectedshipdate',

  // Currency
  CURRENCY: 'currency',
  EXCHANGE_RATE: 'exchangerate',

  // Customer/Entity
  SALES_REP: 'salesrep',
  TERMS: 'terms',
  APPROVAL_STATUS: 'approvalstatus',
  ORDER_STATUS: 'orderstatus',
  EMAIL: 'email',
  CUSTOM_FORM: 'customform',
  CONTACT_ROLE: 'contactrole',
  BALANCE: 'balance',
  DEPOSIT_BALANCE: 'depositbalance',
  CREDIT_LIMIT: 'creditlimit',
  CREDIT_HOLD_OVERRIDE: 'creditholdoverride',
  UNBILLED_ORDERS: 'unbilledorders',
  TAX_EXEMPT: 'taxexempt',
  WEBSTORE: 'webstore',
  WEBSITE: 'website',
  ROLE: 'role',
  EMPLOYEE: 'employee',
};

/**
 * Standard Line Field IDs
 */
const LINE_FIELDS = {
  ITEM: 'item',
  QUANTITY: 'quantity',
  QUANTITY_COMMITTED: 'quantitycommitted',
  QUANTITY_FULFILLED: 'quantityfulfilled',
  QUANTITY_REMAINING: 'quantityremaining',
  RATE: 'rate',
  AMOUNT: 'amount',
  TAX_CODE: 'taxcode',
  TAX_RATE: 'taxrate1',
  DESCRIPTION: 'description',
  UNITS: 'units',
  LOCATION: 'location',
  DEPARTMENT: 'department',
  CLASS: 'class',
  LINE: 'line',
  LINE_UNIQUE_KEY: 'lineuniquekey',
  PRICE: 'price',
  COST_ESTIMATE: 'costestimate',
  COST_ESTIMATE_RATE: 'costestimaterate',
  COMMIT: 'commitinventory',
  ITEM_RECEIVE: 'itemreceive',
  ORDER_LINE: 'orderline',
};

/**
 * Sublist IDs
 */
const SUBLIST_IDS = {
  ITEM: 'item',
  EXPENSE: 'expense',
  ADDRESS: 'addressbook',
  CONTACTS: 'contact',
  APPLY: 'apply',
  CREDIT: 'credit',
  PARTNERS: 'partners',
  SALES_TEAM: 'salesteam',
  LINKS: 'links',
  PACKAGE: 'package',
  INVENTORY_ASSIGNMENT: 'inventoryassignment',
};

/**
 * Transaction Status Values
 */
const TRANSACTION_STATUS = {
  SALES_ORDER: {
    PENDING_APPROVAL: 'A',
    PENDING_FULFILLMENT: 'B',
    CANCELLED: 'C',
    PARTIALLY_FULFILLED: 'D',
    PENDING_BILLING_PARTIALLY_FULFILLED: 'E',
    PENDING_BILLING: 'F',
    BILLED: 'G',
    CLOSED: 'H',
  },
  INVOICE: {
    OPEN: 'A',
    PAID_IN_FULL: 'B',
  },
  PURCHASE_ORDER: {
    PENDING_SUPERVISOR_APPROVAL: 'A',
    PENDING_RECEIPT: 'B',
    REJECTED_BY_SUPERVISOR: 'C',
    PARTIALLY_RECEIVED: 'D',
    PENDING_BILLING_PARTIALLY_RECEIVED: 'E',
    PENDING_BILL: 'F',
    FULLY_BILLED: 'G',
    CLOSED: 'H',
  },
  ESTIMATE: {
    OPEN: 'A',
    PROCESSED: 'B',
    CLOSED: 'C',
    VOIDED: 'V',
    EXPIRED: 'X',
  },
  SHIP_STATUS: {
    PICKED: 'A',
    PACKED: 'B',
    SHIPPED: 'C',
  },
};

/**
 * Order Status Values (for search filters)
 */
const ORDER_STATUS_VALUES = {
  SALES_ORDER: {
    PENDING_APPROVAL: 'SalesOrd:A',
    PENDING_FULFILLMENT: 'SalesOrd:B',
    CANCELLED: 'SalesOrd:C',
    PARTIALLY_FULFILLED: 'SalesOrd:D',
    PARTIALLY_FULFILLED_PEND_BILL: 'SalesOrd:E',
    PENDING_BILLING: 'SalesOrd:F',
    BILLED: 'SalesOrd:G',
    CLOSED: 'SalesOrd:H',
  },
  ESTIMATE: {
    OPEN: 'Estimate:A',
    PROCESSED: 'Estimate:B',
    CLOSED: 'Estimate:C',
    VOIDED: 'Estimate:V',
    EXPIRED: 'Estimate:X',
  },
};

/**
 * Approval Status Values
 */
const APPROVAL_STATUS = {
  PENDING_APPROVAL: '1',
  APPROVED: '2',
  REJECTED: '3',
};

/**
 * User Event Types
 */
const USER_EVENT_TYPES = {
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  XEDIT: 'xedit',
  VIEW: 'view',
  COPY: 'copy',
  PRINT: 'print',
  EMAIL: 'email',
  QUICKVIEW: 'quickview',
  APPROVE: 'approve',
};

/**
 * Global Constants
 */
const GLOBAL = {
  // Boolean values
  TRUE: 'T',
  FALSE: 'F',
  BOOLEAN: {
    TRUE: true,
    FALSE: false,
  },

  // Search operators
  ANY_OF: 'anyof',
  NONE_OF: 'noneof',
  IS: 'is',
  IS_NOT: 'isnot',
  IS_EMPTY: 'isempty',
  AND: 'AND',
  OR: 'OR',
  WITHIN: 'within',
  BEFORE: 'before',
  STARTS_WITH: 'startswith',
  CONTAINS: 'contains',
  EQUAL_TO: 'equalto',
  GREATER_THAN: 'greaterthan',
  LESS_THAN: 'lessthan',

  // Sort
  SORT: {
    ASC: 'ASC',
    DESC: 'DESC',
  },

  // Common fields
  INTERNAL_ID: 'internalid',
  NAME: 'name',
  IS_INACTIVE: 'isinactive',
  MAIN_LINE: 'mainline',
  TAX_LINE: 'taxline',
  SHIPPING_LINE: 'shipping',
  COGS_LINE: 'cogs',
  TYPE: 'type',
  RECORD_TYPE: 'recordtype',

  // Inventory
  BIN_NUMBER: 'binnumber',
  INVENTORY_NUMBER: 'inventorynumber',
  ON_HAND: 'onhand',
  AVAILABLE: 'available',
  INVENTORY: 'inventory',
  INVENTORY_DETAIL: 'inventorydetail',

  // Entity
  PARENT: 'parent',
  HAS_PARENT: 'hasparent',
  COMPANY: 'company',
  CONTACT: 'contact',
  IS_PERSON: 'isperson',

  // Modes
  MODES: {
    CREATE: 'create',
    EDIT: 'edit',
    VIEW: 'view',
    COPY: 'copy',
  },

  // Price levels
  PRICE_LEVELS: {
    CUSTOM: -1,
    BASE_PRICE: 1,
  },

  // Commit values
  COMMIT_VALUES: {
    AVAILABLE_QTY: 1,
    DO_NOT_COMMIT: 3,
  },

  // API Methods
  API_METHODS: {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
  },

  // None value
  NONE: '@NONE@',
};

/**
 * Online webstore inventory sync (Map/Reduce) — record/field script ids only (no N/* imports)
 */
const INVENTORY_SYNC = {
  /** Reduce → summarize key; value is `lastquantityavailablechange` text (same format as search). */
  MR_OUTPUT_KEY_LAST_QTY_CHANGE: 'lastQtyChange',
  /** Online Webstore Item Field must be a standard item body custom field id */
  STORE_ITEM_FIELD_ID_PREFIX: 'custitem_',
  /** Item internal id that does not exist — used for no-op search when getInputData aborts safely */
  NOOP_ITEM_INTERNAL_ID: '0',
  ITEM_SEARCH: {
    TYPE: 'item',
    ITEM_TYPES: ['Assembly', 'InvtPart'],
    /** Join id used in item search columns (must match account / custom record join) */
    ITEM_CUSTOM_RECORD_JOIN: 'CUSTRECORD_Q1W_ITEM',
    ITEM_LINK_FILTER_FIELD: 'custrecord_q1w_item.custrecord_q1w_item',
    LAST_QTY_CHANGE_FIELD: 'lastquantityavailablechange',
    COLUMNS: {
      INTERNAL_ID: 'internalid',
      ITEM_ID: 'itemid',
      TYPE: 'type',
      LAST_QTY_CHANGE: 'lastquantityavailablechange',
      QTY_AVAILABLE: 'quantityavailable',
      /** Joined from CUSTRECORD_Q1W_ITEM */
      STORE_ITEM_FIELD: 'custrecord_q1w_store_item_field',
      BUFFER: 'custrecord_q1w_buffer',
    },
  },
  /** Kit/Package item search — same Q1W item join as assembly/inventory search */
  KIT_SEARCH: {
    TYPE: 'kititem',
    ITEM_TYPES: ['Kit'],
    ITEM_LINK_FILTER_FIELD: 'custrecord_q1w_item.custrecord_q1w_item',
    ITEM_CUSTOM_RECORD_JOIN: 'CUSTRECORD_Q1W_ITEM',
    MEMBER_ITEM_JOIN: 'memberItem',
    /** Verify in Search UI if filter returns unexpected rows */
    MEMBER_LAST_QTY_FILTER_FIELD: 'memberitem.lastquantityavailablechange',
    COLUMNS: {
      INTERNAL_ID: 'internalid',
      ITEM_ID: 'itemid',
      TYPE: 'type',
      MEMBER_ITEM: 'memberitem',
      MEMBER_QTY_AVAILABLE: 'quantityavailable',
      MEMBER_LAST_QTY_CHANGE: 'lastquantityavailablechange',
      MEMBER_QUANTITY: 'memberquantity',
      BUFFER: 'custrecord_q1w_buffer',
      STORE_ITEM_FIELD: 'custrecord_q1w_store_item_field',
    },
  },
};

/**
 * Custom Field IDs
 * Add your project-specific custom fields here
 */
const CUSTOM_FIELD_IDS = {
  // Body fields (custbody_)
  // APPROVAL_STATUS: 'custbody_q1w_approval_status',
  // COMMISSION_RATE: 'custbody_q1w_commission_rate',
  // Line fields (custcol_)
  // LINE_DISCOUNT: 'custcol_q1w_line_discount',
  // Entity fields (custentity_)
  // CUSTOMER_TYPE: 'custentity_q1w_customer_type',
  // Item fields (custitem_)
  // ITEM_CATEGORY: 'custitem_q1w_item_category',
};

/**
 * Custom Record Types
 * Add your project-specific custom records here
 */
const CUSTOM_RECORDS = {
  /** Designed as a single-row record; scripts read/update the first row only (`getRange` 0–1). */
  ONLINE_WEBSTORE_CONFIG: {
    ID: 'customrecord_q1w_online_webstore_config',
    FIELDS: {
      LAST_QTY_AVAILABLE_CHANGE: 'custrecord_q1w_last_qty_available_change',
      LAST_QTY_AVAILABLE_CHANGE_KIT: 'custrecord_last_qty_available_chang_kit',
    },
  },
};

/**
 * Custom Lists
 * Add your project-specific custom list values here
 */
const CUSTOM_LISTS = {
  // STATUS: {
  //   PENDING: '1',
  //   APPROVED: '2',
  //   REJECTED: '3',
  // },
};

/**
 * Script Deployments
 * Store script and deployment IDs for reference
 */
const DEPLOYMENTS = {
  /** Replace with account script + deployment ids after creating the Scheduled Script record */
  KIT_INVENTORY_SYNC_SS: {
    SCRIPT_ID: 'customscript_q1w_item_inv_sync_for_kits',
    DEPLOYMENT_ID: 'customdeploy_q1w_item_inv_sync_for_kits',
  },
};

/**
 * Error Messages
 */
const ERROR_MESSAGES = {
  CUSTOMER_REQUIRED: 'Customer is required',
  ITEM_REQUIRED: 'At least one item is required',
  QUANTITY_INVALID: 'Quantity must be greater than zero',
  RATE_INVALID: 'Rate must be greater than zero',
  RECORD_NOT_FOUND: 'Record not found',
  PERMISSION_DENIED: 'You do not have permission to perform this action',
  VALIDATION_FAILED: 'Validation failed',
};

/**
 * Languages
 */
const LANGUAGES = {
  ENGLISH: 'en_US',
  ENGLISH_CA: 'en_CA',
  FRENCH_CA: 'fr_CA',
};

/**
 * Currencies
 */
const CURRENCIES = {
  CAD: 1,
  USD: 2,
  // Add other currencies as needed
};

// Default export with all constants
export default {
  RECORD_TYPES,
  BODY_FIELDS,
  LINE_FIELDS,
  SUBLIST_IDS,
  TRANSACTION_STATUS,
  ORDER_STATUS_VALUES,
  APPROVAL_STATUS,
  USER_EVENT_TYPES,
  GLOBAL,
  CUSTOM_FIELD_IDS,
  CUSTOM_RECORDS,
  CUSTOM_LISTS,
  DEPLOYMENTS,
  ERROR_MESSAGES,
  LANGUAGES,
  CURRENCIES,
  ENVIRONMENT_SPECIFIC_CONSTANTS,
  INVENTORY_SYNC,
};
