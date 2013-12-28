// This file manages the root level config.js.
// It will create config.js from config.exampe.js
// if it doesn't exist and then always attempt to load
// config.js into memory, error and quitting if config.js
// has an improper format.

var fs      = require('fs'),
    url     = require('url'),
    when    = require('when'),
    errors  = require('../errorHandling'),
    path    = require('path'),
    paths   = require('./paths'),

    appRoot = paths().appRoot,
    configExample = paths().configExample,
    configFile =  process.env.GHOST_CONFIG || paths().config,
    rejectMessage = 'Unable to load config';

function readConfigFile(envVal) {
    return require(configFile)[envVal];
}

function writeConfigFile() {
    var written = when.defer();

    /* Check for config file and copy from config.example.js
        if one doesn't exist. After that, start the server. */
    fs.exists(configExample, function checkTemplate(templateExists) {
        var read,
            write;

        if (!templateExists) {
            return errors.logError(new Error('Could not locate a configuration file.'), appRoot, 'Please check your deployment for config.js or config.example.js.');
        }

        // Copy config.example.js => config.js
        read = fs.createReadStream(configExample);
        read.on('error', function (err) {
            /*jslint unparam:true*/
            return errors.logError(new Error('Could not open config.example.js for read.'), appRoot, 'Please check your deployment for config.js or config.example.js.');
        });
        read.on('end', written.resolve);

        write = fs.createWriteStream(configFile);
        write.on('error', function (err) {
            /*jslint unparam:true*/
            return errors.logError(new Error('Could not open config.js for write.'), appRoot, 'Please check your deployment for config.js or config.example.js.');
        });

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
    } catch (ignore) {

    }

    // Check if we don't even have a config
    if (!config) {
        errors.logError(new Error('Cannot find the configuration for the current NODE_ENV'), "NODE_ENV=" + envVal,
            'Ensure your config.js has a section for the current NODE_ENV value and is formatted properly.');
        return when.reject(rejectMessage);
    }

    // Check that our url is valid
    parsedUrl = url.parse(config.url || 'invalid', false, true);
    if (!parsedUrl.host) {
        errors.logError(new Error('Your site url in config.js is invalid.'), config.url, 'Please make sure this is a valid url before restarting');
        return when.reject(rejectMessage);
    }

    if (/\/ghost(\/|$)/.test(parsedUrl.pathname)) {
        errors.logError(new Error('Your site url in config.js cannot contain a subdirectory called ghost.'), config.url, 'Please rename the subdirectory before restarting');
        return when.reject(rejectMessage);
    }

    // Check that we have database values
    if (!config.database || !config.database.client) {
        errors.logError(new Error('Your database configuration in config.js is invalid.'), JSON.stringify(config.database), 'Please make sure this is a valid Bookshelf database configuration');
        return when.reject(rejectMessage);
    }

    hasHostAndPort = config.server && !!config.server.host && !!config.server.port;
    hasSocket = config.server && !!config.server.socket;

    // Check for valid server host and port values
    if (!config.server || !(hasHostAndPort || hasSocket)) {
        errors.logError(new Error('Your server values (socket, or host and port) in config.js are invalid.'), JSON.stringify(config.server), 'Please provide them before restarting.');
        return when.reject(rejectMessage);
    }

    return when.resolve(config);
}

function loadConfig() {
    var loaded = when.defer(),
        pendingConfig;
    /* Check for config file and copy from config.example.js
        if one doesn't exist. After that, start the server. */
    fs.exists(configFile, function checkConfig(configExists) {
        if (!configExists) {
            pendingConfig = writeConfigFile();
        }
        when(pendingConfig).then(validateConfigEnvironment).then(loaded.resolve).otherwise(loaded.reject);
    });
    return loaded.promise;
}

module.exports = loadConfig;
