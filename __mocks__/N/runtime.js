/**
 * Mock for N/runtime module
 */
const mockScript = {
  id: 'customscript_test',
  deploymentId: 'customdeploy_test',
  getParameter: jest.fn(),
  getRemainingUsage: jest.fn().mockReturnValue(1000),
};

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 3,
  roleId: 'administrator',
  subsidiary: 1,
  department: null,
  location: null,
};

module.exports = {
  getCurrentScript: jest.fn().mockReturnValue(mockScript),
  getCurrentUser: jest.fn().mockReturnValue(mockUser),
  executionContext: 'USERINTERFACE',
  ContextType: {
    USER_INTERFACE: 'USERINTERFACE',
    SCHEDULED: 'SCHEDULED',
    MAP_REDUCE: 'MAPREDUCE',
    SUITELET: 'SUITELET',
    RESTLET: 'RESTLET',
    WORKFLOW: 'WORKFLOW',
    USEREVENT: 'USEREVENT',
    CLIENT: 'CLIENT',
  },
  EnvType: {
    SANDBOX: 'SANDBOX',
    PRODUCTION: 'PRODUCTION',
    BETA: 'BETA',
    INTERNAL: 'INTERNAL',
  },
  envType: 'SANDBOX',
};
