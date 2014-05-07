var rack   = require('./asset-rack-ext'),
    config = require('../config'),
    path   = require('path'),
    url    = require('url'),
    fs     = require('fs-extra'),
    _      = require('underscore'),

    assets   = {},
    root     = config.paths().webroot,
    corePath = path.join(config.paths().appRoot, 'core'),
    oneYear  = 31536000000;

function isBlackListedFileType(file) {
    var blackListedFileTypes = ['.hbs', '.md', '.json', '.rb',
                                '.scss', '.coffee', '.less', '.scssc'];

    return !_.contains(blackListedFileTypes, file.ext);
}

// Theme Assets
assets.theme = new rack.ThemeAssets({
    urlPrefix: config.paths().webroot === '' ? '/' : config.paths().webroot,
    filter: isBlackListedFileType
});

assets.ghost = new rack.Rack([
    // Favicon
    new rack.StaticAsset({
        hash: false,
        url: root + '/favicon.ico',
        filename: path.join(corePath + '/shared/favicon.ico')
    }),
    // Shared Assets
    new rack.StaticAssets({
        urlPrefix: root + '/shared',
        dirname: path.join(corePath, 'shared'),
        filter: isBlackListedFileType
    }),
    // Built scripts
    new rack.StaticAssets({
        maxAge: oneYear,
        urlPrefix: root + '/ghost/scripts',
        dirname: path.join(corePath, '/built/scripts'),
        filter: isBlackListedFileType
    }),
    // Admin assets
    new rack.StaticAssets({
        urlPrefix: root + '/ghost',
        dirname: path.join(corePath, '/client/assets'),
        filter: isBlackListedFileType
    }),
    assets.theme
]);

assets.ghost.on('complete', function () {
    assets.ghost.deploy();
});

assets.url = function (path) {
    var combined_assets = _.compact(_.flatten(_.map(assets, function (asset) {
            return asset.assets;
        }))),
        asset = _.find(combined_assets, function (asset) {
            return asset.url === path;
        });

    if (asset) {
        return asset.specificUrl;
    }
};

module.exports = assets;