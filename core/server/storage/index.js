var errors = require('../errors'),
    config = require('../config'),
    storage = {};

/**
 * type: images|themes
 */
function getStorage(type) {
    type = type || 'images';

    var storageChoice = config.storage.active[type],
        storageConfig = config.storage[storageChoice];

    // CASE: type does not exist
    if (!storageChoice) {
        throw new errors.IncorrectUsage('No adapter found for type: ' + type);
    }

    // cache?
    if (storage[storageChoice]) {
        return storage[storageChoice];
    }

    // CASE: load adapter from custom path  (.../content/storage)
    // CASE: load adapter from default path (.../server/storage)
    try {
        storage[storageChoice] = require(config.paths.storagePath.custom + storageChoice);
    } catch (err1) {
        try {
            storage[storageChoice] = require(config.paths.storagePath.default + storageChoice);
        } catch (err2) {
            throw err2;
        }
    }

    // TODO: determine if storage has all the necessary methods.
    // Instantiate and cache the storage module instance.
    storage[storageChoice] = new storage[storageChoice](storageConfig);

    return storage[storageChoice];
}

module.exports.getStorage = getStorage;
