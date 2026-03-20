const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'data.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initialize();
  }
  return db;
}

function initialize() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      commit_hash TEXT NOT NULL,
      commit_date TEXT NOT NULL,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      folder_path TEXT NOT NULL,
      total_lines INTEGER NOT NULL DEFAULT 0,
      java_lines INTEGER NOT NULL DEFAULT 0,
      kotlin_lines INTEGER NOT NULL DEFAULT 0,
      total_classes INTEGER NOT NULL DEFAULT 0,
      java_classes INTEGER NOT NULL DEFAULT 0,
      kotlin_classes INTEGER NOT NULL DEFAULT 0,
      total_files INTEGER NOT NULL DEFAULT 0,
      java_files INTEGER NOT NULL DEFAULT 0,
      kotlin_files INTEGER NOT NULL DEFAULT 0,
      UNIQUE(commit_hash, folder_path)
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_date ON snapshots(commit_date);
    CREATE INDEX IF NOT EXISTS idx_snapshots_folder ON snapshots(folder_path);
  `);
}

function insertSnapshot(snapshot) {
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO snapshots (
      commit_hash, commit_date, folder_path,
      total_lines, java_lines, kotlin_lines,
      total_classes, java_classes, kotlin_classes,
      total_files, java_files, kotlin_files
    ) VALUES (
      @commit_hash, @commit_date, @folder_path,
      @total_lines, @java_lines, @kotlin_lines,
      @total_classes, @java_classes, @kotlin_classes,
      @total_files, @java_files, @kotlin_files
    )
  `);
  return stmt.run(snapshot);
}

function getSnapshots({ folder, startDate, endDate } = {}) {
  let query = 'SELECT * FROM snapshots WHERE 1=1';
  const params = {};

  if (folder) {
    query += ' AND folder_path = @folder';
    params.folder = folder;
  }
  if (startDate) {
    query += ' AND commit_date >= @startDate';
    params.startDate = startDate;
  }
  if (endDate) {
    query += ' AND commit_date <= @endDate';
    params.endDate = endDate;
  }

  query += ' ORDER BY commit_date ASC';
  return getDb().prepare(query).all(params);
}

function getLatestSnapshot(folder) {
  const query = folder
    ? 'SELECT * FROM snapshots WHERE folder_path = ? ORDER BY commit_date DESC LIMIT 1'
    : 'SELECT * FROM snapshots ORDER BY commit_date DESC LIMIT 1';
  return folder ? getDb().prepare(query).get(folder) : getDb().prepare(query).get();
}

function hasCommit(commitHash, folder) {
  const row = getDb().prepare(
    'SELECT 1 FROM snapshots WHERE commit_hash = ? AND folder_path = ?'
  ).get(commitHash, folder);
  return !!row;
}

module.exports = { getDb, insertSnapshot, getSnapshots, getLatestSnapshot, hasCommit };
