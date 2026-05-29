const adapterManager = require('../../services/adapter-manager');

/**
 * Get an email adapter instance
 *
 * @param {string} [feature] - Optional feature name for feature-specific adapter (e.g., 'transactional', 'bulk')
 * @returns {Object} Email adapter instance
 */
function getEmailAdapter(feature) {
    let adapterName = 'email';

    if (feature) {
        adapterName += `:${feature}`;
    }

    return adapterManager.getAdapter(adapterName);
}

module.exports = {
    getEmailAdapter
};
