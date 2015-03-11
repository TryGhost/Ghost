var errors  = require('../errors'),
    config  = require('../config'),
    storage = {};

function getStorage(storageChoice) {
    var storagePath,
        storageConfig;

    storageChoice = config.get('storage:active');
    storagePath = config.get('paths:storage');
    storageConfig = config.get('storage')[storageChoice];

    if (storage[storageChoice]) {
        return storage[storageChoice];
    }

    try {
        // TODO: determine if storage has all the necessary methods.
        storage[storageChoice] = require(storagePath);
    } catch (e) {
        errors.logError(e);
    }

    // Instantiate and cache the storage module instance.
    storage[storageChoice] = new storage[storageChoice](storageConfig);

    return storage[storageChoice];
}

module.exports.getStorage = getStorage;
