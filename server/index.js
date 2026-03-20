require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getSnapshots, getLatestSnapshot } = require('./lib/db');
const { runSync, isSyncing } = require('./lib/sync');
const { startScheduler } = require('./lib/scheduler');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// Config from environment
const config = {
  phabUrl: process.env.PHAB_URL,
  apiToken: process.env.PHAB_API_TOKEN,
  callsign: process.env.REPO_CALLSIGN,
  targetFolder: process.env.TARGET_FOLDER,
  syncIntervalHours: process.env.SYNC_INTERVAL_HOURS || '6',
};

// --- API Routes ---

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', syncing: isSyncing() });
});

app.get('/api/config', (req, res) => {
  res.json({
    repoCallsign: config.callsign,
    targetFolder: config.targetFolder,
    syncIntervalHours: config.syncIntervalHours,
  });
});

app.get('/api/snapshots', (req, res) => {
  const { folder, startDate, endDate } = req.query;
  const snapshots = getSnapshots({
    folder: folder || config.targetFolder,
    startDate,
    endDate,
  });
  res.json(snapshots);
});

app.get('/api/snapshots/latest', (req, res) => {
  const folder = req.query.folder || config.targetFolder;
  const snapshot = getLatestSnapshot(folder);
  res.json(snapshot || null);
});

app.post('/api/sync', async (req, res) => {
  if (isSyncing()) {
    return res.status(409).json({ error: 'Sync already in progress' });
  }

  if (!config.phabUrl || !config.apiToken) {
    return res.status(500).json({ error: 'Phabricator not configured. Set PHAB_URL and PHAB_API_TOKEN.' });
  }

  // Run async, respond immediately
  res.json({ message: 'Sync started' });
  try {
    await runSync(config);
  } catch (err) {
    console.error('[api] Sync error:', err.message);
  }
});

// SPA fallback — serve index.html for non-API routes
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// --- Start ---

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] Listening on port ${PORT}`);

  // Start scheduled sync if Phabricator is configured
  if (config.phabUrl && config.apiToken) {
    startScheduler(config);
    console.log('[server] Scheduler started');
  } else {
    console.log('[server] Phabricator not configured — scheduler disabled');
  }
});
