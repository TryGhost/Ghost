const adapterManager = require('../../services/adapter-manager');

function getStorage() {
    return adapterManager.getAdapter('storage');
}

module.exports.getStorage = getStorage;
