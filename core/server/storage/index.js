var errors = require('../errors'),
    config = require('../config'),
    Base = require('./base'),
    _ = require('lodash'),
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
    try {
        storage[storageChoice] = require(config.paths.storagePath.custom + storageChoice);
    } catch (err) {
        // CASE: only throw error if module does exist
        if (err.code !== 'MODULE_NOT_FOUND') {
            throw new errors.IncorrectUsage(err.message);
        }
        // CASE: if module not found it can be an error within the adapter (cannot find bluebird for example)
        else if (err.code === 'MODULE_NOT_FOUND' && err.message.indexOf(config.paths.storagePath.custom + storageChoice) === -1) {
            throw new errors.IncorrectUsage(err.message);
        }
    }

    // CASE: either storage[storageChoice] is already set or why check for in the default storage path
    try {
        storage[storageChoice] = storage[storageChoice] || require(config.paths.storagePath.default + storageChoice);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw new errors.IncorrectUsage('We cannot find your adpter in: ' + config.paths.storagePath.custom + ' or: ' + config.paths.storagePath.default);
        } else {
            throw new errors.IncorrectUsage(err.message);
        }
    }

    storage[storageChoice] = new storage[storageChoice](storageConfig);

    if (!(storage[storageChoice] instanceof Base)) {
        throw new errors.IncorrectUsage('Your storage adapter does not inherit from the Storage Base.');
    }

    if (!storage[storageChoice].requiredFns) {
        throw new errors.IncorrectUsage('Your storage adapter does not provide the minimum required functions.');
    }

    if (_.xor(storage[storageChoice].requiredFns, Object.keys(_.pick(Object.getPrototypeOf(storage[storageChoice]), storage[storageChoice].requiredFns))).length) {
        throw new errors.IncorrectUsage('Your storage adapter does not provide the minimum required functions.');
    }

    return storage[storageChoice];
}

module.exports.getStorage = getStorage;
