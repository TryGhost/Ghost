var path = require('path'),
    _ = require('lodash');

exports.isPrivacyDisabled = function isPrivacyDisabled(privacyFlag) {
    if (!this.get('privacy')) {
        return false;
    }

    if (this.get('privacy').useTinfoil === true) {
        return true;
    }

    return this.get('privacy')[privacyFlag] === false;
};

/**
 * transform all relative paths to absolute paths
 * @TODO: imagesRelPath is a dirty little attribute (especially when looking at the usages)
 */
exports.makePathsAbsolute = function makePathsAbsolute(paths, parent) {
    var self = this;

    if (!paths && !parent) {
        paths = this.get('paths');
        parent = 'paths';
    }

    _.each(paths, function (configValue, pathsKey) {
        if (_.isObject(configValue)) {
            makePathsAbsolute.bind(self)(configValue, parent + ':' + pathsKey);
        } else {
            if (configValue[0] !== '/' && pathsKey !== 'imagesRelPath') {
                self.set(parent + ':' + pathsKey, path.join(__dirname + '/../../../', configValue));
            }
        }
    });
};

/**
 * we can later support setting folder names via custom config values
 */
exports.getContentPath = function getContentPath(type) {
    switch (type) {
        case 'storage':
            return path.join(this.get('paths:contentPath'), 'storage/');
        case 'images':
            return path.join(this.get('paths:contentPath'), 'images/');
        case 'apps':
            return path.join(this.get('paths:contentPath'), 'apps/');
        case 'themes':
            return path.join(this.get('paths:contentPath'), 'themes/');
        case 'scheduling':
            return path.join(this.get('paths:contentPath'), 'scheduling/');
        default:
            throw new Error('getContentPath was called with: ' + type);
    }
};
