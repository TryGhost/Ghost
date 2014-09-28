var errors  = require('../errors'),
    config  = require('../config'),
    storage = {};

function getStorage(storageChoice) {
    storageChoice = config.storage ? config.storage.type : 'local-file-store';

    if (storage[storageChoice]) {
        return storage[storageChoice];
    }

    try {
        // TODO: determine if storage has all the necessary methods.
        storage[storageChoice] = require('./' + storageChoice);
    } catch (e) {
        errors.logError(e);
    }

    // Instantiate and cache the storage module instance.
    storage[storageChoice] = new storage[storageChoice]();

    return storage[storageChoice];
}

module.exports.getStorage = getStorage;
