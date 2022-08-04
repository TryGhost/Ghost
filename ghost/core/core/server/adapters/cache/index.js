const adapterManager = require('../../services/adapter-manager');

/**
 * @param {'settings'|'theme'|'urls'} [feature] - name for the "feature" to enable through adapter, e.g.: settings cache
 * @returns {Object} cache adapter instance
 */
function getCache(feature) {
    let adapterName = 'cache';

    if (feature) {
        adapterName += `:${feature}`;
    }

    return adapterManager.getAdapter(adapterName);
}

module.exports.getCache = getCache;
