const _ = require('lodash'),
    StorageBase = require('ghost-storage-base'),
    config = require('../../config'),
    common = require('../../lib/common'),
    storage = {};

/**
 * type: images
 */
function getStorage() {
    const storageChoice = config.get('storage:active');
    let storageConfig,
        CustomStorage,
        customStorage;

    storageConfig = config.get('storage')[storageChoice];

    // CASE: type does not exist
    if (!storageChoice) {
        throw new common.errors.IncorrectUsageError({
            message: 'No adapter found'
        });
    }

    // CASE: cached
    if (storage[storageChoice]) {
        return storage[storageChoice];
    }

    // CASE: load adapter from custom path  (.../content/storage)
    try {
        CustomStorage = require(`${config.getContentPath('storage')}${storageChoice}`);
    } catch (err) {
        if (err.message.match(/strict mode/gi)) {
            throw new common.errors.IncorrectUsageError({
                message: 'Your custom storage adapter must use strict mode.',
                help: 'Add \'use strict\'; on top of your adapter.',
                err: err
            });
            // CASE: if module not found it can be an error within the adapter (cannot find bluebird for example)
        } else if (err.code === 'MODULE_NOT_FOUND' && err.message.indexOf(`${config.getContentPath('storage')}${storageChoice}`) === -1) {
            throw new common.errors.IncorrectUsageError({
                message: 'We have detected an error in your custom storage adapter.',
                err
            });
            // CASE: only throw error if module does exist
        } else if (err.code !== 'MODULE_NOT_FOUND') {
            throw new common.errors.IncorrectUsageError({
                message: 'We have detected an unknown error in your custom storage adapter.',
                err
            });
        }
    }

    // CASE: check in the default storage path
    try {
        CustomStorage = CustomStorage || require(`${config.get('paths').internalStoragePath}${storageChoice}`);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw new common.errors.IncorrectUsageError({
                err,
                context: `We cannot find your adapter in: ${config.getContentPath('storage')} or: ${config.get('paths').internalStoragePath}`
            });
        } else {
            throw new common.errors.IncorrectUsageError({
                message: 'We have detected an error in your custom storage adapter.',
                err
            });
        }
    }

    customStorage = new CustomStorage(storageConfig);

    // CASE: if multiple StorageBase modules are installed, instanceof could return false
    if (Object.getPrototypeOf(CustomStorage).name !== StorageBase.name) {
        throw new common.errors.IncorrectUsageError({
            message: 'Your storage adapter does not inherit from the Storage Base.'
        });
    }

    if (!customStorage.requiredFns) {
        throw new common.errors.IncorrectUsageError({
            message: 'Your storage adapter does not provide the minimum required functions.'
        });
    }

    if (_.xor(customStorage.requiredFns, Object.keys(_.pick(Object.getPrototypeOf(customStorage), customStorage.requiredFns))).length) {
        throw new common.errors.IncorrectUsageError({
            message: 'Your storage adapter does not provide the minimum required functions.'
        });
    }

    storage[storageChoice] = customStorage;
    return storage[storageChoice];
}

module.exports.getStorage = getStorage;
