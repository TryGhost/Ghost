// # Config
// General entry point for all configuration data
var path          = require('path'),
    Promise       = require('bluebird'),
    chalk         = require('chalk'),
    crypto        = require('crypto'),
    fs            = require('fs'),
    url           = require('url'),
    _             = require('lodash'),
    knex          = require('knex'),
    validator     = require('validator'),
    readDirectory = require('../utils/read-directory'),
    readThemes    = require('../utils/read-themes'),
    errors        = require('../errors'),
    configUrl     = require('./url'),
    packageInfo   = require('../../../package.json'),
    appRoot       = path.resolve(__dirname, '../../../'),
    corePath      = path.resolve(appRoot, 'core/'),
    testingEnvs   = ['testing', 'testing-mysql', 'testing-pg'],
    defaultConfig = {},
    knexInstance;

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

    return Promise.all([readThemes(self._config.paths.themePath), readDirectory(self._config.paths.appPath)]).then(function (paths) {
        self._config.paths.availableThemes = paths[0];
        self._config.paths.availableApps = paths[1];
        return self._config;
    });
};

function configureDriver(client) {
    var pg;

    if (client === 'pg' || client === 'postgres' || client === 'postgresql') {
        try {
            pg = require('pg');
        } catch (e) {
            pg = require('pg.js');
        }

        // By default PostgreSQL returns data as strings along with an OID that identifies
        // its type.  We're setting the parser to convert OID 20 (int8) into a javascript
        // integer.
        pg.types.setTypeParser(20, function (val) {
            return val === null ? null : parseInt(val, 10);
        });
    }
}

/**
 * Allows you to set the config object.
 * @param {Object} config Only accepts an object at the moment.
 */
ConfigManager.prototype.set = function (config) {
    var localPath = '',
        defaultStorage = 'local-file-store',
        contentPath,
        activeStorage,
        storagePath,
        subdir,
        assetHash;

    // Merge passed in config object onto our existing config object.
    // We're using merge here as it doesn't assign `undefined` properties
    // onto our cached config object.  This allows us to only update our
    // local copy with properties that have been explicitly set.
    _.merge(this._config, config);

    // Special case for the them.navigation JSON object, which should be overridden not merged
    if (config && config.theme && config.theme.navigation) {
        this._config.theme.navigation = config.theme.navigation;
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

    // Allow contentPath to be over-written by passed in config object
    // Otherwise default to default content path location
    contentPath = this._config.paths.contentPath || path.resolve(appRoot, 'content');

    assetHash = this._config.assetHash ||
        (crypto.createHash('md5').update(packageInfo.version + Date.now()).digest('hex')).substring(0, 10);

    if (!knexInstance && this._config.database && this._config.database.client) {
        configureDriver(this._config.database.client);
        knexInstance = knex(this._config.database);
    }

    // Protect against accessing a non-existant object.
    // This ensures there's always at least a storage object
    // because it's referenced in multiple places.
    this._config.storage = this._config.storage || {};
    activeStorage = this._config.storage.active || defaultStorage;

    if (activeStorage === defaultStorage) {
        storagePath = path.join(corePath, '/server/storage/');
    } else {
        storagePath = path.join(contentPath, 'storage');
    }

    _.merge(this._config, {
        database: {
            knex: knexInstance
        },
        ghostVersion: packageInfo.version,
        paths: {
            appRoot:          appRoot,
            subdir:           subdir,
            config:           this._config.paths.config || path.join(appRoot, 'config.js'),
            configExample:    path.join(appRoot, 'config.example.js'),
            corePath:         corePath,

            storage:          path.join(storagePath, activeStorage),

            contentPath:      contentPath,
            themePath:        path.resolve(contentPath, 'themes'),
            appPath:          path.resolve(contentPath, 'apps'),
            imagesPath:       path.resolve(contentPath, 'images'),
            imagesRelPath:    'content/images',

            adminViews:       path.join(corePath, '/server/views/'),
            helperTemplates:  path.join(corePath, '/server/helpers/tpl/'),
            exportPath:       path.join(corePath, '/server/data/export/'),
            lang:             path.join(corePath, '/shared/lang/'),

            availableThemes:  this._config.paths.availableThemes || {},
            availableApps:    this._config.paths.availableApps || {},
            clientAssets:     path.join(corePath, '/built/assets/')
        },
        storage: {
            active: activeStorage
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
            private: 'private'
        },
        slugs: {
            // Used by generateSlug to generate slugs for posts, tags, users, ..
            // reserved slugs are reserved but can be extended/removed by apps
            // protected slugs cannot be changed or removed
            reserved: ['admin', 'app', 'apps', 'archive', 'archives', 'categories', 'category', 'dashboard', 'feed', 'ghost-admin', 'login', 'logout', 'page', 'pages', 'post', 'posts', 'public', 'register', 'setup', 'signin', 'signout', 'signup', 'user', 'users', 'wp-admin', 'wp-login'],
            protected: ['ghost', 'rss']
        },
        uploads: {
            // Used by the upload API to limit uploads to images
            extensions: ['.jpg', '.jpeg', '.gif', '.png', '.svg', '.svgz'],
            contentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
        },
        deprecatedItems: ['updateCheck', 'mail.fromaddress'],
        // create a hash for cache busting assets
        assetHash: assetHash
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
                resolve(self.init(rawConfig));
            }).catch(reject);
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
                error = new Error('Could not locate a configuration file.');
                error.context = appRoot;
                error.help = 'Please check your deployment for config.js or config.example.js.';

                return reject(error);
            }

            // Copy config.example.js => config.js
            read = fs.createReadStream(configExamplePath);
            read.on('error', function (err) {
                errors.logError(new Error('Could not open config.example.js for read.'), appRoot, 'Please check your deployment for config.js or config.example.js.');

                reject(err);
            });

            write = fs.createWriteStream(configPath);
            write.on('error', function (err) {
                errors.logError(new Error('Could not open config.js for write.'), appRoot, 'Please check your deployment for config.js or config.example.js.');

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
        errors.logError(new Error('Your site url in config.js is invalid.'), config.url, 'Please make sure this is a valid url before restarting');

        return Promise.reject(new Error('invalid site url'));
    }

    parsedUrl = url.parse(config.url || 'invalid', false, true);

    if (/\/ghost(\/|$)/.test(parsedUrl.pathname)) {
        errors.logError(new Error('Your site url in config.js cannot contain a subdirectory called ghost.'), config.url, 'Please rename the subdirectory before restarting');

        return Promise.reject(new Error('ghost subdirectory not allowed'));
    }

    // Check that we have database values
    if (!config.database || !config.database.client) {
        errors.logError(new Error('Your database configuration in config.js is invalid.'), JSON.stringify(config.database), 'Please make sure this is a valid Bookshelf database configuration');

        return Promise.reject(new Error('invalid database configuration'));
    }

    hasHostAndPort = config.server && !!config.server.host && !!config.server.port;
    hasSocket = config.server && !!config.server.socket;

    // Check for valid server host and port values
    if (!config.server || !(hasHostAndPort || hasSocket)) {
        errors.logError(new Error('Your server values (socket, or host and port) in config.js are invalid.'), JSON.stringify(config.server), 'Please provide them before restarting.');

        return Promise.reject(new Error('invalid server configuration'));
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
        errorText = 'The configuration property [' + chalk.bold(address.join('.')) + '] has been deprecated.';
        explanationText =  'This will be removed in a future version, please update your config.js file.';
        helpText = 'Please check http://support.ghost.org/config for the most up-to-date example.';
        errors.logWarn(errorText, explanationText, helpText);
    }
};

if (testingEnvs.indexOf(process.env.NODE_ENV) > -1) {
    defaultConfig  = require('../../../config.example')[process.env.NODE_ENV];
}

module.exports = new ConfigManager(defaultConfig);
