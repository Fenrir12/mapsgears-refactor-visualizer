#!/usr/bin/env python3
"""
Refactor progress report generator.
Reads a local git repo and generates a self-contained HTML report.

Usage:
    python generate.py
"""

import sys
import os
import subprocess
import webbrowser
import concurrent.futures

from lib.git_reader import get_commits, list_files, get_file_content
from lib.analyzer import analyze_file, aggregate_metrics
from lib.html_builder import build_html

# ── Configuration (edit these) ──────────────────────────────────────────────
REPO_PATH = os.path.expanduser('~/Documents/MapGears/optimus')
TARGET_FOLDER = 'development/androidSystem/sharedLibs/ondagocommon'
COMPARE_FOLDER = 'development/androidSystem/sharedLibs/sharedMobile'
EXTRA_FOLDERS = ['development/androidSystem/androidProduction/ondagoAndroidApp']
OUTPUT_FILE = 'report.html'
MAX_WORKERS = 10
# ────────────────────────────────────────────────────────────────────────────


def analyze_folder_at_commit(repo_path, commit_hash, folder):
    """Analyze all Java/Kotlin files in a folder at a specific commit."""
    all_paths = list_files(repo_path, commit_hash, folder)
    jk_paths = [f for f in all_paths if f.endswith('.java') or f.endswith('.kt')]

    if not jk_paths:
        return aggregate_metrics([])

    def read_and_analyze(file_path):
        try:
            content = get_file_content(repo_path, commit_hash, file_path)
            return analyze_file(content, file_path)
        except Exception as e:
            print(f'  Warning: could not read {file_path}: {e}', file=sys.stderr)
            return None

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        results = list(pool.map(read_and_analyze, jk_paths))

    return aggregate_metrics(results)


def compute_class_changes(snapshots, target_folder):
    """Compute added/removed classes between consecutive snapshots for the target folder."""
    changes = []
    for i in range(1, len(snapshots)):
        prev = snapshots[i - 1]
        curr = snapshots[i]

        prev_metrics = prev['folders'].get(target_folder, {})
        curr_metrics = curr['folders'].get(target_folder, {})

        prev_classes = {(c['name'], c['file']) for c in prev_metrics.get('class_list', [])}
        curr_classes = {(c['name'], c['file']) for c in curr_metrics.get('class_list', [])}

        # Build lookup dicts for full class info
        prev_lookup = {(c['name'], c['file']): c for c in prev_metrics.get('class_list', [])}
        curr_lookup = {(c['name'], c['file']): c for c in curr_metrics.get('class_list', [])}

        added_keys = curr_classes - prev_classes
        removed_keys = prev_classes - curr_classes

        added = [curr_lookup[k] for k in sorted(added_keys)]
        removed = [prev_lookup[k] for k in sorted(removed_keys)]

        if added or removed:
            changes.append({
                'hash': curr['hash'],
                'date': curr['date'],
                'summary': curr['summary'],
                'added': added,
                'removed': removed,
            })

    return changes


def compute_duplicates(snapshots, target_folder, compare_folder):
    """Find classes with the same name in target and compare folders at the latest snapshot."""
    if not snapshots:
        return None

    latest = snapshots[-1]
    target_metrics = latest['folders'].get(target_folder, {})
    compare_metrics = latest['folders'].get(compare_folder, {})

    target_classes = target_metrics.get('class_list', [])
    compare_classes = compare_metrics.get('class_list', [])

    # Group by class name
    target_by_name = {}
    for c in target_classes:
        target_by_name.setdefault(c['name'], []).append(c)

    compare_by_name = {}
    for c in compare_classes:
        compare_by_name.setdefault(c['name'], []).append(c)

    # Find duplicates (same name in both folders)
    dup_names = sorted(set(target_by_name.keys()) & set(compare_by_name.keys()))
    dups = []
    for name in dup_names:
        dups.append({
            'name': name,
            'targetFiles': target_by_name[name],
            'compareFiles': compare_by_name[name],
        })

    # Trend: duplicate count at each snapshot
    trend = []
    for snap in snapshots:
        t_metrics = snap['folders'].get(target_folder, {})
        c_metrics = snap['folders'].get(compare_folder, {})
        t_names = {c['name'] for c in t_metrics.get('class_list', [])}
        c_names = {c['name'] for c in c_metrics.get('class_list', [])}
        trend.append({
            'date': snap['date'],
            'count': len(t_names & c_names),
        })

    return {
        'target_folder': target_folder,
        'compare_folder': compare_folder,
        'target_classes': len(target_classes),
        'compare_classes': len(compare_classes),
        'count': len(dups),
        'duplicates': dups,
        'trend': trend,
    }


def prompt_start_commit(repo_path):
    """Show recent commits and prompt the user to pick the farthest one from HEAD."""
    result = subprocess.run(
        ['git', 'log', '--oneline', '-20'],
        cwd=repo_path, capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f'Error reading git log: {result.stderr.strip()}', file=sys.stderr)
        sys.exit(1)

    lines = [l for l in result.stdout.strip().split('\n') if l.strip()]
    if not lines:
        print('No commits found in repo.', file=sys.stderr)
        sys.exit(1)

    print(f'\nRecent commits in {repo_path}:\n')
    for i, line in enumerate(lines):
        print(f'  {i + 1:>3}.  {line}')

    print(f'\nEnter the farthest commit from HEAD to start analysis from.')
    print(f'You can type the number (1-{len(lines)}), a commit hash, or press Enter for the last shown.\n')

    choice = input('Start commit: ').strip()

    if not choice:
        # Default to the last (oldest) shown
        return lines[-1].split()[0]

    if choice.isdigit():
        idx = int(choice) - 1
        if 0 <= idx < len(lines):
            return lines[idx].split()[0]
        print(f'Invalid number. Must be 1-{len(lines)}.', file=sys.stderr)
        sys.exit(1)

    # Treat as a commit hash — verify it exists
    verify = subprocess.run(
        ['git', 'rev-parse', '--verify', choice],
        cwd=repo_path, capture_output=True, text=True,
    )
    if verify.returncode != 0:
        print(f'Invalid commit: {choice}', file=sys.stderr)
        sys.exit(1)

    return verify.stdout.strip()


def main():
    if not os.path.isdir(REPO_PATH):
        print(f'Error: REPO_PATH does not exist: {REPO_PATH}', file=sys.stderr)
        sys.exit(1)

    start_commit = prompt_start_commit(REPO_PATH)

    # All folders to analyze
    all_folders = [TARGET_FOLDER, COMPARE_FOLDER] + EXTRA_FOLDERS

    # Get commits
    print(f'\nGetting commits from {start_commit[:8]}..HEAD ...')
    commits = get_commits(REPO_PATH, start_commit)
    print(f'Found {len(commits)} commits.')

    if not commits:
        print('No commits found.', file=sys.stderr)
        sys.exit(1)

    # Analyze each commit
    snapshots = []
    for i, commit in enumerate(commits):
        short = commit['hash'][:8]
        print(f'[{i + 1}/{len(commits)}] Analyzing {short} ({commit["date"][:10]}) ...')

        folders_data = {}
        for folder in all_folders:
            metrics = analyze_folder_at_commit(REPO_PATH, commit['hash'], folder)
            # Convert class_list for JSON serialization (keep it for computation, store summary for HTML)
            folders_data[folder] = metrics

        snapshots.append({
            'hash': commit['hash'],
            'date': commit['date'],
            'summary': commit['summary'],
            'folders': folders_data,
        })

    # Compute class changes for target folder
    print('Computing class changes ...')
    class_changes = compute_class_changes(snapshots, TARGET_FOLDER)

    # Compute duplicates for each pair
    print('Computing duplicates ...')
    duplicate_pairs = []

    compare_folders = [COMPARE_FOLDER] + EXTRA_FOLDERS
    for cf in compare_folders:
        result = compute_duplicates(snapshots, TARGET_FOLDER, cf)
        if result:
            duplicate_pairs.append(result)

    # Strip class_list from snapshot data for HTML (too large for embedding)
    for snap in snapshots:
        for folder in snap['folders']:
            snap['folders'][folder].pop('class_list', None)

    # Generate HTML
    print('Generating HTML report ...')
    config = {
        'repo_path': REPO_PATH,
        'target_folder': TARGET_FOLDER,
        'compare_folder': COMPARE_FOLDER,
        'extra_folders': EXTRA_FOLDERS,
    }
    html_content = build_html(snapshots, class_changes, duplicate_pairs, config)

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), OUTPUT_FILE)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f'Report written to: {output_path}')
    webbrowser.open(f'file://{output_path}')


if __name__ == '__main__':
    main()
