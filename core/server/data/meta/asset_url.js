var config = require('../../config');

function getAssetUrl(context, isAdmin, minify) {
    var output = '';

    output += config.paths.subdir + '/';

    if (!context.match(/^favicon\.ico$/) && !context.match(/^shared/) && !context.match(/^asset/)) {
        if (isAdmin) {
            output += 'ghost/';
        } else {
            output += 'assets/';
        }
    }

    // Get rid of any leading slash on the context
    context = context.replace(/^\//, '');

    // replace ".foo" with ".min.foo" in production
    if (minify) {
        context = context.replace(/\.([^\.]*)$/, '.min.$1');
    }

    output += context;

    if (!context.match(/^favicon\.ico$/)) {
        output = output + '?v=' + config.assetHash;
    }

    return output;
}

module.exports = getAssetUrl;
