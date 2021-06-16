const path = require('path');

const isPrivacyDisabled = function isPrivacyDisabled(privacyFlag) {
    if (!this.get('privacy')) {
        return false;
    }

    // CASE: disable all privacy features
    if (this.get('privacy').useTinfoil === true) {
        // CASE: you can still enable single features
        if (this.get('privacy')[privacyFlag] === true) {
            return false;
        }

        return true;
    }

    return this.get('privacy')[privacyFlag] === false;
};

/**
 * we can later support setting folder names via custom config values
 */
const getContentPath = function getContentPath(type) {
    switch (type) {
    case 'images':
        return path.join(this.get('paths:contentPath'), 'images/');
    case 'themes':
        return path.join(this.get('paths:contentPath'), 'themes/');
    case 'adapters':
        return path.join(this.get('paths:contentPath'), 'adapters/');
    case 'logs':
        return path.join(this.get('paths:contentPath'), 'logs/');
    case 'data':
        return path.join(this.get('paths:contentPath'), 'data/');
    case 'settings':
        return path.join(this.get('paths:contentPath'), 'settings/');
    default:
        // new Error is allowed here, as we do not want config to depend on @tryghost/error
        // @TODO: revisit this decision when @tryghost/error is no longer dependent on all of ghost-ignition
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('getContentPath was called with: ' + type);
    }
};

module.exports = {
    isPrivacyDisabled,
    getContentPath
};
