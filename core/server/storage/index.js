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

    var storageChoice = config.get('storage').active[type],
        storageConfig;

    // CASE: we only allow local-file-storage for themes
    // @TODO: https://github.com/TryGhost/Ghost/issues/7246
    if (type === 'themes') {
        storageChoice = 'local-file-store';
    }

    storageConfig = config.get('storage')[storageChoice];

    // CASE: type does not exist
    if (!storageChoice) {
        throw new errors.IncorrectUsageError({
            message: 'No adapter found for type: ' + type
        });
    }

    // cache?
    if (storage[storageChoice]) {
        return storage[storageChoice];
    }

    // CASE: load adapter from custom path  (.../content/storage)
    try {
        storage[storageChoice] = require(config.getContentPath('storage') + storageChoice);
    } catch (err) {
        // CASE: only throw error if module does exist
        if (err.code !== 'MODULE_NOT_FOUND') {
            throw new errors.IncorrectUsageError({err: err});
        }
        // CASE: if module not found it can be an error within the adapter (cannot find bluebird for example)
        else if (err.code === 'MODULE_NOT_FOUND' && err.message.indexOf(config.getContentPath('storage') + storageChoice) === -1) {
            throw new errors.IncorrectUsageError({err: err});
        }
    }

    // CASE: either storage[storageChoice] is already set or why check for in the default storage path
    try {
        storage[storageChoice] = storage[storageChoice] || require(config.get('paths').internalStoragePath + storageChoice);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw new errors.IncorrectUsageError({
                err: err,
                context: 'We cannot find your adapter in: ' + config.getContentPath('storage') + ' or: ' + config.get('paths').internalStoragePath
            });
        } else {
            throw new errors.IncorrectUsageError({err: err});
        }
    }

    storage[storageChoice] = new storage[storageChoice](storageConfig);

    if (!(storage[storageChoice] instanceof Base)) {
        throw new errors.IncorrectUsageError({message: 'Your storage adapter does not inherit from the Storage Base.'});
    }

    if (!storage[storageChoice].requiredFns) {
        throw new errors.IncorrectUsageError({message:'Your storage adapter does not provide the minimum required functions.'});
    }

    if (_.xor(storage[storageChoice].requiredFns, Object.keys(_.pick(Object.getPrototypeOf(storage[storageChoice]), storage[storageChoice].requiredFns))).length) {
        throw new errors.IncorrectUsageError({message:'Your storage adapter does not provide the minimum required functions.'});
    }

    return storage[storageChoice];
}

module.exports.getStorage = getStorage;
