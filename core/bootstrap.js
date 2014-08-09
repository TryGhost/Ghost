// This file manages the root level config.js.
// It will create config.js from config.exampe.js
// if it doesn't exist and then always attempt to load
// config.js into memory, error and quitting if config.js
// has an improper format.

var fs      = require('fs'),
    url     = require('url'),
    when    = require('when'),
    validator = require('validator'),
    errors  = require('./server/errors'),
    config  = require('./server/config'),

    appRoot = config.paths.appRoot,
    configExample = config.paths.configExample,
    configFile;

function readConfigFile(envVal) {
    return require(configFile)[envVal];
}

function writeConfigFile() {
    var written = when.defer();

    /* Check for config file and copy from config.example.js
        if one doesn't exist. After that, start the server. */
    fs.exists(configExample, function checkTemplate(templateExists) {
        var read,
            write,
            error;

        if (!templateExists) {
            error = new Error('Could not locate a configuration file.');
            error.context = appRoot;
            error.help = 'Please check your deployment for config.js or config.example.js.';

            return written.reject(error);
        }

        // Copy config.example.js => config.js
        read = fs.createReadStream(configExample);
        read.on('error', function (err) {
            errors.logError(new Error('Could not open config.example.js for read.'), appRoot, 'Please check your deployment for config.js or config.example.js.');

            return written.reject(err);
        });

        write = fs.createWriteStream(configFile);
        write.on('error', function (err) {
            errors.logError(new Error('Could not open config.js for write.'), appRoot, 'Please check your deployment for config.js or config.example.js.');

            return written.reject(err);
        });
        write.on('finish', written.resolve);

        read.pipe(write);
    });

    return written.promise;
}

function validateConfigEnvironment() {
    var envVal = process.env.NODE_ENV || undefined,
        hasHostAndPort,
        hasSocket,
        config,
        parsedUrl;

    try {
        config = readConfigFile(envVal);
    }
    catch (e) {
        return when.reject(e);
    }

    // Check if we don't even have a config
    if (!config) {
        errors.logError(new Error('Cannot find the configuration for the current NODE_ENV'), 'NODE_ENV=' + envVal,
            'Ensure your config.js has a section for the current NODE_ENV value and is formatted properly.');

        return when.reject(new Error('Unable to load config for NODE_ENV=' + envVal));
    }

    // Check that our url is valid
    if (!validator.isURL(config.url, { protocols: ['http', 'https'], require_protocol: true })) {
        errors.logError(new Error('Your site url in config.js is invalid.'), config.url, 'Please make sure this is a valid url before restarting');

        return when.reject(new Error('invalid site url'));
    }

    parsedUrl = url.parse(config.url || 'invalid', false, true);

    if (/\/ghost(\/|$)/.test(parsedUrl.pathname)) {
        errors.logError(new Error('Your site url in config.js cannot contain a subdirectory called ghost.'), config.url, 'Please rename the subdirectory before restarting');

        return when.reject(new Error('ghost subdirectory not allowed'));
    }

    // Check that we have database values
    if (!config.database || !config.database.client) {
        errors.logError(new Error('Your database configuration in config.js is invalid.'), JSON.stringify(config.database), 'Please make sure this is a valid Bookshelf database configuration');

        return when.reject(new Error('invalid database configuration'));
    }

    hasHostAndPort = config.server && !!config.server.host && !!config.server.port;
    hasSocket = config.server && !!config.server.socket;

    // Check for valid server host and port values
    if (!config.server || !(hasHostAndPort || hasSocket)) {
        errors.logError(new Error('Your server values (socket, or host and port) in config.js are invalid.'), JSON.stringify(config.server), 'Please provide them before restarting.');

        return when.reject(new Error('invalid server configuration'));
    }

    return when.resolve(config);
}

function loadConfig(configFilePath) {
    var loaded = when.defer(),
        pendingConfig;

    // Allow config file path to be taken from, in order of importance:
    // environment process, passed in value, default location
    configFile = process.env.GHOST_CONFIG || configFilePath || config.paths.config;

    /* Check for config file and copy from config.example.js
        if one doesn't exist. After that, start the server. */
    fs.exists(configFile, function checkConfig(configExists) {
        if (!configExists) {
            pendingConfig = writeConfigFile();
        }

        when(pendingConfig).then(validateConfigEnvironment).then(function (rawConfig) {
            return config.init(rawConfig).then(loaded.resolve);
        }).catch(loaded.reject);
    });

    return loaded.promise;
}

module.exports = loadConfig;
