var should = require('should'),

    // Stuff we are testing
    helpers = require('../../../frontend/helpers'),
    moment = require('moment-timezone');

describe('{{date}} helper', function () {
    it('creates properly formatted date strings', function () {
        var testDates = [
                '2013-12-31T11:28:58.593+02:00',
                '2014-01-01T01:28:58.593+11:00',
                '2014-02-20T01:28:58.593-04:00',
                '2014-03-01T01:28:58.593+00:00'
            ],
            timezones = 'Europe/Dublin',
            format = 'MMM Do, YYYY',
            context = {
                hash: {
                    format: format
                },
                data: {
                    site: {
                        timezone: 'Europe/Dublin'
                    }
                }
            };

        testDates.forEach(function (d) {
            var rendered = helpers.date.call({published_at: d}, context);

            should.exist(rendered);
            String(rendered).should.equal(moment(d).tz(timezones).format(format));
        });
    });

    it('creates properly formatted time ago date strings', function () {
        var testDates = [
                '2013-12-31T23:58:58.593+02:00',
                '2014-01-01T00:28:58.593+11:00',
                '2014-11-20T01:28:58.593-04:00',
                '2014-03-01T01:28:58.593+00:00'
            ],
            timezones = 'Europe/Dublin',
            timeNow = moment().tz('Europe/Dublin'),
            context = {
                hash: {
                    timeago: true
                },
                data: {
                    site: {
                        timezone: 'Europe/Dublin'
                    }
                }
            };

        testDates.forEach(function (d) {
            var rendered = helpers.date.call({published_at: d}, context);

            should.exist(rendered);
            String(rendered).should.equal(moment(d).tz(timezones).from(timeNow));
        });
    });
});
