"""
Generates a self-contained HTML report file.
Dark theme, pure CSS charts, vanilla JS interactivity.
"""

import json
import html
from datetime import datetime


def build_html(snapshots, class_changes, duplicates, config):
    """
    snapshots: list of dicts, each with commit info + metrics per folder
      [{ hash, date, summary, folders: { folder_path: {metrics} } }, ...]
    class_changes: list of dicts describing added/removed classes between consecutive snapshots
      [{ hash, date, summary, added: [...], removed: [...] }, ...]
    duplicates: list of folder-pair comparisons (latest snapshot only)
      [{ target_folder, compare_folder, target_classes, compare_classes, count, duplicates: [...] }, ...]
    config: dict with repo_path, target_folder, compare_folder, extra_folders
    """
    data_json = json.dumps({
        'snapshots': snapshots,
        'classChanges': class_changes,
        'duplicates': duplicates,
        'config': config,
    }, default=str)

    now = datetime.now().strftime('%Y-%m-%d %H:%M')

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Refactor Progress Report</title>
<style>
{CSS}
</style>
</head>
<body>
<div id="app"></div>
<script>
const DATA = {data_json};
const GENERATED = "{now}";
{JS}
</script>
</body>
</html>'''


CSS = '''
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0a0a1a;
  --card: #12122a;
  --surface: #1a1a36;
  --border: #2a2a44;
  --text-bright: #d4d4f0;
  --text-muted: #6a6a8a;
  --text-dim: #4a4a6a;
  --java: #f97316;
  --kotlin: #a855f7;
  --positive: #10b981;
  --negative: #ef4444;
  --accent: #06b6d4;
}

body {
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg);
  color: var(--text-bright);
  line-height: 1.5;
  padding: 2rem;
  max-width: 1100px;
  margin: 0 auto;
}

/* Header */
.header {
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border);
}
.header h1 {
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}
.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.65rem;
  color: var(--text-muted);
}
.header-meta span { display: flex; align-items: center; gap: 0.3rem; }
.tag {
  display: inline-block;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  font-size: 0.6rem;
  letter-spacing: 0.05em;
}
.tag-java { background: rgba(249,115,22,0.1); color: var(--java); }
.tag-kotlin { background: rgba(168,85,247,0.1); color: var(--kotlin); }

/* Cards */
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 1.25rem;
  position: relative;
  overflow: hidden;
}
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  opacity: 0.4;
}
.card-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}
.card-value {
  font-size: 1.5rem;
  font-weight: 300;
}
.card-breakdown {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.6rem;
}
.card-delta {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.6rem;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
}
.delta-pos { background: rgba(16,185,129,0.1); color: var(--positive); }
.delta-neg { background: rgba(239,68,68,0.1); color: var(--negative); }
.delta-zero { background: rgba(106,106,138,0.1); color: var(--text-muted); }

/* Section headers */
.section-header {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--text-muted);
  margin-bottom: 1rem;
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}
.section-header .count { color: var(--accent); letter-spacing: normal; }

/* Breakdown bar */
.breakdown {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 2rem;
}
.breakdown-bar {
  height: 0.5rem;
  border-radius: 0.25rem;
  background: var(--surface);
  overflow: hidden;
  margin-bottom: 0.75rem;
}
.breakdown-fill {
  height: 100%;
  border-radius: 0.25rem;
  background: linear-gradient(90deg, var(--java), var(--kotlin));
  transition: width 0.5s ease;
}
.breakdown-legend {
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
}

/* Bar charts */
.chart-section { margin-bottom: 2rem; }
.chart-container {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.chart-title {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 1rem;
}
.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 120px;
}
.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  position: relative;
}
.bar-stack {
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  border-radius: 2px 2px 0 0;
  overflow: hidden;
  min-width: 4px;
}
.bar-java { background: var(--java); }
.bar-kotlin { background: var(--kotlin); }
.bar-label {
  font-size: 0.5rem;
  color: var(--text-dim);
  margin-top: 0.3rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  text-align: center;
}
.bar-tooltip {
  display: none;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.4rem 0.6rem;
  font-size: 0.55rem;
  white-space: nowrap;
  z-index: 10;
  pointer-events: none;
}
.bar-group:hover .bar-tooltip { display: block; }

/* Class changes */
.changes-section { margin-bottom: 2rem; }
.change-commit {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  overflow: hidden;
}
.change-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.65rem;
}
.change-header:hover { background: var(--surface); }
.change-arrow {
  transition: transform 0.2s;
  color: var(--text-muted);
  font-size: 0.5rem;
}
.change-arrow.open { transform: rotate(90deg); }
.change-hash { color: var(--accent); }
.change-date { color: var(--text-dim); }
.change-summary { color: var(--text-muted); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.change-stats { display: flex; gap: 0.5rem; }
.change-stats .added { color: var(--positive); }
.change-stats .removed { color: var(--negative); }
.change-body {
  display: none;
  padding: 0 1rem 0.75rem;
  font-size: 0.6rem;
}
.change-body.open { display: block; }
.change-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
}
.change-item.add { background: rgba(16,185,129,0.05); }
.change-item.rem { background: rgba(239,68,68,0.05); }
.change-item .sign { font-weight: 600; width: 1rem; text-align: center; }
.change-item .sign.add-sign { color: var(--positive); }
.change-item .sign.rem-sign { color: var(--negative); }
.change-item .cls-name { color: var(--text-bright); }
.change-item .cls-file { color: var(--text-dim); margin-left: auto; }

/* Duplicates */
.dup-section { margin-bottom: 2rem; }
.dup-pair {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.dup-pair-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.6rem;
  color: var(--text-dim);
  margin-bottom: 1rem;
}
.dup-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.dup-stat {
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--surface);
}
.dup-stat-label {
  font-size: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 0.2rem;
}
.dup-stat-value { font-size: 1.1rem; font-weight: 300; }
.dup-stat.warn { border-color: rgba(249,115,22,0.2); }
.dup-stat.warn .dup-stat-value { color: var(--java); }
.dup-stat.good { border-color: rgba(16,185,129,0.2); }
.dup-stat.good .dup-stat-value { color: var(--positive); }

.dup-progress {
  height: 0.4rem;
  border-radius: 0.2rem;
  background: var(--surface);
  overflow: hidden;
  margin-bottom: 0.5rem;
}
.dup-progress-fill {
  height: 100%;
  border-radius: 0.2rem;
  background: linear-gradient(90deg, var(--positive), var(--accent));
}
.dup-progress-legend {
  display: flex;
  justify-content: space-between;
  font-size: 0.5rem;
  margin-bottom: 1rem;
}
.dup-progress-legend .dup-count { color: var(--java); }
.dup-progress-legend .unique-count { color: var(--positive); }

.dup-search {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.4rem 0.75rem;
  font-family: inherit;
  font-size: 0.6rem;
  color: var(--text-bright);
  outline: none;
  margin-bottom: 0.75rem;
}
.dup-search:focus { border-color: rgba(249,115,22,0.3); }
.dup-search::placeholder { color: var(--text-muted); }

.dup-list { max-height: 320px; overflow-y: auto; }
.dup-entry {
  border: 1px solid rgba(249,115,22,0.1);
  background: rgba(249,115,22,0.02);
  border-radius: 4px;
  margin-bottom: 0.3rem;
}
.dup-entry-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  font-size: 0.6rem;
}
.dup-entry-header:hover { background: rgba(249,115,22,0.05); }
.dup-entry-name { color: var(--text-bright); flex: 1; }
.dup-entry-body {
  display: none;
  padding: 0 0.75rem 0.5rem;
  margin-left: 1.5rem;
  font-size: 0.55rem;
}
.dup-entry-body.open { display: block; }
.dup-file-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.15rem 0.5rem;
  border-radius: 3px;
}
.dup-file-row .lang-tag {
  font-size: 0.5rem;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
}
.dup-file-row .folder-tag {
  font-size: 0.5rem;
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  background: var(--surface);
  color: var(--text-muted);
}
.dup-file-row .file-path {
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-data {
  text-align: center;
  padding: 2rem;
  color: var(--text-dim);
  font-size: 0.65rem;
}

/* Trend chart (duplicates over time) */
.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 80px;
  margin-bottom: 1rem;
}
.trend-bar {
  flex: 1;
  background: rgba(249,115,22,0.3);
  border-radius: 2px 2px 0 0;
  min-width: 3px;
  position: relative;
}
.trend-bar:hover { background: rgba(249,115,22,0.5); }
'''

JS = r'''
(function() {
  const { snapshots, classChanges, duplicates, config } = DATA;
  const app = document.getElementById('app');

  // ── Helpers ──
  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function shortHash(h) { return h ? h.substring(0, 8) : ''; }
  function shortDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function shortFolder(f) { return f ? f.split('/').pop() : ''; }
  function delta(v) {
    if (v > 0) return `<span class="card-delta delta-pos">+${v}</span>`;
    if (v < 0) return `<span class="card-delta delta-neg">${v}</span>`;
    return `<span class="card-delta delta-zero">0</span>`;
  }
  function fmtNum(n) { return n.toLocaleString(); }

  // ── Get target folder metrics from snapshots ──
  const target = config.target_folder;
  const targetSnapshots = snapshots.map(s => ({
    hash: s.hash,
    date: s.date,
    summary: s.summary,
    ...(s.folders[target] || {}),
  })).filter(s => s.total_lines !== undefined);

  if (targetSnapshots.length === 0) {
    app.innerHTML = '<div class="no-data">No snapshot data found for the target folder.</div>';
    return;
  }

  const first = targetSnapshots[0];
  const last = targetSnapshots[targetSnapshots.length - 1];

  // ── Header ──
  let h = `<div class="header">
    <h1>Refactor Progress Report</h1>
    <div class="header-meta">
      <span>Target: <span class="tag tag-java">${esc(shortFolder(target))}</span></span>
      <span>${esc(targetSnapshots.length)} snapshots</span>
      <span>${shortDate(first.date)} — ${shortDate(last.date)}</span>
      <span>Generated: ${GENERATED}</span>
    </div>
  </div>`;

  // ── Summary Cards ──
  const dLines = last.total_lines - first.total_lines;
  const dClasses = last.total_classes - first.total_classes;
  const dFiles = last.total_files - first.total_files;

  h += `<div class="cards">
    <div class="card">
      ${delta(dLines)}
      <div class="card-label">Total Lines</div>
      <div class="card-value">${fmtNum(last.total_lines)}</div>
      <div class="card-breakdown">
        <span style="color:var(--java)">Java ${fmtNum(last.java_lines)}</span>
        <span style="color:var(--kotlin)">Kotlin ${fmtNum(last.kotlin_lines)}</span>
      </div>
    </div>
    <div class="card">
      ${delta(dClasses)}
      <div class="card-label">Total Classes</div>
      <div class="card-value">${fmtNum(last.total_classes)}</div>
      <div class="card-breakdown">
        <span style="color:var(--java)">Java ${fmtNum(last.java_classes)}</span>
        <span style="color:var(--kotlin)">Kotlin ${fmtNum(last.kotlin_classes)}</span>
      </div>
    </div>
    <div class="card">
      ${delta(dFiles)}
      <div class="card-label">Total Files</div>
      <div class="card-value">${fmtNum(last.total_files)}</div>
      <div class="card-breakdown">
        <span style="color:var(--java)">Java ${fmtNum(last.java_files)}</span>
        <span style="color:var(--kotlin)">Kotlin ${fmtNum(last.kotlin_files)}</span>
      </div>
    </div>
  </div>`;

  // ── Breakdown Bar ──
  const javaPct = last.total_lines > 0 ? ((last.java_lines / last.total_lines) * 100).toFixed(1) : '0';
  const kotlinPct = last.total_lines > 0 ? ((last.kotlin_lines / last.total_lines) * 100).toFixed(1) : '0';

  h += `<div class="breakdown">
    <div class="section-header">Language Breakdown</div>
    <div class="breakdown-bar">
      <div class="breakdown-fill" style="width:${javaPct}%; background: var(--java);"></div>
    </div>
    <div class="breakdown-legend">
      <span style="color:var(--java)">Java ${javaPct}% (${fmtNum(last.java_lines)} lines)</span>
      <span style="color:var(--kotlin)">Kotlin ${kotlinPct}% (${fmtNum(last.kotlin_lines)} lines)</span>
    </div>
  </div>`;

  // ── Bar Charts ──
  function barChart(title, getJava, getKotlin) {
    if (targetSnapshots.length < 2) return '';
    const maxVal = Math.max(...targetSnapshots.map(s => getJava(s) + getKotlin(s)), 1);

    let bars = '';
    for (const s of targetSnapshots) {
      const jv = getJava(s);
      const kt = getKotlin(s);
      const total = jv + kt;
      const jvH = (jv / maxVal) * 100;
      const ktH = (kt / maxVal) * 100;
      bars += `<div class="bar-group">
        <div class="bar-tooltip">${shortHash(s.hash)}<br>Java: ${fmtNum(jv)} | Kotlin: ${fmtNum(kt)}</div>
        <div class="bar-stack" style="height:${((jvH + ktH) / 100) * 100}%">
          <div class="bar-kotlin" style="height:${total > 0 ? (kt/total)*100 : 0}%"></div>
          <div class="bar-java" style="height:${total > 0 ? (jv/total)*100 : 0}%"></div>
        </div>
        <div class="bar-label">${shortDate(s.date)}</div>
      </div>`;
    }

    return `<div class="chart-container">
      <div class="chart-title">${title}</div>
      <div class="bar-chart">${bars}</div>
    </div>`;
  }

  h += `<div class="chart-section">
    <div class="section-header">Trends <span class="count">${targetSnapshots.length} snapshots</span></div>
    ${barChart('Lines of Code', s => s.java_lines || 0, s => s.kotlin_lines || 0)}
    ${barChart('Classes', s => s.java_classes || 0, s => s.kotlin_classes || 0)}
    ${barChart('Files', s => s.java_files || 0, s => s.kotlin_files || 0)}
  </div>`;

  // ── Class Changes ──
  if (classChanges && classChanges.length > 0) {
    const totalAdded = classChanges.reduce((s, c) => s + c.added.length, 0);
    const totalRemoved = classChanges.reduce((s, c) => s + c.removed.length, 0);

    let changesHtml = '';
    for (let i = 0; i < classChanges.length; i++) {
      const c = classChanges[i];
      if (c.added.length === 0 && c.removed.length === 0) continue;

      let bodyItems = '';
      for (const a of c.added) {
        bodyItems += `<div class="change-item add">
          <span class="sign add-sign">+</span>
          <span class="tag tag-${a.language === 'java' ? 'java' : 'kotlin'}">${a.language === 'java' ? 'JV' : 'KT'}</span>
          <span class="cls-name">${esc(a.name)}</span>
          <span class="cls-file">${esc(a.file.split('/').slice(-3).join('/'))}</span>
        </div>`;
      }
      for (const r of c.removed) {
        bodyItems += `<div class="change-item rem">
          <span class="sign rem-sign">−</span>
          <span class="tag tag-${r.language === 'java' ? 'java' : 'kotlin'}">${r.language === 'java' ? 'JV' : 'KT'}</span>
          <span class="cls-name">${esc(r.name)}</span>
          <span class="cls-file">${esc(r.file.split('/').slice(-3).join('/'))}</span>
        </div>`;
      }

      changesHtml += `<div class="change-commit">
        <div class="change-header" data-toggle="change-${i}">
          <span class="change-arrow" id="arrow-change-${i}">▶</span>
          <span class="change-hash">${shortHash(c.hash)}</span>
          <span class="change-date">${shortDate(c.date)}</span>
          <span class="change-summary">${esc(c.summary)}</span>
          <div class="change-stats">
            ${c.added.length > 0 ? `<span class="added">+${c.added.length}</span>` : ''}
            ${c.removed.length > 0 ? `<span class="removed">−${c.removed.length}</span>` : ''}
          </div>
        </div>
        <div class="change-body" id="change-${i}">${bodyItems}</div>
      </div>`;
    }

    h += `<div class="changes-section">
      <div class="section-header">Class Changes
        <span class="count" style="color:var(--positive)">+${totalAdded}</span>
        <span class="count" style="color:var(--negative)">−${totalRemoved}</span>
      </div>
      ${changesHtml}
    </div>`;
  }

  // ── Duplicates ──
  if (duplicates && duplicates.length > 0) {
    const totalDups = duplicates.reduce((s, p) => s + p.count, 0);

    let dupHtml = '';
    for (let pi = 0; pi < duplicates.length; pi++) {
      const pair = duplicates[pi];
      const targetShort = shortFolder(pair.target_folder);
      const compareShort = shortFolder(pair.compare_folder);

      if (pair.count === 0) {
        dupHtml += `<div class="dup-pair" style="text-align:center;">
          <div class="dup-pair-header"><span class="tag tag-java">${esc(targetShort)}</span> ↔ <span class="tag tag-kotlin">${esc(compareShort)}</span></div>
          <div style="color:var(--positive);font-size:0.65rem;">No duplicates!</div>
        </div>`;
        continue;
      }

      const totalClasses = pair.target_classes + pair.compare_classes;
      const cleanPct = ((1 - pair.count / totalClasses) * 100).toFixed(1);

      // Trend bars if available
      let trendHtml = '';
      if (pair.trend && pair.trend.length >= 2) {
        const maxT = Math.max(...pair.trend.map(t => t.count), 1);
        let trendBars = '';
        for (const t of pair.trend) {
          const h = (t.count / maxT) * 100;
          trendBars += `<div class="trend-bar" style="height:${h}%" title="${shortDate(t.date)}: ${t.count}"></div>`;
        }
        trendHtml = `<div style="font-size:0.5rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:0.3rem;">Trend</div>
          <div class="trend-chart">${trendBars}</div>`;
      }

      let dupListItems = '';
      for (let di = 0; di < pair.duplicates.length; di++) {
        const d = pair.duplicates[di];
        let fileRows = '';
        for (const f of d.targetFiles) {
          fileRows += `<div class="dup-file-row">
            <span class="lang-tag tag-${f.language === 'java' ? 'java' : 'kotlin'}">${f.language === 'java' ? 'JV' : 'KT'}</span>
            <span class="folder-tag">${esc(targetShort)}</span>
            <span class="file-path">${esc(f.file.split('/').slice(-3).join('/'))}</span>
          </div>`;
        }
        for (const f of d.compareFiles) {
          fileRows += `<div class="dup-file-row">
            <span class="lang-tag tag-${f.language === 'java' ? 'java' : 'kotlin'}">${f.language === 'java' ? 'JV' : 'KT'}</span>
            <span class="folder-tag">${esc(compareShort)}</span>
            <span class="file-path">${esc(f.file.split('/').slice(-3).join('/'))}</span>
          </div>`;
        }

        dupListItems += `<div class="dup-entry" data-name="${esc(d.name.toLowerCase())}" data-files="${esc(JSON.stringify([...d.targetFiles, ...d.compareFiles].map(f => f.file.toLowerCase())))}" data-pair="${pi}">
          <div class="dup-entry-header" data-toggle="dup-${pi}-${di}">
            <span class="change-arrow" id="arrow-dup-${pi}-${di}">▶</span>
            <span class="dup-entry-name">${esc(d.name)}</span>
            <span class="tag tag-java">${esc(targetShort)} (${d.targetFiles.length})</span>
            <span class="tag tag-kotlin">${esc(compareShort)} (${d.compareFiles.length})</span>
          </div>
          <div class="dup-entry-body" id="dup-${pi}-${di}">${fileRows}</div>
        </div>`;
      }

      dupHtml += `<div class="dup-pair">
        <div class="dup-pair-header">
          <span class="tag tag-java">${esc(targetShort)}</span> ↔ <span class="tag tag-kotlin">${esc(compareShort)}</span>
        </div>
        <div class="dup-stats">
          <div class="dup-stat warn"><div class="dup-stat-label">Duplicates</div><div class="dup-stat-value">${pair.count}</div></div>
          <div class="dup-stat"><div class="dup-stat-label">${esc(targetShort)}</div><div class="dup-stat-value">${pair.target_classes}</div></div>
          <div class="dup-stat"><div class="dup-stat-label">${esc(compareShort)}</div><div class="dup-stat-value">${pair.compare_classes}</div></div>
          <div class="dup-stat good"><div class="dup-stat-label">Clean</div><div class="dup-stat-value">${cleanPct}%</div></div>
        </div>
        <div class="dup-progress"><div class="dup-progress-fill" style="width:${cleanPct}%"></div></div>
        <div class="dup-progress-legend">
          <span class="dup-count">${pair.count} duplicated</span>
          <span class="unique-count">${totalClasses - pair.count} unique</span>
        </div>
        ${trendHtml}
        <input type="text" class="dup-search" placeholder="Search duplicates..." data-pair-index="${pi}">
        <div class="dup-list" id="dup-list-${pi}">${dupListItems}</div>
      </div>`;
    }

    h += `<div class="dup-section">
      <div class="section-header">Double Implementations <span class="count">${totalDups} total across ${duplicates.length} pair${duplicates.length === 1 ? '' : 's'}</span></div>
      ${dupHtml}
    </div>`;
  }

  app.innerHTML = h;

  // ── Interactivity: toggle expand/collapse ──
  document.addEventListener('click', function(e) {
    const header = e.target.closest('[data-toggle]');
    if (!header) return;
    const id = header.getAttribute('data-toggle');
    const body = document.getElementById(id);
    const arrow = document.getElementById('arrow-' + id);
    if (body) {
      body.classList.toggle('open');
      if (arrow) arrow.classList.toggle('open');
    }
  });

  // ── Interactivity: duplicate search ──
  document.querySelectorAll('.dup-search').forEach(function(input) {
    input.addEventListener('input', function() {
      const q = this.value.toLowerCase();
      const pi = this.getAttribute('data-pair-index');
      const list = document.getElementById('dup-list-' + pi);
      if (!list) return;
      list.querySelectorAll('.dup-entry').forEach(function(entry) {
        const name = entry.getAttribute('data-name') || '';
        const files = entry.getAttribute('data-files') || '';
        const match = !q || name.includes(q) || files.includes(q);
        entry.style.display = match ? '' : 'none';
      });
    });
  });
})();
'''
