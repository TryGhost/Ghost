var config = require('../../config'),
    utils = require('../../utils');

function getAssetUrl(path, isAdmin, minify) {
    var output = '';

    output += utils.url.urlJoin(utils.url.getSubdir(), '/');

    if (!path.match(/^favicon\.ico$/) && !path.match(/^shared/) && !path.match(/^asset/)) {
        if (isAdmin) {
            output = utils.url.urlJoin(output, 'ghost/');
        }

        output = utils.url.urlJoin(output, 'assets/');
    }

    // Get rid of any leading slash on the path
    path = path.replace(/^\//, '');

    // replace ".foo" with ".min.foo" in production
    if (minify) {
        path = path.replace(/\.([^\.]*)$/, '.min.$1');
    }

    output += path;

    if (!path.match(/^favicon\.ico$/)) {
        if (!config.get('assetHash')) {
            config.set('assetHash', utils.generateAssetHash());
        }

        output = output + '?v=' + config.get('assetHash');
    }

    return output;
}

module.exports = getAssetUrl;
