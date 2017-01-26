var config = require('../../config'),
    utils = require('../../utils');

function getAssetUrl(path, isAdmin, minify) {
    var output = '';

    output += utils.url.urlJoin(utils.url.getSubdir(), '/');

    if (!path.match(/^favicon\.(ico|png)$/) && !path.match(/^shared/) && !path.match(/^asset/)) {
        if (isAdmin) {
            output = utils.url.urlJoin(output, 'ghost/');
        }

        output = utils.url.urlJoin(output, 'assets/');
    }
    // Serve either uploaded favicon or default
    // for favicon, we don't care anymore about the `/` leading slash, as don't support theme favicons
    if (path.match(/\/?favicon\.(ico|png)$/)) {
        if (isAdmin) {
            output = utils.url.urlJoin(utils.url.getSubdir(), '/favicon.ico');
        } else {
            output = config.get('theme:icon') ? utils.url.urlJoin(utils.url.getSubdir(), utils.url.urlFor('image', {image: config.get('theme:icon')})) : utils.url.urlJoin(utils.url.getSubdir(), '/favicon.ico');
        }
    }
    // Get rid of any leading slash on the path
    path = path.replace(/^\//, '');

    // replace ".foo" with ".min.foo" in production
    if (minify) {
        path = path.replace(/\.([^\.]*)$/, '.min.$1');
    }

    if (!path.match(/^favicon\.(ico|png)$/)) {
        // we don't want to concat the path with our favicon url
        output += path;

        if (!config.get('assetHash')) {
            config.set('assetHash', utils.generateAssetHash());
        }

        output = output + '?v=' + config.get('assetHash');
    }

    return output;
}

module.exports = getAssetUrl;
