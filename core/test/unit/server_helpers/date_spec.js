/*globals describe, before, it*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers'),
    moment         = require('moment');

describe('{{date}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('is loaded', function () {
        should.exist(handlebars.helpers.date);
    });

    // TODO: When timezone support is added these tests should be updated
    //       to test the output of the helper against static strings instead
    //       of calling moment().  Without timezone support the output of this
    //       helper may differ depending on what timezone the tests are run in.

    it('creates properly formatted date strings', function () {
        var testDates = [
                '2013-12-31T11:28:58.593Z',
                '2014-01-01T01:28:58.593Z',
                '2014-02-20T01:28:58.593Z',
                '2014-03-01T01:28:58.593Z'
            ],
            format = 'MMM Do, YYYY',
            context = {
                hash: {
                    format: format
                }
            };

        testDates.forEach(function (d) {
            var rendered = helpers.date.call({published_at: d}, context);

            should.exist(rendered);
            rendered.should.equal(moment(d).format(format));
        });
    });

    it('creates properly formatted time ago date strings', function () {
        var testDates = [
                '2013-12-31T23:58:58.593Z',
                '2014-01-01T00:28:58.593Z',
                '2014-11-20T01:28:58.593Z',
                '2014-03-01T01:28:58.593Z'
            ],
            context = {
                hash: {
                    timeago: true
                }
            };

        testDates.forEach(function (d) {
            var rendered = helpers.date.call({published_at: d}, context);

            should.exist(rendered);
            rendered.should.equal(moment(d).fromNow());
        });
    });
});
