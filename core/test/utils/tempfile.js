/**
 * Dependencies
 */

var join = require('path').join,

    TMP_DIR = require('os').tmpdir();

/**
 * Generate a temporary file path
 */

function tempfile() {
    var randomString = Math.random().toString(36).substring(7);

    return join(TMP_DIR, randomString);
}

/**
 * Expose `tempfile`
 */

module.exports = tempfile;
