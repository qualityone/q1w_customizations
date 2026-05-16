/**
 * q1w_router.js
 * @NApiVersion 2.1
 */

import log from 'N/log';
import General from '../helper/q1w_general';
import Integration from './q1w_integration';
import Config from '../dao/q1w_config_dao';

const routes = {};
const routeModules = {};
let currentRoute = '';
let currentRouteInfo = {};

const routeProcess = (routePath, routeCallBack, moduleCallBack = null) => {
  routes[routePath.toLowerCase()] = routeCallBack;
  if (typeof moduleCallBack === 'function') {
    const { nsModule = {}, esModule = {} } = moduleCallBack();
    routeModules[routePath] = {
      nsModule,
      esModule,
    };
  }
};

const clearRoutes = () => {
  const routePaths = Object.keys(routes);
  routePaths.forEach((routePath) => {
    delete routes[routePath];
  });

  const routeModulePaths = Object.keys(routeModules);
  routeModulePaths.forEach((routePath) => {
    delete routeModules[routePath];
  });
};

const routeModule = (routePath, moduleCallBack) => {
  const { nsModule = {}, esModule = {} } = moduleCallBack();
  routeModules[routePath.toLowerCase()] = {
    nsModule,
    esModule,
  };
};

const getDetailsFromRoute = (routePath) => {
  const [systemType = '', feature = '', execMode = '', configId = null] = routePath.split('/');
  return {
    systemType,
    feature,
    execMode,
    configId,
  };
};

const setCurrentRoute = (routePath) => {
  currentRoute = routePath;
  const routeDetails = getDetailsFromRoute(currentRoute);
  currentRouteInfo = routeDetails;
};

const getModuleAndCallBackByRoute = (routePath = '') => {
  const { nsModule = null, esModule = null } = routeModules[routePath.toLowerCase()] || {};
  return {
    processCallBack: routes[routePath.toLowerCase()],
    nsModule,
    esModule,
  };
};

const executeByRoute = ({ routeParam, configParam, routePathStr, paramConfigId }) => {
  let isReScheduleNeeded = false;
  let route = null;
  let configId = null;
  let paramsObj = {};
  if (routeParam && configParam) {
    paramsObj = General.getScriptParams({
      route: routeParam,
      configId: configParam,
    });
    route = paramsObj.route;
    configId = paramsObj.configId;
  }

  if (!route && routePathStr) {
    route = routePathStr;
  }

  if (!configId && paramConfigId) {
    configId = paramConfigId;
  }

  setCurrentRoute(route);
  const { feature, configId: configIdFromRoute } = currentRouteInfo;
  if (!configId && configIdFromRoute) {
    configId = configIdFromRoute;
  }
  const configs = Config.getAll();
  for (let i = 0; i < configs.length; i++) {
    const configInstance = configs[i];
    try {
      if (!configId || (configId && configInstance.id === configId)) {
        Integration.setCurrentConfig(configInstance.id);
        Integration.setCurrentFeatureConfig(feature, configInstance.id, currentRouteInfo);
        if (currentRouteInfo.systemType === configInstance.system.value) {
          const { nsModule, esModule, processCallBack } = getModuleAndCallBackByRoute(route);
          if (!processCallBack) {
            throw new Error(`route ${currentRoute} is not defined or implemented properly.`);
          }
          isReScheduleNeeded = processCallBack(Integration.getCurrentConfig(), nsModule, esModule);
          if (isReScheduleNeeded && routeParam && configParam) {
            General.rescheduleScript({
              [routeParam]: paramsObj.route,
              [configParam]: paramsObj.configId,
            });
            break;
          }
        }
      }
    } catch (execByRouteExp) {
      log.error(`Error while executing configId ${configInstance.id}`, execByRouteExp);
    }
  }
  return isReScheduleNeeded;
};

export default {
  clearRoutes,
  routeProcess,
  routeModule,
  setCurrentRoute,
  executeByRoute,
};
