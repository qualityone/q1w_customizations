/**
 * Mock for N/search module
 */
const mockResultSet = {
  each: jest.fn((callback) => {
    return true;
  }),
};

const mockSearch = {
  run: jest.fn().mockReturnValue(mockResultSet),
  runPaged: jest.fn().mockReturnValue({
    count: 0,
    fetch: jest.fn().mockReturnValue({ data: [] }),
  }),
};

module.exports = {
  Type: {
    SALES_ORDER: 'salesorder',
    INVOICE: 'invoice',
    CUSTOMER: 'customer',
    VENDOR: 'vendor',
    ITEM: 'item',
    TRANSACTION: 'transaction',
  },
  Operator: {
    ANYOF: 'anyof',
    IS: 'is',
    ISNOT: 'isnot',
    CONTAINS: 'contains',
    DOESNOTCONTAIN: 'doesnotcontain',
    STARTSWITH: 'startswith',
    GREATERTHAN: 'greaterthan',
    LESSTHAN: 'lessthan',
    BETWEEN: 'between',
  },
  create: jest.fn().mockReturnValue(mockSearch),
  load: jest.fn().mockReturnValue(mockSearch),
  createColumn: jest.fn((options) => options),
  createFilter: jest.fn((options) => options),
  lookupFields: jest.fn().mockReturnValue({}),
};
