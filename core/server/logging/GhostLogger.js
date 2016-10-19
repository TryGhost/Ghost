var bunyan = require('bunyan'),
    _ = require('lodash'),
    GhostPrettyStream = require('./PrettyStream');

function GhostLogger(options) {
    var self = this;

    this.env = options.env;
    this.transports = options.transports || ['stdout'];
    this.level = options.level || 'info';
    this.mode = options.mode || 'short';
    this.path = options.path || 'ghost.log';

    this.rotation = options.rotation || {
            enabled: false,
            period: '1w',
            count: 100
        };

    this.streams = {};
    this.setSerializers();

    _.each(this.transports, function (transport) {
        self['set' + transport.slice(0, 1).toUpperCase() + transport.slice(1) + 'Stream']();
    });
}

GhostLogger.prototype.setStdoutStream = function () {
    var prettyStdOut = new GhostPrettyStream({
        mode: this.mode
    });

    prettyStdOut.pipe(process.stdout);

    this.streams['stdout'] = {
        name: 'stdout',
        log: bunyan.createLogger({
            name: 'Log',
            streams: [{
                type: 'raw',
                stream: prettyStdOut,
                level: this.level
            }],
            serializers: this.serializers
        })
    };
};

GhostLogger.prototype.setFileStream = function () {
    this.streams['file'] = {
        name: 'file',
        log: bunyan.createLogger({
            name: 'Log',
            streams: [{
                path: this.path,
                level: this.level
            }],
            serializers: this.serializers
        })
    };

    if (this.rotation.enabled) {
        this.streams['rotation'] = {
            name: 'rotation',
            log: bunyan.createLogger({
                name: 'Log',
                streams: [{
                    type: 'rotating-file',
                    path: this.path,
                    period: this.rotation.period,
                    count: this.rotation.count,
                    level: this.level
                }],
                serializers: this.serializers
            })
        };
    }
};

// @TODO: add correlation identifier
// @TODO: res.on('finish') has no access to the response body
GhostLogger.prototype.setSerializers = function setSerializers() {
    var self = this;

    this.serializers = {
        req: function (req) {
            return {
                ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                url: req.url,
                method: req.method,
                originalUrl: req.originalUrl,
                params: req.params,
                headers: self.removeSensitiveData(req.headers),
                body: self.removeSensitiveData(req.body),
                query: self.removeSensitiveData(req.query)
            };
        },
        res: function (res) {
            return {
                _headers: self.removeSensitiveData(res._headers),
                statusCode: res.statusCode
            };
        },
        err: function (err) {
            return {
                name: err.errorType,
                statusCode: err.statusCode,
                level: err.level,
                message: err.message,
                context: err.context,
                help: err.help,
                stack: err.stack,
                hideStack: err.hideStack
            };
        }
    };
};

GhostLogger.prototype.removeSensitiveData = function removeSensitiveData(obj) {
    var newObj = {};

    _.each(obj, function (value, key) {
        if (!key.match(/pin|password|authorization|cookie/gi)) {
            newObj[key] = value;
        }
    });

    return newObj;
};

/**
 * Because arguments can contain lot's of different things, we prepare the arguments here.
 * This function allows us to use logging very flexible!
 *
 * logging.info('HEY', 'DU') --> is one string
 * logging.info({}, {}) --> is one object
 * logging.error(new Error()) --> is {err: new Error()}
 */
GhostLogger.prototype.log = function log(type, arguments) {
    var self = this,
        modifiedArguments;

    _.each(arguments, function (value) {
        if (value instanceof Error) {
            if (!modifiedArguments) {
                modifiedArguments = {};
            }

            modifiedArguments.err = value;
        }
        else if (_.isObject(value)) {
            if (!modifiedArguments) {
                modifiedArguments = {};
            }

            var keys = Object.keys(value);
            _.each(keys, function (key) {
                modifiedArguments[key] = value[key];
            });
        }
        else {
            if (!modifiedArguments) {
                modifiedArguments = '';
            }

            modifiedArguments += value;
            modifiedArguments += ' ';
        }
    });

    _.each(self.streams, function (logger) {
        logger.log[type](modifiedArguments);
    });
};

GhostLogger.prototype.info = function info() {
    this.log('info', arguments);
};

GhostLogger.prototype.warn = function warn() {
    this.log('warn', arguments);
};

GhostLogger.prototype.debug = function debug() {
    this.log('debug', arguments);
};

GhostLogger.prototype.error = function error() {
    this.log('error', arguments);
};

module.exports = GhostLogger;
