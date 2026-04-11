module.exports = {
  // Test environment
  testEnvironment: 'node',

  // File extensions to consider
  moduleFileExtensions: ['js', 'json'],

  // Test file patterns
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],

  // Files to collect coverage from
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!src/**/__tests__/**'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Module name mapping for NetSuite modules
  moduleNameMapper: {
    '^N/log$': '<rootDir>/__mocks__/N/log.js',
    '^N/record$': '<rootDir>/__mocks__/N/record.js',
    '^N/search$': '<rootDir>/__mocks__/N/search.js',
    '^N/runtime$': '<rootDir>/__mocks__/N/runtime.js',
    '^N/format$': '<rootDir>/__mocks__/N/format.js',
    '^N/email$': '<rootDir>/__mocks__/N/email.js',
    '^N/file$': '<rootDir>/__mocks__/N/file.js',
    '^N/task$': '<rootDir>/__mocks__/N/task.js',
    '^N/url$': '<rootDir>/__mocks__/N/url.js',
    '^N/https$': '<rootDir>/__mocks__/N/https.js',
    '^N/ui/serverWidget$': '<rootDir>/__mocks__/N/ui/serverWidget.js',
    '^N/ui/message$': '<rootDir>/__mocks__/N/ui/message.js',
    '^N/ui/dialog$': '<rootDir>/__mocks__/N/ui/dialog.js',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Transform settings
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Verbose output
  verbose: true,
};
