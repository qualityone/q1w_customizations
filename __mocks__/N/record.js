/**
 * Mock for N/record module
 */
const mockRecord = {
  getValue: jest.fn(),
  setValue: jest.fn(),
  getSublistValue: jest.fn(),
  setSublistValue: jest.fn(),
  getCurrentSublistValue: jest.fn(),
  setCurrentSublistValue: jest.fn(),
  getLineCount: jest.fn().mockReturnValue(0),
  selectLine: jest.fn(),
  selectNewLine: jest.fn(),
  commitLine: jest.fn(),
  removeLine: jest.fn(),
  save: jest.fn().mockReturnValue(1),
  id: null,
  type: null,
};

module.exports = {
  Type: {
    SALES_ORDER: 'salesorder',
    INVOICE: 'invoice',
    CUSTOMER: 'customer',
    VENDOR: 'vendor',
    ITEM: 'item',
    INVENTORY_ITEM: 'inventoryitem',
  },
  create: jest.fn().mockReturnValue(mockRecord),
  load: jest.fn().mockReturnValue(mockRecord),
  copy: jest.fn().mockReturnValue(mockRecord),
  transform: jest.fn().mockReturnValue(mockRecord),
  delete: jest.fn(),
  submitFields: jest.fn().mockReturnValue(1),
};
