/*globals describe, before,it*/

var utils = require('../../../server/utils'),
    sinon = require('sinon'),
    should = require('should'),
    moment = require('moment'),
    lodash = require('lodash');

describe('utils: rrule', function () {
    var scope = {};

    describe('fn: parseString', function () {
        before(function () {
            scope.createRRULEString = function (options) {
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
                // console.log(base);
                return base;
            }
        });

        describe('daily at a time', function () {
            it('without UNTIL, without START', function () {
                var rrule = utils.rrule.parseString(scope.createRRULEString({
                        freq: 'DAILY',
                        hour: 12,
                        minutes: 30,
                        seconds: 30
                    })),
                    dates = rrule.all(function (date, index) {
                        return index < 2;
                    });

                dates.length.should.eql(2);
                dates[0].toString().should.containEql('12:30:30');
                dates[1].toString().should.containEql('12:30:30');
            });

            it('without UNTIL', function () {
                var startAt = utils.rrule.dateToString(moment('2016-05-27').toDate()),
                    rrule = utils.rrule.parseString(scope.createRRULEString({
                        freq: 'DAILY',
                        startAt: startAt,
                        hour: 15,
                        minutes: 20,
                        seconds: 0
                    })),
                    dates = rrule.all(function (date, index) {
                        return index < 3;
                    });

                dates.length.should.eql(3);
                dates[0].toString().should.eql('Fri May 27 2016 15:20:00 GMT+0200 (CEST)');
                dates[1].toString().should.eql('Sat May 28 2016 15:20:00 GMT+0200 (CEST)');
                dates[2].toString().should.eql('Sun May 29 2016 15:20:00 GMT+0200 (CEST)');
            });

            it('with UNTIL', function () {
                var startAt = utils.rrule.dateToString(moment('2015-12-31').toDate()),
                    endAt = utils.rrule.dateToString(moment('2015-12-31').add(1, 'weeks').toDate()),
                    rrule = utils.rrule.parseString(scope.createRRULEString({
                        freq: 'DAILY',
                        startAt: startAt,
                        endAt: endAt,
                        hour: 15,
                        minutes: 20
                    })),
                    dates = rrule.all();

                dates.length.should.eql(7);
                dates[0].toString().should.eql('Thu Dec 31 2015 15:20:00 GMT+0100 (CET)');
                dates[1].toString().should.eql('Fri Jan 01 2016 15:20:00 GMT+0100 (CET)');
                dates[2].toString().should.eql('Sat Jan 02 2016 15:20:00 GMT+0100 (CET)');
                dates[3].toString().should.eql('Sun Jan 03 2016 15:20:00 GMT+0100 (CET)');
                dates[4].toString().should.eql('Mon Jan 04 2016 15:20:00 GMT+0100 (CET)');
                dates[5].toString().should.eql('Tue Jan 05 2016 15:20:00 GMT+0100 (CET)');
                dates[6].toString().should.eql('Wed Jan 06 2016 15:20:00 GMT+0100 (CET)');
            });
        });

        describe('weekly on day at time', function () {
            it('on monday at 12: with START and UNTIL', function () {
                var startAt = utils.rrule.dateToString(moment('2016-07-01').toDate()),
                    endAt = utils.rrule.dateToString(moment('2018-07-01').toDate()),
                    rrule = utils.rrule.parseString(scope.createRRULEString({
                        freq: 'WEEKLY',
                        startAt: startAt,
                        endAt: endAt,
                        day: 'MO',
                        hour: 12,
                        minutes: 00,
                        seconds: 00
                    })),
                    dates = rrule.all();

                dates.length.should.eql(104);
                dates[0].toString().should.eql('Mon Jul 04 2016 12:00:00 GMT+0200 (CEST)');
                dates[1].toString().should.eql('Mon Jul 11 2016 12:00:00 GMT+0200 (CEST)');
            });
        });

        describe('monthly on specific date at time', function () {
            it('on 31th at 10: with START and UNTIL', function () {
                var startAt = utils.rrule.dateToString(moment('2016-05-15').toDate()),
                    endAt = utils.rrule.dateToString(moment('2016-12-31').toDate()),
                    rrule = utils.rrule.parseString(scope.createRRULEString({
                        freq: 'MONTHLY',
                        startAt: startAt,
                        endAt: endAt,
                        monthday: '28,29,30,31',
                        setpos: true,
                        hour: 10,
                        minutes: '00',
                        seconds: '00'
                    })),
                    dates = rrule.all();

                dates.length.should.eql(7);
                dates[0].toString().should.eql('Tue May 31 2016 10:00:00 GMT+0200 (CEST)');
                dates[1].toString().should.eql('Thu Jun 30 2016 10:00:00 GMT+0200 (CEST)');
                dates[2].toString().should.eql('Sun Jul 31 2016 10:00:00 GMT+0200 (CEST)');
            });
        });

        describe('monthly on first/last weekday at time', function () {
            it('last monday at 14.30: with START and UNTIL', function () {
                var startAt = utils.rrule.dateToString(moment('2016-07-01').toDate()),
                    endAt = utils.rrule.dateToString(moment('2016-09-01').toDate()),
                    rrule = utils.rrule.parseString(scope.createRRULEString({
                        freq: 'MONTHLY',
                        startAt: startAt,
                        endAt: endAt,
                        day: '-1MO',
                        hour: 14,
                        minutes: 30,
                        seconds: '00'
                    })),
                    dates = rrule.all();

                dates.length.should.eql(2);
                dates[0].toString().should.containEql('Mon Jul 25 2016 14:30:00 GMT+0200 (CEST)');
                dates[1].toString().should.containEql('Mon Aug 29 2016 14:30:00 GMT+0200 (CEST)');
            });

            it('first wednesday at 9: with START and UNTIL', function () {
                var startAt = utils.rrule.dateToString(moment('2016-07-01').toDate()),
                    endAt = utils.rrule.dateToString(moment('2016-09-01').toDate()),
                    rrule = utils.rrule.parseString(scope.createRRULEString({
                        freq: 'MONTHLY',
                        startAt: startAt,
                        endAt: endAt,
                        day: '+1WE',
                        hour: 9,
                        minutes: '00',
                        seconds: '00'
                    })),
                    dates = rrule.all();

                dates.length.should.eql(2);
                dates[0].toString().should.containEql('Wed Jul 06 2016 09:00:00 GMT+0200 (CEST)');
                dates[1].toString().should.containEql('Wed Aug 03 2016 09:00:00 GMT+0200 (CEST)');
            });
        });
    });
});
