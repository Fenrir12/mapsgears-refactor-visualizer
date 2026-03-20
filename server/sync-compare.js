/**
 * One-off: Sync the COMPARE_FOLDER (sharedMobile) to populate class data.
 * Syncs the 2 most recent commits matching the same dates as the target folder.
 *
 * Usage: node server/sync-compare.js
 */
require('dotenv').config();
const { connectDb } = require('./lib/db');
const { runSync } = require('./lib/sync');

async function main() {
  await connectDb();

  const config = {
    phabUrl: process.env.PHAB_URL,
    apiToken: process.env.PHAB_API_TOKEN,
    callsign: process.env.REPO_CALLSIGN,
    targetFolder: process.env.COMPARE_FOLDER,
  };

  if (!config.targetFolder) {
    console.error('COMPARE_FOLDER not set in .env');
    process.exit(1);
  }

  console.log(`Syncing compare folder: ${config.targetFolder}`);
  const result = await runSync(config);
  console.log('Result:', result);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
