const PhabricatorClient = require('./phabricator');
const { analyzeFileContent, aggregateMetrics } = require('./analyzer');
const { insertSnapshot, hasCommit } = require('./db');

let syncing = false;

async function runSync({ phabUrl, apiToken, callsign, targetFolder }) {
  if (syncing) {
    console.log('[sync] Already running, skipping.');
    return { skipped: true };
  }

  syncing = true;
  console.log(`[sync] Starting sync for ${callsign}:${targetFolder}`);

  try {
    const client = new PhabricatorClient(phabUrl, apiToken);

    // Get recent commit history for the target folder
    const history = await client.getHistory(callsign, targetFolder, 200);
    console.log(`[sync] Found ${history.length} commits in history`);

    let newSnapshots = 0;

    for (const commit of history) {
      // Skip if we already have this commit
      if (hasCommit(commit.commitHash, targetFolder)) {
        continue;
      }

      console.log(`[sync] Analyzing commit ${commit.commitHash.substring(0, 8)} (${commit.commitDate})`);

      try {
        // List all files in the target folder at this commit
        const files = await client.listFilesRecursive(callsign, targetFolder, commit.commitHash);
        const javaKotlinFiles = files.filter((f) => f.endsWith('.java') || f.endsWith('.kt'));

        console.log(`[sync]   Found ${javaKotlinFiles.length} Java/Kotlin files`);

        // Analyze each file
        const fileResults = [];
        for (const filePath of javaKotlinFiles) {
          try {
            const content = await client.getFileContent(callsign, filePath, commit.commitHash);
            const result = analyzeFileContent(content, filePath);
            fileResults.push(result);
          } catch (err) {
            console.warn(`[sync]   Warning: could not read ${filePath}: ${err.message}`);
          }
        }

        // Aggregate and store
        const metrics = aggregateMetrics(fileResults);
        insertSnapshot({
          commit_hash: commit.commitHash,
          commit_date: commit.commitDate,
          folder_path: targetFolder,
          ...metrics,
        });

        newSnapshots++;
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
