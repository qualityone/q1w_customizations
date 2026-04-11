/**
 * Jest Setup File
 * Runs before each test file
 */

// Global test timeout
jest.setTimeout(10000);

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
