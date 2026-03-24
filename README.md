# Refactor Progress Visualizer

A Python script that analyzes a local git repo and generates a self-contained HTML report tracking Java/Kotlin refactoring progress.

## What it does

- Walks commits from a chosen starting point to HEAD
- Counts lines of code, classes, and files (Java vs Kotlin) in configured folders
- Tracks class additions and removals between commits
- Detects duplicate class names across folder pairs
- Outputs a single `report.html` file — open it directly in any browser

## Requirements

- Python 3.6+
- Git
- A local clone of the repo to analyze

## Setup

Edit the configuration constants at the top of `generate.py`:

```python
REPO_PATH = os.path.expanduser('~/Documents/MapGears/optimus')
TARGET_FOLDER = 'development/androidSystem/sharedLibs/ondagocommon'
COMPARE_FOLDER = 'development/androidSystem/sharedLibs/sharedMobile'
EXTRA_FOLDERS = ['development/androidSystem/androidProduction/ondagoAndroidApp']
```

## Usage

```bash
python3 generate.py
```

The script will show recent commits and prompt you to pick the farthest one from HEAD to start analysis from. You can enter a number, a commit hash, or press Enter for the oldest shown.

Once complete, open `report.html` in any browser.

## Report sections

- **Summary Cards** — total lines, classes, files with Java/Kotlin breakdown and deltas
- **Language Breakdown** — Java vs Kotlin percentage bar
- **Trends** — bar charts showing lines, classes, and files over time
- **Class Changes** — expandable list of commits with added/removed classes
- **Duplicate Classes** — classes with the same name across folder pairs, with search and trend

## No dependencies

The script uses only the Python standard library. The generated HTML is fully self-contained with inline CSS and JavaScript.
