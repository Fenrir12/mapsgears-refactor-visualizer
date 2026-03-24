"""
Thin wrapper around git subprocess calls for reading repo data.
All operations are read-only — no cloning, no pulling, no network.
"""

import subprocess


def _run(args, cwd):
    result = subprocess.run(
        ['git'] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"git {args[0]} failed: {result.stderr.strip()}")
    return result.stdout


def get_commits(repo_path, start_commit):
    """
    Get all commits from start_commit to HEAD (inclusive), oldest first.
    Returns list of dicts: {hash, date, summary}
    """
    # Get commits from start..HEAD (exclusive of start)
    fmt = '%H%x00%aI%x00%s'
    stdout = _run(
        ['log', '--reverse', f'--format={fmt}', f'{start_commit}..HEAD'],
        cwd=repo_path,
    )

    commits = []

    # Also get the start commit itself as baseline
    start_stdout = _run(
        ['log', '-1', f'--format={fmt}', start_commit],
        cwd=repo_path,
    )
    if start_stdout.strip():
        parts = start_stdout.strip().split('\0')
        commits.append({
            'hash': parts[0],
            'date': parts[1],
            'summary': parts[2] if len(parts) > 2 else '',
        })

    # Append the rest
    for line in stdout.strip().split('\n'):
        if not line.strip():
            continue
        parts = line.split('\0')
        commits.append({
            'hash': parts[0],
            'date': parts[1],
            'summary': parts[2] if len(parts) > 2 else '',
        })

    return commits


def list_files(repo_path, commit, folder):
    """
    List all files under a folder at a given commit.
    Returns list of file paths relative to repo root.
    """
    try:
        stdout = _run(
            ['ls-tree', '-r', '--name-only', commit, '--', folder],
            cwd=repo_path,
        )
    except RuntimeError:
        return []

    if not stdout.strip():
        return []
    return stdout.strip().split('\n')


def get_file_content(repo_path, commit, file_path):
    """
    Get file content at a specific commit.
    Returns UTF-8 string.
    """
    return _run(['show', f'{commit}:{file_path}'], cwd=repo_path)
