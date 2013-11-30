var _      = require('underscore'),
    rack   = require('asset-rack'),
    config = require('../config'),
    api    = require('../api'),
    fs     = require('fs-extra'),
    async  = require('async'),
    api    = require('../api'),
    when   = require('when'),
    path   = require('path'),

    root     = config.paths().webroot;

rack.Asset.prototype.constructor_without_host = rack.Asset.prototype.constructor;
rack.Asset.prototype.constructor = function (options) {
    // Enable hashing of asset-urls only in none development environments
    if (!options.hash) {
        this.hash = process.env.NODE_ENV !== 'development';
    }

    // If a asset host is configured set it as host name
    if (config().assets && config().assets.host) {
        this.hostname = config().assets.host;
    }

    this.constructor_without_host(options);
};

rack.Asset.prototype.checkUrl = function (url) {
    var url_with_host;

    if (this.hostname) {
        url_with_host = '//' + this.hostname + url;
    }

    return url === this.specificUrl || url_with_host === this.specificUrl || url === this.url;
};

rack.Asset.prototype.reload = function () {
    var that = this;

    // Clear out old assets from an associated rack
    if (this.rack && this.assets) {
        this.rack.completed = false;
        _.each(this.assets, function (asset) {
            var removable_asset = _.find(that.rack.assets, function (rack_asset) {
                return rack_asset.filename === asset.filename;
            });
            return that.rack.assets.splice(that.rack.assets.indexOf(removable_asset));
        });
    }

    // Reset asset
    this.completed = false;
    this.assets = [];
    this.on('complete', function () {
        if (this.rack) {
            _.each(this.assets, function (asset) {
                return that.rack.assets.push(asset);
            });
            this.rack.emit('complete');
        }
    });

    // trigger actual reloading of the asset's assets
    this.emit('start');
};

rack.Rack.prototype.deploy_to_cdn = rack.Rack.prototype.deploy;
rack.Rack.prototype.deploy = function () {
    if (!config().assets) {
        return;
    }

    var options = {};

    if (config().assets.provider) {
        options.provider  = config().assets.provider;
        options.container = config().assets.container;
        options.keyId = config().assets.accessKey;
        options.key   = config().assets.secretKey;

        this.deploy_to_cdn(options);
    }

    if (config().assets.dirname) {
        options.dirname = config().assets.dirname;

        this.deploy_to_local(options);
    }
};

rack.Rack.prototype.deploy_to_local = function (options) {
    var destination = options.dirname;

    async.forEachSeries(this.assets, function (asset, next) {
        var specificFilename = asset.specificUrl.replace("//" + asset.hostname + root, '');

        // copy hashed version
        fs.copy(asset.filename, path.join(destination, specificFilename), function (err) {
            if (err) {
                return err;
            }
        });
        // copy original file as well
        // We need to do this for now in order to serve assets that a refernced relative in a CSS file.
        // Only until we find a solution
        fs.copy(asset.filename, path.join(destination, asset.url), function (err) {
            if (err) {
                return err;
            }
        });
        next();
    });
};

// Copied from asset-rack and slightly modified to serve a single asset
rack.StaticAsset = rack.Asset.extend({
    create: function (options) {
        var that = this;
        this.filename = path.resolve(options.filename);

        return fs.readFile(this.filename, function (error, data) {
            if (error !== null) {
                return that.emit('error', error);
            }
            return that.emit('created', {
                contents: data
            });
        });
    }
});

rack.ThemeAssets = rack.DynamicAssets.extend({
    create: function (options) {
        var that = this;

        this.type = rack.StaticAsset;
        this.urlPrefix = options.urlPrefix;
        this.filter = options.filter;

        if (this.urlPrefix === null) {
            this.urlPrefix = '/';
        }
        this.assets = [];
        // The setting for activeTheme is not readable when initialising the app, but will be on first request
        api.settings.read('activeTheme').then(function (activeTheme) {
            that.dirname = path.join(config.paths().themePath, activeTheme.value);
            return that.addAssets();
        }, function () {
            return that.emit('created');
        });
    },
    addAssets: function () {
        var that = this;

        return rack.util.walk(this.dirname, {
            ignoreFolders: true,
            filter: this.filter
        }, function (file, done) {
            var url, opts;

            url = path.dirname(file.relpath);
            url = url.split(path.sep);
            url.push(file.name);

            opts = {
                url: that.urlPrefix + url.join('/'),
                filename: file.path
            };
            that.addAsset(new that.type(opts));

            return done();
        }, function () {
            return that.emit('created');
        });
    }
});

module.exports = rack;