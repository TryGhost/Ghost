const crypto = require('crypto');
const fs = require('fs');

/**
 * Asset Hash Service
 *
 * Provides SHA256-based hashing for theme asset files.
 * Hashes are cached in memory and invalidated when file mtime changes.
 */

// Hash length: 16 hex characters (64 bits) for low collision probability
// This is longer than the legacy 10-char global hash, making it easy to distinguish
const HASH_LENGTH = 16;

// Cache structure: { filePath: { hash: string, mtimeMs: number } }
const hashCache = new Map();

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
        const hash = crypto.createHash('sha256')
            .update(content)
            .digest('hex')
            .substring(0, HASH_LENGTH);

        // Cache the result
        hashCache.set(filePath, {hash, mtimeMs});

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
 * Clear all cached hashes
 * Should be called when theme is changed/remounted
 */
function clearCache() {
    hashCache.clear();
}

/**
 * Get the number of cached entries (useful for debugging/testing)
 * @returns {number}
 */
function getCacheSize() {
    return hashCache.size;
}

module.exports = {
    getHashForFile,
    clearCache,
    getCacheSize
};
