var fs = require('fs'),
    when = require('when');

function writeConfigFile() {
    var written = when.defer();

    /* Check for config file and copy from config.example.js
        if one doesn't exist. After that, start the server. */
    fs.exists('config.example.js', function checkTemplate(templateExists) {
        var read,
            write;

        if (!templateExists) {
            throw new Error('Could not locate a configuration file. Please check your deployment for config.js or config.example.js.');
        }

        // Copy config.example.js => config.js
        read = fs.createReadStream('config.example.js');
        read.on('error', function (err) {
            throw new Error('Could not open config.example.js for read.');
        });
        read.on('end', written.resolve);

        write = fs.createWriteStream('config.js');
        write.on('error', function (err) {
            throw new Error('Could not open config.js for write.');
        });

        read.pipe(write);
    });

    return written.promise;
}

exports.loadConfig = function () {
    var loaded = when.defer();
    /* Check for config file and copy from config.example.js
        if one doesn't exist. After that, start the server. */
    fs.exists('config.js', function checkConfig(configExists) {
        if (configExists) {
            loaded.resolve();
        } else {
            writeConfigFile().then(loaded.resolve).otherwise(loaded.reject);
        }
    });
    return loaded.promise;
};
