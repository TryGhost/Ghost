const Promise = require('bluebird');
const extract = require('extract-zip');
const zipFolder = require('./lib/zip-folder');

module.exports = {
    zipFolder: Promise.promisify(zipFolder),
    extract: Promise.promisify(extract)
};
