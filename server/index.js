require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { connectDb, getSnapshots, getLatestSnapshot, getAdjacentSnapshots } = require('./lib/db');
const { runSync, isSyncing } = require('./lib/sync');
const { startScheduler } = require('./lib/scheduler');
const {
  createSessionMiddleware,
  requireAuth,
  meHandler,
  loginHandler,
  logoutHandler,
} = require('./lib/auth');

const app = express();

app.set('trust proxy', 1);
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(createSessionMiddleware());

// --- Auth routes (public) ---
app.get('/api/auth/me', meHandler);
app.post('/api/auth/login', loginHandler);
app.post('/auth/logout', logoutHandler);

// --- Auth guard ---
app.use(requireAuth);

// Serve static frontend
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

app.get('/api/snapshots', async (req, res) => {
  const { folder, startDate, endDate } = req.query;
  const snapshots = await getSnapshots({
    folder: folder || config.targetFolder,
    startDate,
    endDate,
  });
  res.json(snapshots);
});

app.get('/api/snapshots/latest', async (req, res) => {
  const folder = req.query.folder || config.targetFolder;
  const snapshot = await getLatestSnapshot(folder);
  res.json(snapshot || null);
});

app.get('/api/snapshots/class-changes', async (req, res) => {
  const folder = req.query.folder || config.targetFolder;
  try {
    const snapshots = await getAdjacentSnapshots(folder);
    if (snapshots.length < 2) {
      return res.json({ changes: [], snapshots: snapshots.length });
    }

    const changes = [];
    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];

      const prevSet = new Map(prev.class_list.map(c => [`${c.name}:::${c.file}`, c]));
      const currSet = new Map(curr.class_list.map(c => [`${c.name}:::${c.file}`, c]));

      const added = [];
      const removed = [];

      for (const [key, cls] of currSet) {
        if (!prevSet.has(key)) added.push(cls);
      }
      for (const [key, cls] of prevSet) {
        if (!currSet.has(key)) removed.push(cls);
      }

      if (added.length > 0 || removed.length > 0) {
        changes.push({
          from_commit: prev.commit_hash.substring(0, 8),
          to_commit: curr.commit_hash.substring(0, 8),
          from_date: prev.commit_date,
          to_date: curr.commit_date,
          added,
          removed,
          net: added.length - removed.length,
        });
      }
    }

    res.json({ changes, totalSnapshots: snapshots.length });
  } catch (err) {
    console.error('[api] Class changes error:', err.message);
    res.status(500).json({ error: 'Failed to compute class changes' });
  }
});

app.post('/api/sync', async (req, res) => {
  if (isSyncing()) {
    return res.status(409).json({ error: 'Sync already in progress' });
  }

  if (!config.phabUrl || !config.apiToken) {
    return res.status(500).json({ error: 'Phabricator not configured. Set PHAB_URL and PHAB_API_TOKEN.' });
  }

  res.json({ message: 'Sync started' });
  try {
    await runSync(config);
  } catch (err) {
    console.error('[api] Sync error:', err.message);
  }
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send('Frontend not built yet. Run: cd client && npm run build');
  }
});

// --- Start ---

const PORT = process.env.PORT || 3001;

async function start() {
  await connectDb();

  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);

    if (process.env.DASHBOARD_PASSWORD) {
      console.log('[server] Password authentication enabled');
    } else {
      console.log('[server] No password configured — running without auth');
    }

    if (config.phabUrl && config.apiToken) {
      startScheduler(config);
      console.log('[server] Scheduler started');
    } else {
      console.log('[server] Phabricator not configured — scheduler disabled');
    }
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
});
