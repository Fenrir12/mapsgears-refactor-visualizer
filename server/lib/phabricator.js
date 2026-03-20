const https = require('https');
const http = require('http');
const { URL } = require('url');

class PhabricatorClient {
  constructor(baseUrl, apiToken) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiToken = apiToken;
  }

  async callConduit(method, params = {}) {
    // baseUrl may already end with /api/ or not
    const base = this.baseUrl.replace(/\/api\/?$/, '');
    const url = `${base}/api/${method}`;
    const body = new URLSearchParams({
      'api.token': this.apiToken,
      ...this._flattenParams(params),
    });

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const transport = parsedUrl.protocol === 'https:' ? https : http;

      const req = transport.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error_code) {
              reject(new Error(`Conduit error [${parsed.error_code}]: ${parsed.error_info}`));
            } else {
              resolve(parsed.result);
            }
          } catch (e) {
            reject(new Error(`Failed to parse Conduit response: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(body.toString());
      req.end();
    });
  }

  _flattenParams(params, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(params)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(result, this._flattenParams(value, fullKey));
      } else if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (typeof item === 'object') {
            Object.assign(result, this._flattenParams(item, `${fullKey}[${i}]`));
          } else {
            result[`${fullKey}[${i}]`] = String(item);
          }
        });
      } else {
        result[fullKey] = String(value);
      }
    }
    return result;
  }

  // Phabricator fileType constants
  static FILE_TYPE_FILE = 7;
  static FILE_TYPE_DIR = 4;

  /**
   * Browse a directory in the repository at a given commit.
   * Returns list of file paths.
   */
  async browseDirectory(callsign, path, commit = 'master') {
    const result = await this.callConduit('diffusion.browsequery', {
      callsign,
      path,
      commit,
    });
    if (!result || !result.paths) return [];
    return result.paths
      .filter((p) => Number(p.fileType) === PhabricatorClient.FILE_TYPE_FILE)
      .map((p) => p.fullPath);
  }

  /**
   * Get file content at a given commit.
   * Phabricator returns a filePHID which must be downloaded separately.
   */
  async getFileContent(callsign, path, commit = 'master') {
    const result = await this.callConduit('diffusion.filecontentquery', {
      callsign,
      path,
      commit,
    });
    if (!result || !result.filePHID) return '';

    // Download actual content via file.download
    const fileData = await this.callConduit('file.download', {
      phid: result.filePHID,
    });
    if (!fileData) return '';
    return Buffer.from(fileData, 'base64').toString('utf-8');
  }

  /**
   * Get commit history for a path.
   * Returns array of { commitHash, commitDate, summary }.
   */
  async getHistory(callsign, path, limit = 100) {
    const result = await this.callConduit('diffusion.historyquery', {
      callsign,
      path,
      commit: 'master',
      limit,
    });
    if (!result || !result.pathChanges) return [];
    return result.pathChanges.map((change) => ({
      commitHash: change.commitIdentifier,
      commitDate: new Date(Number(change.commit.epoch) * 1000).toISOString(),
      summary: change.commit.summary || '',
    }));
  }

  /**
   * Recursively list all files under a directory at a commit.
   */
  async listFilesRecursive(callsign, basePath, commit = 'master') {
    const allFiles = [];

    const browse = async (dirPath) => {
      const result = await this.callConduit('diffusion.browsequery', {
        callsign,
        path: dirPath,
        commit,
      });
      if (!result || !result.paths) return;

      for (const entry of result.paths) {
        const ft = Number(entry.fileType);
        if (ft === PhabricatorClient.FILE_TYPE_FILE) {
          allFiles.push(entry.fullPath);
        } else if (ft === PhabricatorClient.FILE_TYPE_DIR) {
          await browse(entry.fullPath);
        }
      }
    };

    await browse(basePath);
    return allFiles;
  }
}

module.exports = PhabricatorClient;
