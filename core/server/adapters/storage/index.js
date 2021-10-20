const adapterManager = require('../../services/adapter-manager');

/**
 * @param {'images'|'videos'|'audios'} [feature] - name for the "feature" to enable through adapter, e.g.: images or videos storage
 * @returns {Object} adapter instance
 */
function getStorage(feature) {
    let adapterName = 'storage';

    if (feature) {
        adapterName += `:${feature}`;
    }

    return adapterManager.getAdapter(adapterName);
}

module.exports.getStorage = getStorage;
