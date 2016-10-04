var bunyan = require('bunyan'),
    _ = require('lodash'),
    GhostPrettyStream = require('./PrettyStream');

function GhostLogger(options) {
    this.env = options.env;
    this.transports = options.transports || ['stdout'];
    this.level = options.level || 'info';
    this.mode = options.mode || 'short';
    this.path = options.path || 'ghost.log';
    this.rotation = options.rotation || false;
    this.loggers = {};

    this.setSerializers();
    this.setLoggers();
    this.setStreams();
}

// @TODO: add correlation identifier
// @TODO: res.on('finish') has no access to the response body
GhostLogger.prototype.setSerializers = function setSerializers() {
    var self = this;

    this.serializers = {
        req: function (req) {
            return {
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

GhostLogger.prototype.setLoggers = function setLoggers() {
    var self = this;

    this.log = {
        info: function (options) {
            var req = options.req,
                res = options.res;

            _.each(self.loggers, function (logger) {
                logger.log.info({
                    req: req,
                    res: res
                });
            });
        },
        debug: function (options) {
            var req = options.req,
                res = options.res;

            _.each(self.loggers, function (logger) {
                logger.log.debug({
                    req: req,
                    res: res
                });
            });
        },
        error: function (options) {
            var req = options.req,
                res = options.res,
                err = options.err;

            _.each(self.loggers, function (logger) {
                logger.log.error({
                    req: req,
                    res: res,
                    err: err
                });
            });
        }
    };
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
            prettyStdOut = new GhostPrettyStream();
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

    if (self.rotation) {
        streams.push({
            name: 'rotation',
            stream: {
                type: 'rotating-file',
                path: self.path,
                period: '1w',
                count: 3,
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
    var print = '';

    _.each(arguments, function (value) {
        print += value;
        print += ' ';
    });

    this.loggers.stdout.log.info(print);
};

GhostLogger.prototype.warn = function warn() {
    var print = '';

    _.each(arguments, function (value) {
        print += value;
        print += ' ';
    });

    this.loggers.stdout.log.warn(print);
};

GhostLogger.prototype.debug = function debug(options) {
    this.loggers.stdout.log.debug(options);
};

GhostLogger.prototype.error = function error(err) {
    this.log.error({err: err});
};

GhostLogger.prototype.request = function request(options) {
    var req = options.req,
        res = options.res,
        err = options.err;

    if (err) {
        this.log.error({req: req, res: res, err: err});
    } else {
        this.log.info({req: req, res: res});
    }
};

module.exports = GhostLogger;
