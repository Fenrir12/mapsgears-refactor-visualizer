const GitClient = require('./git-client');
const { analyzeFileContent, aggregateMetrics } = require('./analyzer');
const { insertSnapshot, hasCommit } = require('./db');

let syncing = false;

// Max concurrent file reads
const CONCURRENCY = 10;

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

async function runSync({ phabUrl, apiToken, callsign, targetFolder, repoDir, gitCloneUrl, gitCloneUser, gitClonePassword }) {
  if (syncing) {
    console.log('[sync] Already running, skipping.');
    return { skipped: true };
  }

  syncing = true;
  console.log(`[sync] Starting sync for ${callsign}:${targetFolder}`);

  try {
    const client = new GitClient({ phabUrl, apiToken, callsign, repoDir, gitCloneUrl, gitCloneUser, gitClonePassword });

    // Pull latest (or clone if first run)
    await client.ensureRepo();

    // Get current HEAD commit
    const head = await client.getHeadCommit();
    if (!head) {
      console.log('[sync] No commits found.');
      return { newSnapshots: 0 };
    }

    console.log(`[sync] HEAD is ${head.commitHash.substring(0, 8)} (${head.commitDate})`);

    // Skip if we already have this commit
    if (await hasCommit(head.commitHash, targetFolder)) {
      console.log('[sync] Already up to date.');
      return { newSnapshots: 0 };
    }

    console.log(`[sync] Analyzing commit ${head.commitHash.substring(0, 8)}...`);

    // List files in folder at HEAD
    const allPaths = await client.listFiles(targetFolder);

    const javaKotlinFiles = (allPaths || []).filter(
      (f) => f.endsWith('.java') || f.endsWith('.kt')
    );

    const javaFiles = javaKotlinFiles.filter((f) => f.endsWith('.java'));
    const kotlinFiles = javaKotlinFiles.filter((f) => f.endsWith('.kt'));

    console.log(`[sync]   ${javaKotlinFiles.length} files (${javaFiles.length} Java, ${kotlinFiles.length} Kotlin)`);

    // Read and analyze files with concurrency limit
    const fileResults = await pooled(javaKotlinFiles, CONCURRENCY, async (filePath) => {
      try {
        const content = await client.getFileContent(filePath);
        return analyzeFileContent(content, filePath);
      } catch (err) {
        console.warn(`[sync]   Warning: could not read ${filePath}: ${err.message}`);
        return null;
      }
    });

    // Aggregate and store
    const metrics = aggregateMetrics(fileResults);
    await insertSnapshot({
      commit_hash: head.commitHash,
      commit_date: head.commitDate,
      folder_path: targetFolder,
      ...metrics,
    });

    console.log(`[sync] Snapshot saved for ${head.commitHash.substring(0, 8)}.`);
    return { newSnapshots: 1 };
  } finally {
    syncing = false;
  }
}

function isSyncing() {
  return syncing;
}

module.exports = { runSync, isSyncing };
