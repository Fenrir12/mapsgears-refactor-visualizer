/**
 * One-off script: Delete the last 2 snapshots and re-analyze those exact commits
 * with the updated analyzer that captures class names.
 *
 * Usage: node server/resync-last2.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDb } = require('./lib/db');
const PhabricatorClient = require('./lib/phabricator');
const { analyzeFileContent, aggregateMetrics } = require('./lib/analyzer');

const CONCURRENCY = 10;

async function pooled(items, concurrency, fn) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  await connectDb();
  const Snapshot = mongoose.model('Snapshot');

  const targetFolder = process.env.TARGET_FOLDER;
  const callsign = process.env.REPO_CALLSIGN;

  // Find the last 2 snapshots
  const last2 = await Snapshot.find({ folder_path: targetFolder })
    .sort({ commit_date: -1 })
    .limit(2)
    .lean();

  if (last2.length < 2) {
    console.log('Not enough snapshots to resync. Need at least 2.');
    process.exit(1);
  }

  console.log(`Found last 2 snapshots:`);
  for (const s of last2) {
    console.log(`  ${s.commit_hash.substring(0, 8)} (${s.commit_date}) — ${s.total_classes} classes, class_list: ${s.class_list?.length || 0}`);
  }

  // Delete them
  const hashes = last2.map(s => s.commit_hash);
  const deleteResult = await Snapshot.deleteMany({ commit_hash: { $in: hashes }, folder_path: targetFolder });
  console.log(`\nDeleted ${deleteResult.deletedCount} snapshots.`);

  // Re-analyze those commits
  const client = new PhabricatorClient(process.env.PHAB_URL, process.env.PHAB_API_TOKEN);

  for (const snap of last2) {
    console.log(`\nRe-analyzing commit ${snap.commit_hash.substring(0, 8)} (${snap.commit_date})...`);

    const allPaths = await client.callConduit('diffusion.querypaths', {
      callsign,
      path: targetFolder,
      commit: snap.commit_hash,
    });

    const javaKotlinFiles = (allPaths || []).filter(
      f => f.endsWith('.java') || f.endsWith('.kt')
    );
    console.log(`  ${javaKotlinFiles.length} Java/Kotlin files`);

    const fileResults = await pooled(javaKotlinFiles, CONCURRENCY, async (filePath) => {
      try {
        const content = await client.getFileContent(callsign, filePath, snap.commit_hash);
        return analyzeFileContent(content, filePath);
      } catch (err) {
        console.warn(`  Warning: could not read ${filePath}: ${err.message}`);
        return null;
      }
    });

    const metrics = aggregateMetrics(fileResults);
    console.log(`  ${metrics.total_classes} classes found, ${metrics.class_list.length} class names captured`);

    await Snapshot.create({
      commit_hash: snap.commit_hash,
      commit_date: snap.commit_date,
      folder_path: targetFolder,
      ...metrics,
    });
    console.log(`  Snapshot saved with class_list!`);
  }

  console.log('\nDone! The last 2 snapshots now have class-level data.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
