var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers'),
    moment         = require('moment-timezone');

describe('{{date}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('is loaded', function () {
        should.exist(handlebars.helpers.date);
    });

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
                    blog: {
                        timezone: 'Europe/Dublin'
                    }
                }
            };

        testDates.forEach(function (d) {
            var rendered = helpers.date.call({published_at: d}, context);

            should.exist(rendered);
            rendered.should.equal(moment(d).tz(timezones).format(format));
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
                    blog: {
                        timezone: 'Europe/Dublin'
                    }
                }
            };

        testDates.forEach(function (d) {
            var rendered = helpers.date.call({published_at: d}, context);

            should.exist(rendered);
            rendered.should.equal(moment(d).tz(timezones).from(timeNow));
        });
    });
});
