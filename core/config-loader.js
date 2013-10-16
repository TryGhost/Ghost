var fs      = require('fs'),
    url     = require('url'),
    when    = require('when'),
    errors  = require('./server/errorHandling'),
    path    = require('path'),

    appRoot = path.resolve(__dirname, '../'),
    configexample = path.join(appRoot, 'config.example.js'),
    config = process.argv[2] || path.join(appRoot, 'config.js');

function writeConfigFile() {
    var written = when.defer();

    /* Check for config file and copy from config.example.js
        if one doesn't exist. After that, start the server. */
    fs.exists(configexample, function checkTemplate(templateExists) {
        var read,
            write;

        if (!templateExists) {
            return errors.logError(new Error('Could not locate a configuration file.'), appRoot, 'Please check your deployment for config.js or config.example.js.');
        }

        // Copy config.example.js => config.js
        read = fs.createReadStream(configexample);
        read.on('error', function (err) {
            return errors.logError(new Error('Could not open config.example.js for read.'), appRoot, 'Please check your deployment for config.js or config.example.js.');
        });
        read.on('end', written.resolve);

        write = fs.createWriteStream(config);
        write.on('error', function (err) {
            return errors.logError(new Error('Could not open config.js for write.'), appRoot, 'Please check your deployment for config.js or config.example.js.');
        });

        read.pipe(write);
    });

    return written.promise;
}

function validateConfigEnvironment() {
    var envVal = process.env.NODE_ENV || 'undefined',
        hasHostAndPort,
        hasSocket,
        globalConf,
        conf,
        parsedUrl;

    try {
        globalConf = require(config);
        conf = globalConf[envVal];
    } catch (ignore) {

    }


    // Check if we don't even have a config
    if (!conf) {
        errors.logError(new Error('Cannot find the configuration for the current NODE_ENV'), "NODE_ENV=" + envVal, 'Ensure your config.js has a section for the current NODE_ENV value');
        return when.reject();
    }

    // Check that our url is valid
    parsedUrl = url.parse(conf.url || 'invalid', false, true);
    if (!parsedUrl.host) {
        errors.logError(new Error('Your site url in config.js is invalid.'), conf.url, 'Please make sure this is a valid url before restarting');
        return when.reject();
    }

    // Check that we have database values
    if (!conf.database) {
        errors.logError(new Error('Your database configuration in config.js is invalid.'), JSON.stringify(conf.database), 'Please make sure this is a valid Bookshelf database configuration');
        return when.reject();
    }

    hasHostAndPort = conf.server && !!conf.server.host && !!conf.server.port;
    hasSocket = conf.server && !!conf.server.socket;

    // Check for valid server host and port values
    if (!conf.server || !(hasHostAndPort || hasSocket)) {
        errors.logError(new Error('Your server values (socket, or host and port) in config.js are invalid.'), JSON.stringify(conf.server), 'Please provide them before restarting.');
        return when.reject();
    }

    return when.resolve(globalConf);
}

function assignConfig(config) {
    var i;
    for (i in config) {
        exports[i] = config[i];
    }
}

exports.loadConfig = function () {
    var loaded = when.defer(),
        pendingConfig;
    /* Check for config file and copy from config.example.js
        if one doesn't exist. After that, start the server. */
    fs.exists(config, function checkConfig(configExists) {
        if (!configExists) {
            pendingConfig = writeConfigFile();
        }
        when(pendingConfig).then(validateConfigEnvironment).then(assignConfig).then(loaded.resolve).otherwise(loaded.reject);
    });
    return loaded.promise;
};
