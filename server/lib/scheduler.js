const cron = require('node-cron');
const { runSync } = require('./sync');

let task = null;

function startScheduler(config) {
  const hours = parseInt(config.syncIntervalHours, 10) || 6;
  const cronExpr = `0 */${hours} * * *`; // every N hours

  console.log(`[scheduler] Starting with interval: every ${hours} hours (${cronExpr})`);

  task = cron.schedule(cronExpr, async () => {
    console.log('[scheduler] Triggered sync...');
    try {
      await runSync(config);
      const additionalFolders = [config.compareFolder, ...(config.extraFolders || [])].filter(Boolean);
      for (const folder of additionalFolders) {
        await runSync({ ...config, targetFolder: folder });
      }
    } catch (err) {
      console.error('[scheduler] Sync failed:', err.message);
    }
  });

  return task;
}

function stopScheduler() {
  if (task) {
    task.stop();
    task = null;
  }
}

module.exports = { startScheduler, stopScheduler };
