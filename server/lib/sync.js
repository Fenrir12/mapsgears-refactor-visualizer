const PhabricatorClient = require('./phabricator');
const { analyzeFileContent, aggregateMetrics } = require('./analyzer');
const { insertSnapshot, hasCommit } = require('./db');

let syncing = false;

// Max concurrent file downloads
const CONCURRENCY = 10;

// Max commits to fully analyze per sync (evenly sampled from history)
const MAX_SAMPLED_COMMITS = 25;

/**
 * Run promises with limited concurrency.
 */
async function pooled(items, concurrency, fn) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Evenly sample N items from an array, always including first and last.
 */
function sampleEvenly(arr, n) {
  if (arr.length <= n) return arr;
  const result = [arr[0]];
  const step = (arr.length - 1) / (n - 1);
  for (let i = 1; i < n - 1; i++) {
    result.push(arr[Math.round(step * i)]);
  }
  result.push(arr[arr.length - 1]);
  return result;
}

async function runSync({ phabUrl, apiToken, callsign, targetFolder }) {
  if (syncing) {
    console.log('[sync] Already running, skipping.');
    return { skipped: true };
  }

  syncing = true;
  console.log(`[sync] Starting sync for ${callsign}:${targetFolder}`);

  try {
    const client = new PhabricatorClient(phabUrl, apiToken);

    // Get commit history for the target folder
    const history = await client.getHistory(callsign, targetFolder, 500);
    console.log(`[sync] Found ${history.length} commits in history`);

    // Filter out commits we already have
    const checks = await Promise.all(history.map(async (c) => !(await hasCommit(c.commitHash, targetFolder))));
    const newCommits = history.filter((_, i) => checks[i]);
    console.log(`[sync] ${newCommits.length} new commits to analyze`);

    if (newCommits.length === 0) {
      console.log('[sync] Nothing new.');
      return { newSnapshots: 0 };
    }

    // Sort oldest first so charts are chronological
    newCommits.sort((a, b) => new Date(a.commitDate) - new Date(b.commitDate));

    // Sample evenly to avoid overwhelming the API
    const sampled = sampleEvenly(newCommits, MAX_SAMPLED_COMMITS);
    console.log(`[sync] Sampling ${sampled.length} commits for full analysis`);

    let newSnapshots = 0;

    for (const commit of sampled) {
      if (await hasCommit(commit.commitHash, targetFolder)) continue;

      console.log(`[sync] Analyzing commit ${commit.commitHash.substring(0, 8)} (${commit.commitDate})`);

      try {
        // Use querypaths for fast recursive file listing
        const allPaths = await client.callConduit('diffusion.querypaths', {
          callsign,
          path: targetFolder,
          commit: commit.commitHash,
        });

        const javaKotlinFiles = (allPaths || []).filter(
          (f) => f.endsWith('.java') || f.endsWith('.kt')
        );

        const javaFiles = javaKotlinFiles.filter((f) => f.endsWith('.java'));
        const kotlinFiles = javaKotlinFiles.filter((f) => f.endsWith('.kt'));

        console.log(`[sync]   ${javaKotlinFiles.length} files (${javaFiles.length} Java, ${kotlinFiles.length} Kotlin)`);

        // Download and analyze files with concurrency limit
        const fileResults = await pooled(javaKotlinFiles, CONCURRENCY, async (filePath) => {
          try {
            const content = await client.getFileContent(callsign, filePath, commit.commitHash);
            return analyzeFileContent(content, filePath);
          } catch (err) {
            console.warn(`[sync]   Warning: could not read ${filePath}: ${err.message}`);
            return null;
          }
        });

        // Aggregate and store
        const metrics = aggregateMetrics(fileResults);
        await insertSnapshot({
          commit_hash: commit.commitHash,
          commit_date: commit.commitDate,
          folder_path: targetFolder,
          ...metrics,
        });

        newSnapshots++;
        console.log(`[sync]   Snapshot ${newSnapshots}/${sampled.length} saved`);
      } catch (err) {
        console.warn(`[sync]   Error analyzing commit ${commit.commitHash}: ${err.message}`);
      }
    }

    console.log(`[sync] Done. ${newSnapshots} new snapshots added.`);
    return { newSnapshots };
  } finally {
    syncing = false;
  }
}

function isSyncing() {
  return syncing;
}

module.exports = { runSync, isSyncing };
