var config = require('../../config'),
    utils = require('../../utils');

function getAssetUrl(path, isAdmin, minify) {
    var output = '';

    output += utils.url.getSubdir() + '/';

    if (!path.match(/^favicon\.ico$/) && !path.match(/^shared/) && !path.match(/^asset/)) {
        if (isAdmin) {
            output += 'ghost/';
        } else {
            output += 'assets/';
        }
    }

    // Get rid of any leading slash on the path
    path = path.replace(/^\//, '');

    // replace ".foo" with ".min.foo" in production
    if (minify) {
        path = path.replace(/\.([^\.]*)$/, '.min.$1');
    }

    output += path;

    if (!path.match(/^favicon\.ico$/)) {
        output = output + '?v=' + config.assetHash;
    }

    return output;
}

module.exports = getAssetUrl;
