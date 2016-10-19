var bunyan = require('bunyan'),
    _ = require('lodash'),
    GhostPrettyStream = require('./PrettyStream');

function GhostLogger(options) {
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

    this.loggers = {};
    this.setSerializers();
    this.setStreams();
}

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

    _.each(self.loggers, function (logger) {
        logger.log[type](modifiedArguments);
    });
};

GhostLogger.prototype.setStreams = function setStreams() {
    var self = this,
        streams = [],
        prettyStdOut;

    _.each(self.transports, function (transport) {
        if (transport === 'file') {
            streams.push({
                name: 'file',
                stream: {
                    path: self.path,
                    level: self.level
                }
            });
        }

        if (transport === 'stdout') {
            prettyStdOut = new GhostPrettyStream({
                mode: self.mode
            });

            prettyStdOut.pipe(process.stdout);

            streams.push({
                name: 'stdout',
                stream: {
                    type: 'raw',
                    stream: prettyStdOut,
                    level: self.level
                }
            });
        }
    });

    if (self.rotation.enabled) {
        streams.push({
            name: 'rotation',
            stream: {
                type: 'rotating-file',
                path: self.path,
                period: self.rotation.period,
                count: self.rotation.count,
                level: self.level
            }
        });
    }

    // the env defines which streams are available
    _.each(streams, function (stream) {
        self.loggers[stream.name] = {
            name: stream.name,
            log: bunyan.createLogger({
                name: 'Log',
                streams: [stream.stream],
                serializers: self.serializers
            })
        };
    });
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
