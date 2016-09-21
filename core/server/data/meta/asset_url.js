var config = require('../../config'),
    generateAssetHash = require('../../utils/asset-hash');

function getAssetUrl(path, isAdmin, minify) {
    var output = '';

    output += config.paths.subdir + '/';

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
        if (!config.assetHash) {
            config.set({assetHash: generateAssetHash()});
        }

        output = output + '?v=' + config.assetHash;
    }

    return output;
}

module.exports = getAssetUrl;
