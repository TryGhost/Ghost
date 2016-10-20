// jscs:disable
var _ = require('lodash'),
    moment = require('moment'),
    Stream = require('stream').Stream,
    util = require('util'),
    format = util.format,
    prettyjson = require('prettyjson'),
    __private__ = {
        levelFromName: {
            10: 'trace',
            20: 'debug',
            30: 'info',
            40: 'warn',
            50: 'error',
            60: 'fatal'
        },
        colorForLevel: {
            10: 'grey',
            20: 'grey',
            30: 'cyan',
            40: 'magenta',
            50: 'red',
            60: 'inverse'
        },
        colors: {
            'bold': [1, 22],
            'italic': [3, 23],
            'underline': [4, 24],
            'inverse': [7, 27],
            'white': [37, 39],
            'grey': [90, 39],
            'black': [30, 39],
            'blue': [34, 39],
            'cyan': [36, 39],
            'green': [32, 39],
            'magenta': [35, 39],
            'red': [31, 39],
            'yellow': [33, 39]
        }
    };


function PrettyStream(options) {
    this.mode = options.mode || 'short';
}
util.inherits(PrettyStream, Stream);


function colorize(color, value) {
    return '\x1B[' + __private__.colors[color][0] + 'm' + value + '\x1B[' + __private__.colors[color][1] + 'm';
}


PrettyStream.prototype.write = function write(data) {
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (err) {
            this.emit('data', err);
        }
    }

    var output = '',
        time = moment(data.time).format('YYYY-MM-DD HH:mm:ss'),
        logLevel = __private__.levelFromName[data.level].toUpperCase(),
        codes = __private__.colors[__private__.colorForLevel[data.level]],
        bodyPretty = '';

    logLevel = '\x1B[' + codes[0] + 'm' + logLevel + '\x1B[' + codes[1] + 'm';

    // CASE: bunyan passes each plain string/integer as `msg` attribute (logging.info('Hey!'))
    if (data.msg) {
        bodyPretty += data.msg;

        output += format('[%s] %s %s\n',
            time,
            logLevel,
            bodyPretty
        );
    }
    // CASE: log objects in pretty JSON format
    else {
        // common log format:
        // 127.0.0.1 user-identifier user-id [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326

        // if all values are available we log in common format
        // can be extended to define from outside, but not important
        try {
            output += format('%s [%s] "%s %s" %s %s\n',
                logLevel,
                time,
                data.req.method.toUpperCase(),
                data.req.originalUrl,
                data.res.statusCode,
                data.res.responseTime
            );
        } catch (err) {
            output += format('[%s] %s\n',
                time,
                logLevel
            );
        }

        _.each(_.omit(data, ['time', 'level', 'name', 'hostname', 'pid', 'v', 'msg']), function (value, key) {
            // we always output errors for now
            if (_.isObject(value) && value.message && value.stack) {
                var error = '\n';
                error += colorize('red', value.message) + '\n';

                if (value.level) {
                    error += colorize('white', 'level:') + colorize('white', value.level) + '\n\n';
                }

                if (value.context) {
                    error += colorize('white', value.context) + '\n';
                }

                if (value.help) {
                    error += colorize('yellow', value.help) + '\n';
                }

                if (value.errorDetails) {
                    error += prettyjson.render(value.errorDetails, {}) + '\n';
                }

                if (value.stack && !value.hideStack) {
                    error += colorize('white', value.stack) + '\n';
                }

                output += format('%s\n', colorize('red', error));
            }
            else if (_.isObject(value)) {
                bodyPretty += '\n' + colorize('yellow', key.toUpperCase()) + '\n';

                var sanitized = {};

                _.each(value, function (innerValue, innerKey) {
                    if (!_.isEmpty(innerValue)) {
                        sanitized[innerKey] = innerValue;
                    }
                });

                bodyPretty += prettyjson.render(sanitized, {}) + '\n';
            } else {
                bodyPretty += prettyjson.render(value, {}) + '\n';
            }
        });

        if (this.mode !== 'short') {
            output += format('%s\n', colorize('grey', bodyPretty));
        }
    }

    try {
        this.emit('data', output);
    } catch (err) {
        this.emit('data', err);
    }

    return true;
};

module.exports = PrettyStream;
