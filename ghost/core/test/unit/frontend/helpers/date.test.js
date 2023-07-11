const assert = require('assert/strict');
const sinon = require('sinon');
const should = require('should');

// Stuff we are testing
const date = require('../../../../core/frontend/helpers/date');

const moment = require('moment-timezone');

describe('{{date}} helper', function () {
    afterEach(function () {
        sinon.restore();
    });
    it('does not call moment locale method with a path', function () {
        const localeStub = sinon.stub(moment.prototype, 'locale');
        date.call('1970-01-01', {
            hash: {},
            data: {
                site: {
                    locale: '../../../content/files/1970/01/hax.js',
                    timezone: 'Europe/Dublin'
                }
            }
        });
        assert(localeStub.notCalled, 'locale should not have been called with a path');
    });

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

    it('allows user to override the site\'s locale and timezone', function () {
        const context = {
            hash: {
                format: 'ddd, DD MMM YYYY HH:mm:ss ZZ' // RFC 822
            },
            data: {
                site: {
                    timezone: 'Asia/Tokyo',
                    locale: 'ja-jp'
                }
            }
        };

        // Using the site locale by default, none specified in hash
        const published_at = '2013-12-31T23:58:58.593+02:00';
        String(date.call({published_at}, context)).should.equal('水, 01 1月 2014 06:58:58 +0900');

        // Overriding the site locale and timezone in hash
        context.hash.timezone = 'Europe/Paris';
        context.hash.locale = 'fr-fr';
        String(date.call({published_at}, context)).should.equal('mar., 31 déc. 2013 22:58:58 +0100');

        context.hash.timezone = 'Europe/Moscow';
        context.hash.locale = 'ru-ru';
        String(date.call({published_at}, context)).should.equal('ср, 01 янв. 2014 01:58:58 +0400');

        context.hash.locale = 'en-us';
        String(date.call({published_at}, context)).should.equal('Wed, 01 Jan 2014 01:58:58 +0400');
    });
});
