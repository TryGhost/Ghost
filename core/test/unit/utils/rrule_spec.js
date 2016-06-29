var config = require(__dirname + '/../../../server/config'),
    utils = require(config.paths.corePath + '/server/utils'),
    errors = require(config.paths.corePath + '/server/errors'),
    sinon = require('sinon'),
    should = require('should'),
    moment = require('moment'),
    lodash = require('lodash');

describe('utils: rrule', function () {
    describe('fn: getNextDate', function () {
        describe('success cases', function () {
            it('rruleString', function () {
                var date = utils.rrule.getNextDate({
                    rruleString: utils.rrule.createRRULEString({
                        freq: 'MONTHLY',
                        monthday: '1',
                        hour: 12,
                        minutes: '00',
                        seconds: '00'
                    })
                });

                moment(date).format('YYYY-MM-DD').should.eql(moment().add(1, 'month').startOf('month').format('YYYY-MM-DD'));
            });

            it('rruleString: no time specified', function () {
                var date = utils.rrule.getNextDate({
                    rruleString: utils.rrule.createRRULEString({
                        freq: 'MONTHLY',
                        monthday: '28,29,30,31',
                        setpos: true
                    })
                });

                moment(date).format('YYYY-MM-DD').should.eql(moment().endOf('month').format('YYYY-MM-DD'));
            });

            it('rruleString and date', function () {
                var date = utils.rrule.getNextDate({
                    rruleString: utils.rrule.createRRULEString({
                        freq: 'MONTHLY',
                        monthday: '1',
                        hour: 12,
                        minutes: '00',
                        seconds: '00'
                    }),
                    date: moment().add(2, 'month').startOf('month').startOf('day').set('hours', 10).toDate()
                });

                moment(date).format('YYYY-MM-DD').should.eql(moment().add(3, 'month').startOf('month').format('YYYY-MM-DD'));
            });

            it('rruleString and date: no time specified', function () {
                var date = utils.rrule.getNextDate({
                    rruleString: utils.rrule.createRRULEString({
                        freq: 'MONTHLY',
                        monthday: '28,29,30,31',
                        setpos: true
                    }),
                    date: moment().add(1, 'month').endOf('month').toDate()
                });

                moment(date).format('YYYY-MM-DD').should.eql(moment().add(2, 'month').endOf('month').format('YYYY-MM-DD'));
            });
        });

        describe('error cases', function () {
            it('rruleString missing', function (done) {
                try {
                    utils.rrule.getNextDate();
                } catch (err) {
                    (err instanceof errors.IncorrectUsage).should.eql(true);
                    return done();
                }

                done(new Error('we expected an error'));
            });
        });
    });

    describe('fn: parseString', function () {
        describe('success cases', function () {
            describe('daily at a time', function () {
                it('without UNTIL, without START', function () {
                    var rrule = utils.rrule.parseString(utils.rrule.createRRULEString({
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
                        rrule = utils.rrule.parseString(utils.rrule.createRRULEString({
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
                        rrule = utils.rrule.parseString(utils.rrule.createRRULEString({
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
                        rrule = utils.rrule.parseString(utils.rrule.createRRULEString({
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
                        rrule = utils.rrule.parseString(utils.rrule.createRRULEString({
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
                        rrule = utils.rrule.parseString(utils.rrule.createRRULEString({
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
                        rrule = utils.rrule.parseString(utils.rrule.createRRULEString({
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

        describe('error cases', function () {
            it('RRULE is invalid', function () {
                should.not.exist(utils.rrule.parseString('FREQ:1234'));
            });
        });
    });
});
