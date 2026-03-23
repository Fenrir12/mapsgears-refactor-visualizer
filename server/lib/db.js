const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({
  commit_hash: { type: String, required: true },
  commit_date: { type: String, required: true },
  synced_at: { type: Date, default: Date.now },
  folder_path: { type: String, required: true },
  total_lines: { type: Number, default: 0 },
  java_lines: { type: Number, default: 0 },
  kotlin_lines: { type: Number, default: 0 },
  total_classes: { type: Number, default: 0 },
  java_classes: { type: Number, default: 0 },
  kotlin_classes: { type: Number, default: 0 },
  total_files: { type: Number, default: 0 },
  java_files: { type: Number, default: 0 },
  kotlin_files: { type: Number, default: 0 },
  class_list: [{
    name: String,
    file: String,
    language: { type: String, enum: ['java', 'kotlin'] },
  }],
});

snapshotSchema.index({ commit_hash: 1, folder_path: 1 }, { unique: true });
snapshotSchema.index({ commit_date: 1 });
snapshotSchema.index({ folder_path: 1 });

const Snapshot = mongoose.model('Snapshot', snapshotSchema);

let connected = false;

async function connectDb() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
  connected = true;
}


async function insertSnapshot(data) {
  await connectDb();
  try {
    await Snapshot.create(data);
  } catch (err) {
    // Ignore duplicate key (already have this commit)
    if (err.code !== 11000) throw err;
  }
}

async function getSnapshots({ folder, startDate, endDate } = {}) {
  await connectDb();
  const filter = {};
  if (folder) filter.folder_path = folder;
  if (startDate || endDate) {
    filter.commit_date = {};
    if (startDate) filter.commit_date.$gte = startDate;
    if (endDate) filter.commit_date.$lte = endDate;
  }
  return Snapshot.find(filter).sort({ commit_date: 1 }).select('-class_list').lean();
}

async function getLatestSnapshot(folder) {
  await connectDb();
  const filter = folder ? { folder_path: folder } : {};
  return Snapshot.findOne(filter).sort({ commit_date: -1 }).lean();
}

async function hasCommit(commitHash, folder) {
  await connectDb();
  const doc = await Snapshot.exists({ commit_hash: commitHash, folder_path: folder });
  return !!doc;
}

async function getAdjacentSnapshots(folder) {
  await connectDb();
  const filter = folder ? { folder_path: folder } : {};
  // Get snapshots that have class_list populated, sorted by date
  return Snapshot.find({ ...filter, 'class_list.0': { $exists: true } })
    .sort({ commit_date: 1 })
    .select('commit_hash commit_date class_list')
    .lean();
}

/**
 * Get snapshots with only class names (not full class_list objects) for trend calculations.
 * Much lighter than getAdjacentSnapshots.
 */
async function getSnapshotClassNames(folder) {
  await connectDb();
  const filter = folder ? { folder_path: folder } : {};
  const snapshots = await Snapshot.find({ ...filter, 'class_list.0': { $exists: true } })
    .sort({ commit_date: 1 })
    .select('commit_hash commit_date class_list.name')
    .lean();
  // Extract just the name strings to minimize memory
  return snapshots.map(s => ({
    commit_hash: s.commit_hash,
    commit_date: s.commit_date,
    classNames: new Set(s.class_list.map(c => c.name)),
  }));
}

/**
 * Get count of snapshots with class_list for a folder.
 */
async function countAdjacentSnapshots(folder) {
  await connectDb();
  const filter = folder ? { folder_path: folder } : {};
  return Snapshot.countDocuments({ ...filter, 'class_list.0': { $exists: true } });
}

/**
 * Get a cursor over snapshots with class_list, sorted by date.
 * Allows processing one at a time to avoid loading all into memory.
 */
function getAdjacentSnapshotsCursor(folder) {
  const filter = folder ? { folder_path: folder } : {};
  return Snapshot.find({ ...filter, 'class_list.0': { $exists: true } })
    .sort({ commit_date: 1 })
    .select('commit_hash commit_date class_list')
    .lean()
    .cursor();
}

module.exports = { connectDb, insertSnapshot, getSnapshots, getLatestSnapshot, hasCommit, getAdjacentSnapshots, getSnapshotClassNames, countAdjacentSnapshots, getAdjacentSnapshotsCursor };
