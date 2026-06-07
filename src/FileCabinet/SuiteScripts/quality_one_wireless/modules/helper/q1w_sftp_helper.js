/**
 * @NApiVersion 2.1
 * @module q1w_sftp_helper
 * @author Q1W
 * @description Generic SFTP helper for inbound and outbound file operations
 */

import log from 'N/log';
import file from 'N/file';
import sftp from 'N/sftp';

const MODULE = 'q1w_sftp_helper';

const SFTP_AUTH_METHODS = {
  KEY: 'key',
  PASSWORD: 'password',
};

const hasNonEmptyValue = (value) => typeof value === 'string' && value.trim().length > 0;

const resolveAuthMode = (configJson = {}) => {
  const { sftpAuthMethod, sftpKeyId, sftpPasswordGuid } = configJson;
  const hasKeyId = hasNonEmptyValue(sftpKeyId);
  const hasPasswordGuid = hasNonEmptyValue(sftpPasswordGuid);

  if (hasKeyId && hasPasswordGuid) {
    throw new Error('SFTP config must specify either sftpKeyId or sftpPasswordGuid, not both');
  }

  if (hasNonEmptyValue(sftpAuthMethod)) {
    const authMethod = sftpAuthMethod.trim().toLowerCase();
    if (authMethod !== SFTP_AUTH_METHODS.KEY && authMethod !== SFTP_AUTH_METHODS.PASSWORD) {
      throw new Error('sftpAuthMethod must be "key" or "password"');
    }
    if (authMethod === SFTP_AUTH_METHODS.KEY && !hasKeyId) {
      throw new Error('sftpAuthMethod is "key" but sftpKeyId is missing');
    }
    if (authMethod === SFTP_AUTH_METHODS.PASSWORD && !hasPasswordGuid) {
      throw new Error('sftpAuthMethod is "password" but sftpPasswordGuid is missing');
    }
    return authMethod;
  }

  if (hasKeyId) {
    return SFTP_AUTH_METHODS.KEY;
  }
  if (hasPasswordGuid) {
    return SFTP_AUTH_METHODS.PASSWORD;
  }

  throw new Error('SFTP config must include sftpKeyId or sftpPasswordGuid');
};

const validateCommonConnectionFields = ({ sftpHost, sftpUsername, sftpHostKey }) => {
  if (!hasNonEmptyValue(sftpHost)) {
    throw new Error('SFTP config is missing required field: sftpHost');
  }
  if (!hasNonEmptyValue(sftpUsername)) {
    throw new Error('SFTP config is missing required field: sftpUsername');
  }
  if (!hasNonEmptyValue(sftpHostKey)) {
    throw new Error('SFTP config is missing required field: sftpHostKey');
  }
};

const normalizePath = (...parts) => {
  const cleanParts = parts
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ''));
  return `/${cleanParts.join('/')}`;
};

const createConnection = (configJson = {}) => {
  const logTitle = `${MODULE} => createConnection`;
  try {
    const {
      sftpHost,
      sftpPort,
      sftpUsername,
      sftpKeyId,
      sftpPasswordGuid,
      sftpHostKey,
      sftpHostKeyType,
      sftpDirectory,
      sftpTimeout,
    } = configJson;

    const authMode = resolveAuthMode(configJson);
    validateCommonConnectionFields({ sftpHost, sftpUsername, sftpHostKey });

    const connectionOptions = {
      url: sftpHost.trim(),
      username: sftpUsername.trim(),
      hostKey: sftpHostKey,
    };

    if (authMode === SFTP_AUTH_METHODS.KEY) {
      connectionOptions.keyId = sftpKeyId.trim();
    } else {
      connectionOptions.passwordGuid = sftpPasswordGuid.trim();
    }

    if (sftpPort) {
      connectionOptions.port = Number(sftpPort);
    }
    if (sftpHostKeyType) {
      connectionOptions.hostKeyType = sftpHostKeyType;
    }
    if (sftpDirectory) {
      connectionOptions.directory = sftpDirectory;
    }
    if (sftpTimeout) {
      connectionOptions.timeout = Number(sftpTimeout);
    }

    return sftp.createConnection(connectionOptions);
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack }),
    });
    throw error;
  }
};

const listFiles = (connection, directoryPath) => {
  const logTitle = `${MODULE} => listFiles`;
  try {
    const listResponse = connection.list({
      path: directoryPath,
      sort: sftp.Sort.NAME_ASC,
    });

    return (listResponse || []).filter((entry) => !entry.directory);
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({
        message: error.message,
        stack: error.stack,
        directoryPath,
      }),
    });
    throw error;
  }
};

const downloadFile = (connection, filename, directoryPath) => {
  const logTitle = `${MODULE} => downloadFile`;
  try {
    return connection.download({
      directory: directoryPath,
      filename,
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({
        message: error.message,
        stack: error.stack,
        filename,
        directoryPath,
      }),
    });
    throw error;
  }
};

const uploadFile = (connection, fileObj, filename, directoryPath, replaceExisting = true) => {
  const logTitle = `${MODULE} => uploadFile`;
  try {
    connection.upload({
      file: fileObj,
      filename,
      directory: directoryPath,
      replaceExisting,
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({
        message: error.message,
        stack: error.stack,
        filename,
        directoryPath,
      }),
    });
    throw error;
  }
};

const moveFile = (connection, fromPath, toPath) => {
  const logTitle = `${MODULE} => moveFile`;
  try {
    connection.move({
      from: fromPath,
      to: toPath,
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({
        message: error.message,
        stack: error.stack,
        fromPath,
        toPath,
      }),
    });
    throw error;
  }
};

const createCsvFile = (filename, content) => {
  const logTitle = `${MODULE} => createCsvFile`;
  try {
    return file.create({
      name: filename,
      fileType: file.Type.CSV,
      contents: content,
    });
  } catch (error) {
    log.error({
      title: logTitle,
      details: JSON.stringify({ message: error.message, stack: error.stack, filename }),
    });
    throw error;
  }
};

export default {
  normalizePath,
  createConnection,
  listFiles,
  downloadFile,
  uploadFile,
  moveFile,
  createCsvFile,
};
