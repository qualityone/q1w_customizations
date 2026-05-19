/**
 * q1w_validation_error.js
 * @NApiVersion 2.1
 * @module q1w_validation_error
 */

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.isValidationError = true;
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export default {
  ValidationError,
  NotFoundError,
};
