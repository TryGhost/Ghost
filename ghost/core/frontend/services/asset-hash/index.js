const crypto = require('crypto');
const fs = require('fs');
const config = require('../../../shared/config');

/**
 * Asset Hash Service
 *
 * Provides SHA256-based hashing for theme asset files, plus the global fallback
 * hash used for assets we can't hash by content.
 *
 * Hashes are cached in memory and invalidated when file mtime changes.
 */

// Hash length: 16 base64url characters (96 bits) for low collision probability
// base64url encoding provides more entropy per character than hex (64 vs 16 chars)
// This is longer than the legacy 10-char global hash, making it easy to distinguish
const HASH_LENGTH = 16;

// The global hash keeps its legacy 10-char hex length so existing asset URLs are unchanged
const GLOBAL_HASH_LENGTH = 10;

// Cache structure: { filePath: { hash: string, mtimeMs: number } }
const hashCache = new Map();

// Lazily generated once per boot, and reset whenever the caches are cleared
let globalHash = null;

/**
 * Calculate SHA256 hash of a file's contents
 * @param {string} filePath - Absolute path to the file
 * @returns {string|null} - First 16 characters of SHA256 hash, or null if file doesn't exist
 */
function getHashForFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const mtimeMs = stat.mtimeMs;

    // Check cache
    const cached = hashCache.get(filePath);
    if (cached && cached.mtimeMs === mtimeMs) {
      return cached.hash;
    }

    // Read file and compute hash
    const content = fs.readFileSync(filePath);
    const hash = crypto
      .createHash('sha256')
      .update(content)
      .digest('base64url')
      .substring(0, HASH_LENGTH);

    // Clear cache if it exceeds the size limit (safeguard against bugs)
    const maxSize = config.get('caching:assets:contentBasedHash:maxSize');
    if (hashCache.size >= maxSize) {
      hashCache.clear();
    }

    // Cache the result
    hashCache.set(filePath, { hash, mtimeMs });

    return hash;
  } catch (err) {
    // File doesn't exist or can't be read
    if (err.code === 'ENOENT' || err.code === 'EACCES') {
      return null;
    }
    throw err;
  }
}

/**
 * Get the global fallback hash, used for assets whose contents we can't hash -
 * a missing file, or content-based hashing being turned off.
 *
 * Generated lazily on first use rather than at boot, so that nothing pays for it
 * on a site that never falls back.
 * @returns {string} - 10 character hex hash
 */
function getGlobalHash() {
  if (!globalHash) {
    globalHash = crypto
      .createHash('md5')
      .update(Date.now().toString())
      .digest('hex')
      .substring(0, GLOBAL_HASH_LENGTH);
  }

  return globalHash;
}

/**
 * Clear all cached hashes, including the global fallback hash
 * Should be called when theme is changed/remounted
 */
function clearCache() {
  hashCache.clear();
  globalHash = null;
}

module.exports = {
  getHashForFile,
  getGlobalHash,
  clearCache,
};
