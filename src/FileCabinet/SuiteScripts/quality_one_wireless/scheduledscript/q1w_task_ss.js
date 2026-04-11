'use strict';

/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 * @NScriptType ScheduledScript
 *
 * @description [TASK_NAME] Scheduled Script
 * @author Taha Aslam
 * @version 1.0.0
 */

import log from 'N/log';
import runtime from 'N/runtime';
import task from 'N/task';

/**
 * Check governance and reschedule if low
 * @param {number} threshold - Minimum remaining usage before reschedule (default 100)
 * @returns {boolean} True if governance OK, false if rescheduled
 */
const checkGovernance = (threshold = 100) => {
  const logTitle = 'q1w_task_ss => checkGovernance';
  const script = runtime.getCurrentScript();
  const remaining = script.getRemainingUsage();

  if (remaining < threshold) {
    log.audit({ title: logTitle, details: `Low governance (${remaining}). Rescheduling...` });
    const scheduledTask = task.create({
      taskType: task.TaskType.SCHEDULED_SCRIPT,
      scriptId: script.id,
      deploymentId: script.deploymentId,
    });
    scheduledTask.submit();
    return false;
  }
  return true;
};

const execute = (context) => {
  const logTitle = 'q1w_task_ss => execute';
  try {
    log.audit({ title: logTitle, details: `Type: ${context.type}` });
    // Use checkGovernance() inside loops: if (!checkGovernance()) return;
  } catch (error) {
    log.error({ title: logTitle, details: JSON.stringify({ message: error.message, stack: error.stack }) });
  }
};

export default { execute, checkGovernance };
