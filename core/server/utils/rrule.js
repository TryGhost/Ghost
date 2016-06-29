var RRule = require('rrule').RRule,
    moment = require('moment'),
    config = require(__dirname + '/../config'),
    errors = require(config.paths.corePath + '/server/errors');

// https://www.textmagic.com/free-tools/rrule-generator
exports.parseString = function (str) {
    return RRule.fromString(str);
};

exports.dateToString = function (date) {
    return moment(date).format('YYYYMMDDTHHmmss') + 'Z';
};

exports.getNextDate = function (options) {
    options = options || {};

    var rruleString = options.rruleString,
        date = options.date, time, rrule, tempDate;

    if (!rruleString) {
        throw new errors.IncorrectUsage('rrule: rruleString required');
    }

    rrule = exports.parseString(rruleString);

    if (date) {
        time = rrule.all(function (nextDate) {
            var nextDateMoment = moment(nextDate),
                dateDiff = nextDateMoment
                    .set('milliseconds', 0)
                    .diff(moment(date)
                        .set('hour', nextDateMoment.hour())
                        .set('minute', nextDateMoment.minutes())
                        .set('seconds', nextDateMoment.seconds())
                        .set('milliseconds', 0));

            if (dateDiff > 0 && !tempDate) {
                tempDate = nextDate;
                return true;
            }

            return dateDiff <= 0;
        });

        time = time.slice(-1);
    } else {
        time = rrule.all(function (date, index) {
            return index < 1;
        });
    }

    time = time[0];
    return time;
};

exports.createRRULEString = function (options) {
    var base = '';

    if (options.freq) {
        base += 'FREQ=';
        base += options.freq;
        base += ';';
    }

    if (options.startAt) {
        base += 'DTSTART=';
        base += options.startAt;
        base += ';';
    }

    if (options.endAt) {
        base += 'UNTIL=';
        base += options.endAt;
        base += ';';
    }

    if (options.monthday) {
        base += 'BYMONTHDAY=';
        base += options.monthday;
        base += ';';
    }

    if (options.day) {
        base += 'BYDAY=';
        base += options.day;
        base += ';';
    }

    if (options.hour) {
        base += 'BYHOUR=';
        base += options.hour;
        base += ';';
    }

    if (options.minutes) {
        base += 'BYMINUTE=';
        base += options.minutes;
        base += ';';
    }

    if (options.seconds) {
        base += 'BYSECOND=';
        base += options.seconds;
        base += ';';
    }

    if (options.setpos) {
        base += 'BYSETPOS=';
        base += '-1';
        base += ';';
    }

    base = base.slice(0, -1);
    return base;
};
