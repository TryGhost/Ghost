const sinon = require('sinon');
const should = require('should');

// Stuff we are testing
const date = require('../../../../core/frontend/helpers/date');

const moment = require('moment-timezone');

describe('{{date}} helper', function () {
    it('creates properly formatted date strings', function () {
        const testDates = [
            '2013-12-31T11:28:58.593+02:00',
            '2014-01-01T01:28:58.593+11:00',
            '2014-02-20T01:28:58.593-04:00',
            '2014-03-01T01:28:58.593+00:00'
        ];

        const timezone = 'Europe/Dublin';
        const format = 'MMM Do, YYYY';

        const context = {
            hash: {
                format: format
            },
            data: {
                site: {
                    timezone
                }
            }
        };

        let rendered;

        testDates.forEach(function (d) {
            rendered = date.call({published_at: d}, context);

            should.exist(rendered);
            String(rendered).should.equal(moment(d).tz(timezone).format(format));

            rendered = date.call({}, d, context);

            should.exist(rendered);
            String(rendered).should.equal(moment(d).tz(timezone).format(format));
        });

        // No date falls back to now
        rendered = date.call({}, context);
        should.exist(rendered);
        String(rendered).should.equal(moment().tz(timezone).format(format));
    });

    it('creates properly localised date strings', function () {
        const testDates = [
            '2013-12-31T23:58:58.593+02:00',
            '2014-01-01T00:28:58.593+11:00',
            '2014-11-20T01:28:58.593-04:00',
            '2014-03-01T01:28:58.593+00:00'
        ];

        const locales = [
            'en',
            'en-gb',
            'de'
        ];

        const timezone = 'Europe/Dublin';
        const format = 'll';

        locales.forEach(function (locale) {
            let rendered;

            const context = {
                hash: {},
                data: {
                    site: {
                        timezone,
                        locale
                    }
                }
            };

            testDates.forEach(function (d) {
                rendered = date.call({published_at: d}, context);

                should.exist(rendered);
                String(rendered).should.equal(moment(d).tz(timezone).locale(locale).format(format));

                rendered = date.call({}, d, context);

                should.exist(rendered);
                String(rendered).should.equal(moment(d).tz(timezone).locale(locale).format(format));
            });

            // No date falls back to now
            rendered = date.call({}, context);
            should.exist(rendered);
            String(rendered).should.equal(moment().tz(timezone).locale(locale).format(format));
        });
    });

    it('creates properly formatted time ago date strings', function () {
        const testDates = [
            '2013-12-31T23:58:58.593+02:00',
            '2014-01-01T00:28:58.593+11:00',
            '2014-11-20T01:28:58.593-04:00',
            '2014-03-01T01:28:58.593+00:00'
        ];

        const timezone = 'Europe/Dublin';
        const timeNow = moment().tz('Europe/Dublin');

        const context = {
            hash: {
                timeago: true
            },
            data: {
                site: {
                    timezone
                }
            }
        };

        let rendered;

        testDates.forEach(function (d) {
            rendered = date.call({published_at: d}, context);

            should.exist(rendered);
            String(rendered).should.equal(moment(d).tz(timezone).from(timeNow));

            rendered = date.call({}, d, context);

            should.exist(rendered);
            String(rendered).should.equal(moment(d).tz(timezone).from(timeNow));
        });

        // No date falls back to now
        rendered = date.call({}, context);
        should.exist(rendered);
        String(rendered).should.equal('a few seconds ago');
    });

    it('ignores an invalid date, defaulting to now', function () {
        const timezone = 'Europe/Dublin';
        const timeNow = moment().tz('Europe/Dublin');

        const context = {
            hash: {
                timeago: true
            },
            data: {
                site: {
                    timezone
                }
            }
        };

        let invalidDate = 'Fred';
        let rendered;

        rendered = date.call({published_at: invalidDate}, context);

        should.exist(rendered);
        String(rendered).should.equal('a few seconds ago');

        rendered = date.call({}, invalidDate, context);

        should.exist(rendered);
        String(rendered).should.equal('a few seconds ago');
    });
});
