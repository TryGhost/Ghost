/*global require, module */
(function () {
    "use strict";

    // Use 'testing' Ghost config
    process.env.NODE_ENV = 'testing';

    var fs       = require('fs'),
        path     = require('path'),
        _        = require('underscore'),
        assert   = require('assert'),
        delay    = require('when/delay'),
        config   = require('../../../config'),
        fixtures = require('../../shared/data/fixtures/001'),
        api;

    function fail (err) {
        process.nextTick(function(){
            assert.ifError(err);
        });
    }

    module.exports = {
        setUp: function (done) {
            // Clear database
            var dbpath = path.resolve(__dirname, '../../../', config.database.testing.connection.filename);
            fs.unlink(dbpath, function(){
                // There is currently no way to tell when Ghost is loaded. api instantiates it's own `Ghost`
                // which will run migrations without making the promise externally accessible
                api = require('../../shared/api');
                // So we just sit for a while :/
                setTimeout(done, 3000);
            });
        },

        'settings:browse': function (test) {
            test.expect(1);
            api.settings.browse().then(function (settings) {
                settings = _.map(settings.toJSON(), function (item) {
                    return _.omit(item, 'id', 'updated_at', 'created_at')
                });
                test.deepEqual(settings, fixtures.settings);
                test.done();
            }).then(null, fail);
        },

        // 'settings:read': function (test) {
        //     api.settings.read('title', function (setting) {
        //         console.log(setting);
        //         test.done();
        //     }).then(null, fail);
        // },

        // 'settings:edit': function (test) {
        //     test.expect(2);
        //     api.settings.edit('title', "Jenna O'Neil").then(function (title) {
        //         title = title.toJSON();
        //         console.log('got title')
        //         test.equal(title.key, 'title');
        //         test.equal(title.value, "Jenna O'Neil");
        //         test.done();
        //     }).then(null, fail);
        // }
    };

}());