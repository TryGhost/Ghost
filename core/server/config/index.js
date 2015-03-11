/*jshint laxcomma: true, smarttabs: true, node:true */
'use strict';
/**
 * The conf package reads configurations options in an overriding fashion from a number of sources. In order of importance:
 * 1. System level overrides
 * 2. Command line arguments
 * 3. Environment variables
 * 4. A configuration file(s)
 * 5. System specified defaults
 *
 * ### Overrides
 * Overrides can not be overriden or changed at any point in time. The are defined in `conf/lib/overrides.js` and should be reserved for static run time properties. Conf serves as a central place to get that information.
 *
 * For example, the full path to the packages directory is resolved at run time and loaded in to the conf loader. It won't / can't change during run time, but may change in the future. By getting the information from conf, application logic does not need to change between restarts or releases.
 *
 * If overrides need to be change or added the `overrides.js` file must be changed
 *
 * ### Command Line Arguments
 * Command line arguments are the highest level of maliable values. The can be used to set specific and nested values in the configuration JSON document but using a `:` spearator between keys. For example, using the flag: `--foo:bar=1`, would create an object like
 *
 * ```js
 * {
 *    "foo":{
 *       "bar": 1
 *    }
 * }
 * ```
 *
 * ### Environment Variables
 * Environment variables work much the same as command line arguments. However, most bash implenetations don't read `:`'s very well, so the double underscore ( `__` ) is used in its place `foo__bar=1` npm start
 *
 * ```js
 * {
 *    "foo":{
 *       "bar": 1
 *    }
 * }
 * ```
 *
 * ### Conf Files
 * When loaded the first time, a number of file locations will be checked for configuration files.
 * 1. /etc/ghost.json
 * 2. A `ghost.json` in a `.config` directory of the current user's home directory ( `$HOME/.config/ghost.json` )
 * 3. A javascript file named `ghost.<ENV>.js` in the current workding directory of the parent process ( `ghost.development.js`, `ghost.production.js`, etc )
 * 4. The file specfied by the `GHOST_CONFIG` option, if afailable.
 * The `GHOST_CONFIG` option can be set to read specific configuration from a file(s). The value should be a full path. If the path points to a directory, the conf loader will read all json files, sort them and load their values in an overriding order..
 *
 * ```sh
 * node server --GHOST_CONFIG=$HOME/config.js
 * GHOST_CONFIG=$HOME/config.js node server
 * ```
 *
 * ### System defaults
 * defaults are what they sound like. Sane defaults for values that are needed to get the application running. They are located in the {@link module:ghost/core/server/config/defaults|Defaults} module and are used only as fallback values.
 * The `config.example.js` and `config.js` files are no longer necessary to run an instance.
 * @module ghost/core/server/config
 * @since 0.5.10
 * @requires path
 * @requires bluebird
 * @requires crypto
 * @requires fs
 * @requires url
 * @requires lodash
 * @requires knex
 * @requires nconf
 * @requires validator
 * @requires ghost/core/server/require-tree
 * @requires ghost/core/server/config/url
 */

var path          = require('path'),
    Promise       = require('bluebird'),
    util          = require('util'),
    fs            = require('fs'),
    url           = require('url'),
    _             = require('lodash'),
    nconf         = require('nconf'),
    validator     = require('validator'),
    defaults      = require('./defaults'),
    overrides     = require('./overrides'),
    requireTree   = require('../require-tree').readAll,
    appRoot       = path.resolve(__dirname, '../../../'),
    corePath      = path.resolve(appRoot, 'core/'),
    testingEnvs   = ['testing', 'testing-mysql', 'testing-pg'],
    defaultConfig = {},
    GHOST_CONFIG,
    configFile,
    envFile,
    startup,
    lookuppaths
    ;

require('colors');
startup = nconf
         .argv()
         .env({separator:'__'})
         .defaults(defaults);

GHOST_CONFIG = startup.get('GHOST_CONFIG');
configFile =  GHOST_CONFIG || '/.env/ghost.json';

envFile = util.format('ghost.%s.js', startup.get('NODE_ENV') || 'development');
envFile = path.resolve(process.cwd(), envFile);
// remove startup provider
// just used to establish some base line configuration
startup.remove('env');
startup.remove('argv');
startup.remove('defaults');
startup = null;

// order matters, otherwise this could be an object
lookuppaths = [
  ['ghost', path.resolve(configFile)],
  ['nenv', envFile],
  ['project', path.resolve(path.join(overrides.GHOST_PATH, 'ghost.json'))],
  ['home', path.resolve(path.join((process.env.USERPROFILE || process.env.HOME || overrides.GHOST_PATH), '.config', 'ghost.json'))],
  ['etc', path.resolve('/etc/ghost.json')]
];

/**
 * @alias module:ghost/core/server/config
 * @param {Object} config
 */
function ConfigManager(config) {
    var pth = GHOST_CONFIG || defaults.paths.config;
    nconf.Provider.call(this);

    this.add('user', {type:'memory'});

    // overrides > argv > ENV > files > defaults
    this
        .overrides(overrides)
        .argv()
        .env({separator:'__'});

    lookuppaths.forEach(function (lookup) {
        this.file(lookup[0], lookup[1]);
    }.bind(this));

    // If we're given an initial config object then we can set it.
    config =  (_.isObject(config) && !Array.isArray(config)) ? config : {};

    // defaults get loaded in last w/ passed config applied
    this
        .defaults(_.merge(defaults, config, {paths:{config:pth}}));
}

util.inherits(ConfigManager, nconf.Provider);

// Are we using sockets? Custom socket or the default?
ConfigManager.prototype.getSocket = function () {
    var socketConfig,
        server,
        values;

    server = this.get('server') || {};
    values = {
        path: path.join(this.get('paths:contentPath'), this.get('NODE_ENV') + '.socket'),
        permissions: '660'
    };

    if (server.hasOwnProperty('socket')) {
        socketConfig = server.socket;
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

ConfigManager.prototype.initPaths = function (rawConfig) {
    var self = this,
        paths;

    // Cache the config.js object's environment
    // object so we can later refer to it.
    // Note: this is not the entirety of config.js,
    // just the object appropriate for this NODE_ENV
    self.reconfigure(rawConfig);

    paths = this.get('paths');
    return Promise.all([requireTree(paths.themePath), requireTree(paths.appPath)]).then(function (paths) {
        self.set('paths', {
          availableThemes: paths[0],
          availableApps: paths[1]
        });
        return self.get();
    });
};

/**
 * Allows you to set the config object.
 * @param {Object} config to serve and initial defaults for the instance. Only accepts an object at the moment.
 */
ConfigManager.prototype.reconfigure = function (config) {
    config = _.clone(config || {});
    var localPath = '',
        defaultStorage = 'local-file-store',
        contentPath,
        activeStorage,
        storagePath,
        subdir,
        paths,
        uri;

    uri   = config.url || this.get('url');
    paths = this.get('paths');

    // FIXME: The subdir should be moved out to the url utils
    // then we can mostly do away with this function
    // Parse local path location
    if (uri) {
        localPath = url.parse(uri).path;
        // Remove trailing slash
        if (localPath !== '/') {
            localPath = localPath.replace(/\/$/, '');
        }
    }

    subdir = localPath === '/' ? '' : localPath;

    // Allow contentPath to be over-written by passed in config object
    // Otherwise default to default content path location
    contentPath = config.paths && config.paths.contentPath || paths.contentPath;

    activeStorage = this.get('storage:active');

    if (activeStorage === defaultStorage) {
        storagePath = path.join(corePath, '/server/storage/');
    } else {
        storagePath = path.join(contentPath, 'storage');
    }

    config = _.merge(config, {
        paths: {
            subdir:           subdir,
            contentPath:      path.resolve(contentPath),
            themePath:        path.resolve(contentPath, 'themes'),
            appPath:          path.resolve(contentPath, 'apps'),
            storage:          path.join(storagePath, activeStorage),
            imagesPath:       path.resolve(contentPath, 'images')
        },
        storage: {
            active: activeStorage
        },
        theme: {
            // normalise the URL by removing any trailing slash
            url: uri ? uri.replace(/\/$/, '') : ''
        }
    });

    // Special case for the them.navigation JSON object, which should be overridden not merged
    if (config && config.theme && config.theme.navigation) {
        this.set('theme:navigation', null);
        this.set('theme:navigation', config.theme.navigation);
        delete config.theme;
    }

    this.merge(config);
    return this;
};

/**
 * Reads a configuration file and validates the resulting configuration
 * @method module:ghost/core/server/config#read
 * @param {String} configFilePath A full path to the configuration file to read
 * @return {Promise.<Object>}
 **/
ConfigManager.prototype.read = function (configFilePath) {
    var self, // reference to this
        cfg   // path to config file we want to read.
        ;

    self = this;
    cfg  = configFilePath || this.get('paths:config');
    this.set('paths:config', cfg);
    /* Check for config file and copy from config.example.js
        if one doesn't exist. After that, start the server. */
    return new Promise(function (resolve, reject) {
        fs.stat(cfg, function (err) {
            var exists = (err) ? false : true,
                pendingConfig;

            if (!exists) {
                pendingConfig = self.writeFile();
            }

            Promise.resolve(pendingConfig).then(function () {
                return self.validate();
            }).then(function (rawConfig) {
                resolve(self.initPaths(rawConfig));
            }).catch(reject);
        });
    });
};

/**
 * Check for config file and copy from config.example.js
 * if one doesn't exist. After that, start the server.
 * @method module:ghost/core/server/config#writeFile
 **/
ConfigManager.prototype.writeFile = function () {
    var paths = this.get('paths');

    return new Promise(function (resolve, reject) {
        fs.stat(paths.configExample, function checkTemplate(err) {
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
            read = fs.createReadStream(paths.configExample);
            read.on('error', function (err) {
                console.log('%s\n%s\n%s'.red, new Error('Could not open config.example.js for read.'), appRoot, 'Please check your deployment for config.js or config.example.js.');
                reject(err);
            });

            write = fs.createWriteStream(paths.config);
            write.on('error', function (err) {
                console.log('%s\n%s\n%s'.red, new Error('Could not open config.js for write.'), appRoot, 'Please check your deployment for config.js or config.example.js.');
                reject(err);
            });

            write.on('finish', resolve);

            read.pipe(write);
        });
    });
};

/**
 * Read config.js file from file system using node's require
 * @param {String} envVal Which environment we're in.
 * @return {Object} The config object.
 */
ConfigManager.prototype.readFile = function (envVal) {
    return require(this.get('paths:config'))[envVal];
};

/**
 * Validates the config object has everything we want and in the form we want.
 * @return {Promise.<Object>} Returns a promise that resolves to the config object.
 */
ConfigManager.prototype.validate = function () {
    var envVal = this.get('NODE_ENV') || 'development',
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

    // Check if we don't even have a config
    if (!config) {
        console.log('%s\n%s\n%s'.red, new Error('Cannot find the configuration for the current NODE_ENV'), 'NODE_ENV=' + envVal, 'Ensure your config.js has a section for the current NODE_ENV value and is formatted properly.');
        return Promise.reject(new Error('Unable to load config for NODE_ENV=' + envVal));
    }

    // Check that our url is valid
    if (!validator.isURL(config.url, {protocols: ['http', 'https'], require_protocol: true})) {
        console.log('%s\n%s\n%s'.red, new Error('Your site url in config.js is invalid.'), config.url, 'Please make sure this is a valid url before restarting');
        return Promise.reject(new Error('invalid site url'));
    }

    parsedUrl = url.parse(config.url || 'invalid', false, true);

    if (/\/ghost(\/|$)/.test(parsedUrl.pathname)) {
        console.log('%s\n%s\n%s'.red, new Error('Your site url in config.js cannot contain a subdirectory called ghost.'), config.url, 'Please rename the subdirectory before restarting');

        return Promise.reject(new Error('ghost subdirectory not allowed'));
    }

    // Check that we have database values
    if (!config.database || !config.database.client) {
        console.log('%s\n%s\n%s'.red, new Error('Your database configuration in config.js is invalid.'), JSON.stringify(config.database), 'Please make sure this is a valid Bookshelf database configuration');
        return Promise.reject(new Error('invalid database configuration'));
    }

    hasHostAndPort = config.server && !!config.server.host && !!config.server.port;
    hasSocket = config.server && !!config.server.socket;

    // Check for valid server host and port values
    if (!config.server || !(hasHostAndPort || hasSocket)) {
        console.log('%s\n%s\n%s'.red, new Error('Your server values (socket, or host and port) in config.js are invalid.'), JSON.stringify(config.server), 'Please provide them before restarting.');

        return Promise.reject(new Error('invalid server configuration'));
    }

    return Promise.resolve(config);
};

/**
 * Helper method for checking the state of a particular privacy flag
 * @param {String} privacyFlag The flag to check
 * @returns {Boolean} disabled
 */
ConfigManager.prototype.isPrivacyDisabled = function (privacyFlag) {
    var privacy = this.get('privacy');
    if (!privacy) {
        return false;
    }

    if (privacy.useTinfoil === true) {
        return true;
    }

    return privacy[privacyFlag] === false;
};

/**
 * Check if any of the currently set config items are deprecated, and issues a warning.
 * @method module:ghost/core/server/config#checkDeprecated
 */
ConfigManager.prototype.checkDeprecated = function () {
    var self = this,
        state = this.get();
    _.each(this.get('deprecatedItems'), function (property) {
        self.displayDeprecated(state, property.split('.'), []);
    });
};

/**
 * renders warning messages for configuration properties that have been deprecated
 * @method module:ghost/core/server/config#displayDeprecated
 * @param {Object} item An object containing values to be checked
 * @param {String[]} properties A list of properties to display warning for
 * @param {String[]} address an array representing the path to the property with item
 **/
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
        errorText = 'The configuration property [' + address.join('.').bold + '] has been deprecated.';
        explanationText =  'This will be removed in a future version, please update your config.js file.';
        helpText = 'Please check http://support.ghost.org/config for the most up-to-date example.';
        console.log(errorText.yellow, explanationText.yellow, helpText.green);
    }
};

if (testingEnvs.indexOf(process.env.NODE_ENV) > -1) {
    defaultConfig  = require('../../../config.example')[process.env.NODE_ENV || 'development'];
}

Object.defineProperties(ConfigManager.prototype, {
    /**
     * @readonly
     * @instance
     * @memberof module:ghost/core/server/config
     * @property {Object} original copy of the original default values that were loaded at start up.
     **/
    original:{
        enumerable:false,
        get:function () {
            return _.clone(this.stores.defaults.get());
        }
    }
});

module.exports = new ConfigManager(defaultConfig).reconfigure();
