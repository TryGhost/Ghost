var bunyan = require('bunyan'),
    _ = require('lodash'),
    GhostPrettyStream = require('./PrettyStream');

function GhostLogger(options) {
    var self = this;

    this.env = options.env;
    this.domain = options.domain || 'localhost';
    this.transports = options.transports || ['stdout'];
    this.level = options.level || 'info';
    this.mode = options.mode || 'short';
    this.path = options.path || process.cwd();

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

    this.streams.stdout = {
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

/**
 * by default we log into two files
 * 1. file-errors: all errors only
 * 2. file-all: everything
 */
GhostLogger.prototype.setFileStream = function () {
    this.streams['file-errors'] = {
        name: 'file',
        log: bunyan.createLogger({
            name: 'Log',
            streams: [{
                path: this.path + this.domain + '_' + '.error.log',
                level: 'error'
            }],
            serializers: this.serializers
        })
    };

    this.streams['file-all'] = {
        name: 'file',
        log: bunyan.createLogger({
            name: 'Log',
            streams: [{
                path: this.path + this.domain + '_' + '.log',
                level: this.level
            }],
            serializers: this.serializers
        })
    };

    if (this.rotation.enabled) {
        this.streams['rotation-errors'] = {
            name: 'rotation-errors',
            log: bunyan.createLogger({
                name: 'Log',
                streams: [{
                    type: 'rotating-file',
                    path: this.path + this.domain + '_' + '.error.log',
                    period: this.rotation.period,
                    count: this.rotation.count,
                    level: this.level
                }],
                serializers: this.serializers
            })
        };

        this.streams['rotation-all'] = {
            name: 'rotation-all',
            log: bunyan.createLogger({
                name: 'Log',
                streams: [{
                    type: 'rotating-file',
                    path: this.path + this.domain + '_' + '.log',
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
                meta: {
                    requestId: req.requestId,
                    userId: req.userId
                },
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
                statusCode: res.statusCode,
                responseTime: res.responseTime
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
GhostLogger.prototype.log = function log(type, args) {
    var self = this,
        modifiedArguments;

    _.each(args, function (value) {
        if (value instanceof Error) {
            if (!modifiedArguments) {
                modifiedArguments = {};
            }

            modifiedArguments.err = value;
        } else if (_.isObject(value)) {
            if (!modifiedArguments) {
                modifiedArguments = {};
            }

            var keys = Object.keys(value);
            _.each(keys, function (key) {
                modifiedArguments[key] = value[key];
            });
        } else {
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

GhostLogger.prototype.error = function error() {
    this.log('error', arguments);
};

module.exports = GhostLogger;
