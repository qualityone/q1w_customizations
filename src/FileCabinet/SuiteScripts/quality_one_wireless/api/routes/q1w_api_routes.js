import TestHandler from '../handlers/q1w_test_handler';

const getTest = (context) => TestHandler.getTest(context);

export default {
  routes: {
    get_test: getTest,
  },
};
