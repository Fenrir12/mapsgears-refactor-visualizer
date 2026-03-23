const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_BUFFER = 10 * 1024 * 1024; // 10MB
const EXEC_TIMEOUT = 60_000; // 60s
const CLONE_TIMEOUT = 300_000; // 5min for initial clone

class GitClient {
  /**
   * @param {Object} opts
   * @param {string} opts.phabUrl   - Phabricator base URL (e.g. https://phab.example.com/api/)
   * @param {string} opts.apiToken  - Phabricator API token (used as git HTTP password)
   * @param {string} opts.callsign  - Repository callsign in Phabricator
   * @param {string} opts.repoDir   - Local directory to clone into
   * @param {string} [opts.gitCloneUrl] - Explicit git clone URL (overrides derived URL)
   */
  constructor({ phabUrl, apiToken, callsign, repoDir, gitCloneUrl }) {
    this.apiToken = apiToken;
    this.callsign = callsign;
    this.repoDir = repoDir;

    if (gitCloneUrl) {
      this.cloneUrl = this._injectAuth(gitCloneUrl, apiToken);
    } else {
      // Derive clone URL from Phabricator base URL
      const base = phabUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      this.cloneUrl = `${base}/diffusion/${callsign}/repo.git`;
      this.cloneUrl = this._injectAuth(this.cloneUrl, apiToken);
    }
  }

  /**
   * Inject API token as password into an HTTPS URL.
   * https://phab.example.com/... → https://git:TOKEN@phab.example.com/...
   */
  _injectAuth(url, token) {
    const parsed = new URL(url);
    parsed.username = 'git';
    parsed.password = token;
    return parsed.toString();
  }

  /**
   * Run a git command and return stdout.
   */
  _exec(args, { timeout = EXEC_TIMEOUT, maxBuffer = MAX_BUFFER } = {}) {
    return new Promise((resolve, reject) => {
      execFile('git', args, {
        cwd: this.repoDir,
        timeout,
        maxBuffer,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      }, (err, stdout, stderr) => {
        if (err) {
          // Sanitize token from error messages
          const safeMsg = (err.message || '').replace(this.apiToken, '***');
          const safeSterr = (stderr || '').replace(this.apiToken, '***');
          reject(new Error(`git ${args[0]} failed: ${safeMsg} ${safeSterr}`.trim()));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Clone the repo if not present, otherwise fetch latest.
   * Retries once on failure.
   */
  async ensureRepo() {
    const gitDir = path.join(this.repoDir, '.git');

    if (fs.existsSync(gitDir)) {
      console.log('[git] Fetching latest changes...');
      try {
        await this._exec(['fetch', 'origin'], { timeout: CLONE_TIMEOUT });
        // Update local master/main to match origin
        await this._exec(['remote', 'set-head', 'origin', '--auto']);
        console.log('[git] Fetch complete.');
      } catch (err) {
        console.warn(`[git] Fetch failed: ${err.message}. Will retry...`);
        await this._sleep(5000);
        await this._exec(['fetch', 'origin'], { timeout: CLONE_TIMEOUT });
        console.log('[git] Fetch complete on retry.');
      }
      return;
    }

    // Clone (treeless — full history, blobs fetched on demand)
    console.log(`[git] Cloning repo into ${this.repoDir}...`);
    fs.mkdirSync(this.repoDir, { recursive: true });

    const cloneArgs = [
      'clone',
      '--filter=blob:none',
      '--no-checkout',
      this.cloneUrl,
      this.repoDir,
    ];

    try {
      await new Promise((resolve, reject) => {
        execFile('git', cloneArgs, {
          timeout: CLONE_TIMEOUT,
          maxBuffer: MAX_BUFFER,
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        }, (err, stdout, stderr) => {
          if (err) {
            const safeMsg = (err.message || '').replace(this.apiToken, '***');
            reject(new Error(`git clone failed: ${safeMsg}`));
          } else {
            resolve(stdout);
          }
        });
      });
    } catch (err) {
      console.warn(`[git] Clone failed: ${err.message}. Retrying in 5s...`);
      await this._sleep(5000);
      // Clean up partial clone
      fs.rmSync(this.repoDir, { recursive: true, force: true });
      fs.mkdirSync(this.repoDir, { recursive: true });
      await new Promise((resolve, reject) => {
        execFile('git', cloneArgs, {
          timeout: CLONE_TIMEOUT,
          maxBuffer: MAX_BUFFER,
          env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        }, (err, stdout, stderr) => {
          if (err) {
            const safeMsg = (err.message || '').replace(this.apiToken, '***');
            reject(new Error(`git clone failed on retry: ${safeMsg}`));
          } else {
            resolve(stdout);
          }
        });
      });
    }

    console.log('[git] Clone complete.');
  }

  /**
   * Get commit history for a folder.
   * Returns array of { commitHash, commitDate, summary } matching PhabricatorClient.getHistory().
   */
  async getHistory(folderPath, limit = 100) {
    // Use null byte separator to avoid conflicts with pipe in commit messages
    const format = '%H%x00%aI%x00%s';
    const stdout = await this._exec([
      'log',
      `--format=${format}`,
      `--max-count=${limit}`,
      '--', folderPath,
    ]);

    if (!stdout.trim()) return [];

    return stdout.trim().split('\n').map((line) => {
      const [commitHash, commitDate, ...summaryParts] = line.split('\0');
      return {
        commitHash,
        commitDate,
        summary: summaryParts.join('\0'), // rejoin in case summary has null bytes (unlikely)
      };
    });
  }

  /**
   * List all files under a folder at a given commit.
   * Returns array of file paths (relative to repo root).
   */
  async listFiles(folderPath, commitHash) {
    const stdout = await this._exec([
      'ls-tree', '-r', '--name-only',
      commitHash,
      '--', folderPath,
    ]);

    if (!stdout.trim()) return [];
    return stdout.trim().split('\n');
  }

  /**
   * Get file content at a given commit.
   * Returns UTF-8 string.
   */
  async getFileContent(filePath, commitHash) {
    const stdout = await this._exec([
      'show', `${commitHash}:${filePath}`,
    ]);
    return stdout;
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = GitClient;
