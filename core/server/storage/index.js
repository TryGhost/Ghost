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
