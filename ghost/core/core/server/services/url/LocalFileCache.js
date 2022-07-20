const fs = require('fs-extra');
const path = require('path');

class LocalFileCache {
    /**
     * @param {Object} options
     * @param {String} options.storagePath - cached storage path
     * @param {Boolean} options.writeDisabled - controls if cache can write
     */
    constructor({storagePath, writeDisabled}) {
        const urlsStoragePath = path.join(storagePath, 'urls.json');
        const resourcesCachePath = path.join(storagePath, 'resources.json');

        this.storagePaths = {
            urls: urlsStoragePath,
            resources: resourcesCachePath
        };
        this.writeDisabled = writeDisabled;
    }

    /**
     * Handles reading and parsing JSON from the filesystem.
     * In case the file is corrupted or does not exist, returns null.
     * @param {String} filePath path to read from
     * @returns {Promise<Object>}
     * @private
     */
    async readCacheFile(filePath) {
        let cacheExists = false;
        let cacheData = null;

        try {
            await fs.stat(filePath);
            cacheExists = true;
        } catch (e) {
            cacheExists = false;
        }

        if (cacheExists) {
            try {
                const cacheFile = await fs.readFile(filePath, 'utf8');
                cacheData = JSON.parse(cacheFile);
            } catch (e) {
                //noop as we'd start a long boot process if there are any errors in the file
            }
        }

        return cacheData;
    }

    /**
     *
     * @param {'urls'|'resources'} type
     * @returns {Promise<Object>}
     */
    async read(type) {
        return await this.readCacheFile(this.storagePaths[type]);
    }

    /**
     *
     * @param {'urls'|'resources'} type of data to persist
     * @param {Object} data - data to be persisted
     * @returns {Promise<Object>}
     */
    async write(type, data) {
        if (this.writeDisabled) {
            return null;
        }

        return fs.writeFile(this.storagePaths[type], JSON.stringify(data, null, 4));
    }
}

module.exports = LocalFileCache;
