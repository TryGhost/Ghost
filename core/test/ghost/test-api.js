/*global require, module */
(function () {
    "use strict";

    // Use 'testing' Ghost config
    process.env.NODE_ENV = 'testing';

    var _        = require('underscore'),
        assert   = require('assert'),
        helpers  = require('./helpers'),
        fixtures = require('../../shared/data/fixtures/001'),
        api = require('../../shared/data/api');

    function fail(err) {
        process.nextTick(function () {
            assert.ifError(err);
        });
    }

    module.exports = {
        setUp: function (done) {
            // Clear database
            helpers.resetData().then(function () {
                done();
            }, fail);
        },

        'settings:browse': function (test) {
            test.expect(1);
            api.settings.browse().then(function (settings) {
                settings = _.map(settings.toJSON(), function (item) {
                    return _.omit(item, 'id', 'updated_at', 'created_at');
                });
                test.deepEqual(settings, fixtures.settings);
                test.done();
            }).then(null, fail);
        },

        'settings:read': function (test) {
            api.settings.read('title', function (setting) {
                test.done();
            }).then(null, fail);
        },

        'settings:edit': function (test) {
            test.expect(2);
            api.settings.edit('title', "Jenna O'Neil").then(function (title) {
                title = title.toJSON();
                test.equal(title.key, 'title');
                test.equal(title.value, "Jenna O'Neil");
                test.done();
            }).then(null, fail);
        }
    };

}());