// # Config
// General entry point for all configuration data
var path          = require('path'),
    Promise       = require('bluebird'),
    chalk         = require('chalk'),
    fs            = require('fs'),
    url           = require('url'),
    _             = require('lodash'),

    validator     = require('validator'),
    generateAssetHash = require('../utils/asset-hash'),
    readDirectory = require('../utils/read-directory'),
    readThemes    = require('../utils/read-themes'),
    errors        = require('../errors'),
    configUrl     = require('./url'),
    packageInfo   = require('../../../package.json'),
    i18n          = require('../i18n'),
    appRoot       = path.resolve(__dirname, '../../../'),
    corePath      = path.resolve(appRoot, 'core/'),
    testingEnvs   = ['testing', 'testing-mysql', 'testing-pg'],
    defaultConfig = {};

function ConfigManager(config) {
    /**
     * Our internal true representation of our current config object.
     * @private
     * @type {Object}
     */
    this._config = {};

    // Allow other modules to be externally accessible.
    this.urlJoin = configUrl.urlJoin;
    this.urlFor = configUrl.urlFor;
    this.urlPathForPost = configUrl.urlPathForPost;
    this.apiUrl = configUrl.apiUrl;
    this.getBaseUrl = configUrl.getBaseUrl;

    // If we're given an initial config object then we can set it.
    if (config && _.isObject(config)) {
        this.set(config);
    }
}

// Are we using sockets? Custom socket or the default?
ConfigManager.prototype.getSocket = function () {
    var socketConfig,
        values = {
            path: path.join(this._config.paths.contentPath, process.env.NODE_ENV + '.socket'),
            permissions: '660'
        };

    if (this._config.server.hasOwnProperty('socket')) {
        socketConfig = this._config.server.socket;

        if (_.isString(socketConfig)) {
            values.path = socketConfig;

            return values;
        }

        if (_.isObject(socketConfig)) {
            values.path = socketConfig.path || values.path;
            values.permissions = socketConfig.permissions || values.permissions;

            return values;
        }
    }

    return false;
};

ConfigManager.prototype.init = function (rawConfig) {
    var self = this;

    // Cache the config.js object's environment
    // object so we can later refer to it.
    // Note: this is not the entirety of config.js,
    // just the object appropriate for this NODE_ENV
    self.set(rawConfig);

    return self.loadThemes()
        .then(function () {
            return self.loadApps();
        })
        .then(function () {
            return self._config;
        });
};

ConfigManager.prototype.loadThemes = function () {
    var self = this;

    return readThemes(self._config.paths.themePath)
        .then(function (result) {
            self._config.paths.availableThemes = result;
        });
};

ConfigManager.prototype.loadApps = function () {
    var self = this;

    return readDirectory(self._config.paths.appPath)
        .then(function (result) {
            self._config.paths.availableApps = result;
        });
};

/**
 * Allows you to set the config object.
 * @param {Object} config Only accepts an object at the moment.
 */
ConfigManager.prototype.set = function (config) {
    var localPath = '',
        defaultStorageAdapter = 'local-file-store',
        defaultSchedulingAdapter = 'SchedulingDefault',
        activeStorageAdapter,
        activeSchedulingAdapter,
        contentPath,
        schedulingPath,
        subdir,
        assetHash;

    // Merge passed in config object onto our existing config object.
    // We're using merge here as it doesn't assign `undefined` properties
    // onto our cached config object.  This allows us to only update our
    // local copy with properties that have been explicitly set.
    _.merge(this._config, config);

    // Special case for the database config, which should be overridden not merged

    if (config && config.database) {
        this._config.database = config.database;
    }

    // Special case for the them.navigation JSON object, which should be overridden not merged
    if (config && config.theme && config.theme.navigation) {
        this._config.theme.navigation = config.theme.navigation;
    }

    // Special case for theme.timezone, which should be overridden not merged
    if (config && config.theme && config.theme.timezone) {
        this._config.theme.timezone = config.theme.timezone;
    } else {
        // until we have set the timezone from settings, we use the default
        this._config.theme = this._config.theme ? this._config.theme : {};
        this._config.theme.timezone = 'Etc/UTC';
    }

    // Protect against accessing a non-existant object.
    // This ensures there's always at least a paths object
    // because it's referenced in multiple places.
    this._config.paths = this._config.paths || {};

    // Parse local path location
    if (this._config.url) {
        localPath = url.parse(this._config.url).path;
        // Remove trailing slash
        if (localPath !== '/') {
            localPath = localPath.replace(/\/$/, '');
        }
    }

    subdir = localPath === '/' ? '' : localPath;

    if (!_.isEmpty(subdir)) {
        this._config.slugs.protected.push(subdir.split('/').pop());
    }

    // Allow contentPath to be over-written by passed in config object
    // Otherwise default to default content path location
    contentPath = this._config.paths.contentPath || path.resolve(appRoot, 'content');

    assetHash = this._config.assetHash || generateAssetHash();

    // read storage adapter from config file or attach default adapter
    this._config.storage = this._config.storage || {};
    activeStorageAdapter = this._config.storage.active || defaultStorageAdapter;

    // read scheduling adapter(s) from config file or attach default adapter
    this._config.scheduling = this._config.scheduling || {};
    activeSchedulingAdapter = this._config.scheduling.active || defaultSchedulingAdapter;

    // storage.active can be an object like {images: 'my-custom-image-storage-adapter', themes: 'local-file-storage'}
    // we ensure that passing a string to storage.active still works, but internal it's always an object
    if (_.isString(activeStorageAdapter)) {
        this._config.storage = _.merge(this._config.storage, {
            active: {
                images: activeStorageAdapter,
                themes: defaultStorageAdapter
            }
        });
    } else {
        // ensure there is a default image storage adapter
        if (!this._config.storage.active.images) {
            this._config.storage.active.images = defaultStorageAdapter;
        }

        // ensure there is a default theme storage adapter
        // @TODO: right now we only support theme uploads to local file storage
        // @TODO: we need to change reading themes from disk on bootstrap (see loadThemes)
        this._config.storage.active.themes = defaultStorageAdapter;
    }

    if (activeSchedulingAdapter === defaultSchedulingAdapter) {
        schedulingPath = path.join(corePath, '/server/scheduling/');
    } else {
        schedulingPath = path.join(contentPath, '/scheduling/');
    }

    _.merge(this._config, {
        ghostVersion: packageInfo.version,
        paths: {
            appRoot:          appRoot,
            subdir:           subdir,
            config:           this._config.paths.config || path.join(appRoot, 'config.js'),
            configExample:    path.join(appRoot, 'config.example.js'),
            corePath:         corePath,

            storagePath: {
                default: path.join(corePath, '/server/storage/'),
                custom:  path.join(contentPath, 'storage/')
            },

            contentPath:      contentPath,
            themePath:        path.resolve(contentPath, 'themes'),
            appPath:          path.resolve(contentPath, 'apps'),
            dataPath:         path.resolve(contentPath, 'data'),
            imagesPath:       path.resolve(contentPath, 'images'),
            internalAppPath:  path.join(corePath, '/server/apps/'),
            imagesRelPath:    'content/images',

            adminViews:       path.join(corePath, '/server/views/'),
            helperTemplates:  path.join(corePath, '/server/helpers/tpl/'),

            availableThemes:  this._config.paths.availableThemes || {},
            availableApps:    this._config.paths.availableApps || {},
            clientAssets:     path.join(corePath, '/built/assets/')
        },
        maintenance: {},
        scheduling: {
            active: activeSchedulingAdapter,
            path: schedulingPath
        },
        theme: {
            // normalise the URL by removing any trailing slash
            url: this._config.url ? this._config.url.replace(/\/$/, '') : ''
        },
        routeKeywords: {
            tag: 'tag',
            author: 'author',
            page: 'page',
            preview: 'p',
            private: 'private',
            subscribe: 'subscribe',
            amp: 'amp'
        },
        internalApps: ['private-blogging', 'subscribers', 'amp'],
        slugs: {
            // Used by generateSlug to generate slugs for posts, tags, users, ..
            // reserved slugs are reserved but can be extended/removed by apps
            // protected slugs cannot be changed or removed
            reserved: ['admin', 'app', 'apps', 'archive', 'archives', 'categories',
            'category', 'dashboard', 'feed', 'ghost-admin', 'login', 'logout',
            'page', 'pages', 'post', 'posts', 'public', 'register', 'setup',
            'signin', 'signout', 'signup', 'user', 'users', 'wp-admin', 'wp-login'],
            protected: ['ghost', 'rss', 'amp']
        },
        // used in middleware/validation/upload.js
        // if we finish the data/importer logic, each type selects an importer
        uploads: {
            subscribers: {
                extensions: ['.csv'],
                contentTypes: ['text/csv', 'application/csv', 'application/octet-stream']
            },
            images: {
                extensions: ['.jpg', '.jpeg', '.gif', '.png', '.svg', '.svgz'],
                contentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
            },
            db: {
                extensions: ['.json', '.zip'],
                contentTypes: ['application/octet-stream', 'application/json', 'application/zip', 'application/x-zip-compressed']
            },
            themes: {
                extensions: ['.zip'],
                contentTypes: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
            }
        },
        deprecatedItems: ['updateCheck', 'mail.fromaddress'],
        // create a hash for cache busting assets
        assetHash: assetHash,
        preloadHeaders: this._config.preloadHeaders || false,
        times: {
            cannotScheduleAPostBeforeInMinutes: 2,
            publishAPostBySchedulerToleranceInMinutes: 2
        }
    });

    // Also pass config object to
    // configUrl object to maintain
    // clean dependency tree
    configUrl.setConfig(this._config);

    // For now we're going to copy the current state of this._config
    // so it's directly accessible on the instance.
    // @TODO: perhaps not do this?  Put access of the config object behind
    // a function?
    _.extend(this, this._config);
};

/**
 * Allows you to read the config object.
 * @return {Object} The config object.
 */
ConfigManager.prototype.get = function () {
    return this._config;
};

ConfigManager.prototype.load = function (configFilePath) {
    var self = this;

    self._config.paths.config = process.env.GHOST_CONFIG || configFilePath || self._config.paths.config;

    /* Check for config file and copy from config.example.js
        if one doesn't exist. After that, start the server. */
    return new Promise(function (resolve, reject) {
        fs.stat(self._config.paths.config, function (err) {
            var exists = (err) ? false : true,
                pendingConfig;

            if (!exists) {
                pendingConfig = self.writeFile();
            }

            Promise.resolve(pendingConfig).then(function () {
                return self.validate();
            }).then(function (rawConfig) {
                return self.init(rawConfig);
            }).then(resolve)
            .catch(reject);
        });
    });
};

/* Check for config file and copy from config.example.js
    if one doesn't exist. After that, start the server. */
ConfigManager.prototype.writeFile = function () {
    var configPath = this._config.paths.config,
        configExamplePath = this._config.paths.configExample;

    return new Promise(function (resolve, reject) {
        fs.stat(configExamplePath, function checkTemplate(err) {
            var templateExists = (err) ? false : true,
                read,
                write,
                error;

            if (!templateExists) {
                error = new Error(i18n.t('errors.config.couldNotLocateConfigFile.error'));
                error.context = appRoot;
                error.help = i18n.t('errors.config.couldNotLocateConfigFile.help');

                return reject(error);
            }

            // Copy config.example.js => config.js
            read = fs.createReadStream(configExamplePath);
            read.on('error', function (err) {
                errors.logError(
                    new Error(i18n.t('errors.config.couldNotOpenForReading.error', {file: 'config.example.js'})),
                    appRoot,
                    i18n.t('errors.config.couldNotOpenForReading.help'));

                reject(err);
            });

            write = fs.createWriteStream(configPath);
            write.on('error', function (err) {
                errors.logError(
                    new Error(i18n.t('errors.config.couldNotOpenForWriting.error', {file: 'config.js'})),
                    appRoot,
                    i18n.t('errors.config.couldNotOpenForWriting.help'));

                reject(err);
            });

            write.on('finish', resolve);

            read.pipe(write);
        });
    });
};

/**
 * Read config.js file from file system using node's require
 * @param  {String} envVal Which environment we're in.
 * @return {Object}        The config object.
 */
ConfigManager.prototype.readFile = function (envVal) {
    return require(this._config.paths.config)[envVal];
};

/**
 * Validates the config object has everything we want and in the form we want.
 * @return {Promise.<Object>} Returns a promise that resolves to the config object.
 */
ConfigManager.prototype.validate = function () {
    var envVal = process.env.NODE_ENV || undefined,
        hasHostAndPort,
        hasSocket,
        config,
        parsedUrl;

    try {
        config = this.readFile(envVal);
    }
    catch (e) {
        return Promise.reject(e);
    }

    // Check that our url is valid
    if (!validator.isURL(config.url, {protocols: ['http', 'https'], require_protocol: true})) {
        errors.logError(
            new Error(i18n.t('errors.config.invalidUrlInConfig.description'),
            config.url,
            i18n.t('errors.config.invalidUrlInConfig.help')));

        return Promise.reject(new Error(i18n.t('errors.config.invalidUrlInConfig.error')));
    }

    parsedUrl = url.parse(config.url || 'invalid', false, true);

    if (/\/ghost(\/|$)/.test(parsedUrl.pathname)) {
        errors.logError(
            new Error(i18n.t('errors.config.urlCannotContainGhostSubdir.description'),
            config.url,
            i18n.t('errors.config.urlCannotContainGhostSubdir.help')));

        return Promise.reject(new Error(i18n.t('errors.config.urlCannotContainGhostSubdir.error')));
    }

    // Check that we have database values
    if (!config.database || !config.database.client) {
        errors.logError(
            new Error(i18n.t('errors.config.dbConfigInvalid.description')),
            JSON.stringify(config.database),
            i18n.t('errors.config.dbConfigInvalid.help'));

        return Promise.reject(new Error(i18n.t('errors.config.dbConfigInvalid.error')));
    }

    hasHostAndPort = config.server && !!config.server.host && !!config.server.port;
    hasSocket = config.server && !!config.server.socket;

    // Check for valid server host and port values
    if (!config.server || !(hasHostAndPort || hasSocket)) {
        errors.logError(
            new Error(i18n.t('errors.config.invalidServerValues.description')),
            JSON.stringify(config.server),
            i18n.t('errors.config.invalidServerValues.help'));

        return Promise.reject(new Error(i18n.t('errors.config.invalidServerValues.error')));
    }

    return Promise.resolve(config);
};

/**
 * Helper method for checking the state of a particular privacy flag
 * @param {String} privacyFlag The flag to check
 * @returns {boolean}
 */
ConfigManager.prototype.isPrivacyDisabled = function (privacyFlag) {
    if (!this.privacy) {
        return false;
    }

    if (this.privacy.useTinfoil === true) {
        return true;
    }

    return this.privacy[privacyFlag] === false;
};

/**
 * Check if any of the currently set config items are deprecated, and issues a warning.
 */
ConfigManager.prototype.checkDeprecated = function () {
    var self = this;
    _.each(this.deprecatedItems, function (property) {
        self.displayDeprecated(self._config, property.split('.'), []);
    });
};

ConfigManager.prototype.displayDeprecated = function (item, properties, address) {
    var self = this,
        property = properties.shift(),
        errorText,
        explanationText,
        helpText;

    address.push(property);

    if (item.hasOwnProperty(property)) {
        if (properties.length) {
            return self.displayDeprecated(item[property], properties, address);
        }
        errorText = i18n.t('errors.config.deprecatedProperty.error', {property: chalk.bold(address.join('.'))});
        explanationText =  i18n.t('errors.config.deprecatedProperty.explanation');
        helpText = i18n.t('errors.config.deprecatedProperty.help', {url: 'http://support.ghost.org/config'});
        errors.logWarn(errorText, explanationText, helpText);
    }
};

if (testingEnvs.indexOf(process.env.NODE_ENV) > -1) {
    defaultConfig  = require('../../../config.example')[process.env.NODE_ENV];
}

module.exports = new ConfigManager(defaultConfig);
