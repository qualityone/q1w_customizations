'use strict';

/**
 * @module q1w_example_manager
 * @author Taha Aslam
 * @description Example manager module — see netsuite-standards.md for patterns
 */

import log from 'N/log';

const exampleFunction = () => {
  const logTitle = 'q1w_example_manager => exampleFunction';
  try {
    log.debug({ title: logTitle, details: 'Started' });
    // Business logic here
    log.debug({ title: logTitle, details: 'Completed' });
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
    throw error;
  }
};

export default {
  exampleFunction,
};
