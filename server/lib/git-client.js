const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_BUFFER = 10 * 1024 * 1024; // 10MB
const EXEC_TIMEOUT = 60_000; // 60s
const CLONE_TIMEOUT = 300_000; // 5min for initial clone

// Git env that disables interactive prompts
const GIT_ENV = {
  GIT_TERMINAL_PROMPT: '0',
};

class GitClient {
  /**
   * @param {Object} opts
   * @param {string} opts.phabUrl   - Phabricator base URL
   * @param {string} opts.apiToken  - Phabricator API token
   * @param {string} opts.callsign  - Repository callsign in Phabricator
   * @param {string} opts.repoDir   - Local directory to clone into
   * @param {string} [opts.gitCloneUrl] - Explicit git clone URL
   * @param {string} [opts.gitCloneUser] - Git HTTP username
   * @param {string} [opts.gitClonePassword] - Git HTTP password
   */
  constructor({ phabUrl, apiToken, callsign, repoDir, gitCloneUrl, gitCloneUser, gitClonePassword }) {
    this.apiToken = apiToken;
    this.callsign = callsign;
    this.repoDir = repoDir;
    this._secrets = [apiToken, gitClonePassword].filter(Boolean);

    this.cloneUrl = gitCloneUrl
      || `${phabUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')}/diffusion/${callsign}/repo.git`;

    // Build env with credential helper if creds provided
    const envOverrides = { ...GIT_ENV };
    if (gitCloneUser && gitClonePassword) {
      const helper = `!f() { echo "username=${gitCloneUser}"; echo "password=${gitClonePassword}"; }; f`;
      envOverrides.GIT_CONFIG_COUNT = '1';
      envOverrides.GIT_CONFIG_KEY_0 = 'credential.helper';
      envOverrides.GIT_CONFIG_VALUE_0 = helper;
    }

    this._env = { ...process.env, ...envOverrides };
  }

  _exec(args, { timeout = EXEC_TIMEOUT, maxBuffer = MAX_BUFFER } = {}) {
    return new Promise((resolve, reject) => {
      execFile('git', args, {
        cwd: this.repoDir,
        timeout,
        maxBuffer,
        env: this._env,
      }, (err, stdout, stderr) => {
        if (err) {
          const safeMsg = this._sanitize(err.message || '');
          const safeSterr = this._sanitize(stderr || '');
          reject(new Error(`git ${args[0]} failed: ${safeMsg} ${safeSterr}`.trim()));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  _execNoCwd(args, { timeout = CLONE_TIMEOUT, maxBuffer = MAX_BUFFER } = {}) {
    return new Promise((resolve, reject) => {
      execFile('git', args, {
        timeout,
        maxBuffer,
        env: this._env,
      }, (err, stdout, stderr) => {
        if (err) {
          const safeMsg = this._sanitize(err.message || '');
          reject(new Error(`git ${args[0]} failed: ${safeMsg}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Shallow clone on first run, then pull new commits on subsequent runs.
   */
  async ensureRepo() {
    const gitDir = path.join(this.repoDir, '.git');

    if (fs.existsSync(gitDir)) {
      console.log('[git] Pulling latest changes...');
      try {
        await this._exec(['pull', '--ff-only'], { timeout: CLONE_TIMEOUT });
        console.log('[git] Pull complete.');
      } catch (err) {
        console.warn(`[git] Pull failed: ${err.message}. Will retry...`);
        await this._sleep(5000);
        await this._exec(['pull', '--ff-only'], { timeout: CLONE_TIMEOUT });
        console.log('[git] Pull complete on retry.');
      }
      return;
    }

    // Shallow clone — only latest commit + files
    console.log(`[git] Cloning repo (shallow) into ${this.repoDir}...`);
    fs.mkdirSync(this.repoDir, { recursive: true });

    const cloneArgs = [
      'clone',
      '--depth', '1',
      this.cloneUrl,
      this.repoDir,
    ];

    try {
      await this._execNoCwd(cloneArgs);
    } catch (err) {
      console.warn(`[git] Clone failed: ${err.message}. Retrying in 5s...`);
      await this._sleep(5000);
      fs.rmSync(this.repoDir, { recursive: true, force: true });
      fs.mkdirSync(this.repoDir, { recursive: true });
      await this._execNoCwd(cloneArgs);
    }

    console.log('[git] Clone complete.');
  }

  /**
   * Get the current HEAD commit info.
   * Returns { commitHash, commitDate, summary }.
   */
  async getHeadCommit() {
    const format = '%H%x00%aI%x00%s';
    const stdout = await this._exec([
      'log', '-1', `--format=${format}`,
    ]);

    if (!stdout.trim()) return null;

    const [commitHash, commitDate, ...summaryParts] = stdout.trim().split('\0');
    return {
      commitHash,
      commitDate,
      summary: summaryParts.join('\0'),
    };
  }

  /**
   * List all files under a folder at HEAD.
   * Returns array of file paths (relative to repo root).
   */
  async listFiles(folderPath) {
    const stdout = await this._exec([
      'ls-tree', '-r', '--name-only',
      'HEAD',
      '--', folderPath,
    ]);

    if (!stdout.trim()) return [];
    return stdout.trim().split('\n');
  }

  /**
   * Get file content at HEAD.
   * Returns UTF-8 string.
   */
  async getFileContent(filePath) {
    const stdout = await this._exec([
      'show', `HEAD:${filePath}`,
    ]);
    return stdout;
  }

  _sanitize(str) {
    let s = str;
    for (const secret of this._secrets) {
      s = s.replaceAll(secret, '***');
    }
    return s;
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = GitClient;
