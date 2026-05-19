/**
 * q1w_error_decorator.js
 * @NApiVersion 2.1
 */
const errorType = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
};

const routesError = (error) => {
  const { name = 'error', message, data } = error;
  const errorReponse = {
    status: 'false',
    errorCode: errorType[error.name] || 500,
    message: `${name} :: ${message}`,
  };

  if (data) {
    errorReponse.data = data;
  }

  return errorReponse;
};

const throwError = (error) => {
  throw error;
};

export default {
  routesError,
  throwError,
};
