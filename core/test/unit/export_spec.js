/*globals describe, beforeEach, it*/
var _ = require("underscore"),
    should = require('should'),
    when = require('when'),
    sinon = require('sinon'),
    helpers = require('./helpers'),
    migration = require('../../server/data/migration'),
    exporter = require('../../server/data/export'),
    Exporter001 = require('../../server/data/export/001'),
    Exporter002 = require('../../server/data/export/002'),
    errors = require('../../server/errorHandling');

describe("Export", function () {

    should.exist(exporter);

    beforeEach(function (done) {
        // clear database... we need to initialise it manually for each test
        helpers.clearData().then(function () {
            done();
        }, done);
    });

    it("resolves 001", function (done) {
        var exportStub = sinon.stub(Exporter001, "exportData", function () {
            return when.resolve();
        });

        exporter("001").then(function () {
            exportStub.called.should.equal(true);

            exportStub.restore();

            done();
        }).then(null, done);
    });

    describe("001", function () {

        should.exist(Exporter001);

        it("exports data", function (done) {
            // initialise database to version 001 - confusingly we have to set the max version to be one higher
            // than the migration version we want
            migration.migrateUpFromVersion('001', '002').then(function () {
                return exporter("001");
            }).then(function (exportData) {
                var tables = ['posts', 'users', 'roles', 'roles_users', 'permissions', 'permissions_roles', 'settings'];

                should.exist(exportData);

                should.exist(exportData.meta);
                should.exist(exportData.data);

                exportData.meta.version.should.equal("001");
                _.findWhere(exportData.data.settings, {key: "currentVersion"}).value.should.equal("001");

                _.each(tables, function (name) {
                    should.exist(exportData.data[name]);
                });
                // 002 data should not be present
                should.not.exist(exportData.data.tags);

                done();
            }).then(null, done);
        });
    });

    it("resolves 002", function (done) {
        var exportStub = sinon.stub(Exporter002, "exportData", function () {
            return when.resolve();
        });

        exporter("002").then(function () {
            exportStub.called.should.equal(true);

            exportStub.restore();

            done();
        }).then(null, done);
    });

    describe("002", function () {

        should.exist(Exporter001);

        it("exports data", function (done) {
            // initialise database to version 001 - confusingly we have to set the max version to be one higher
            // than the migration version we want
            migration.migrateUpFromVersion('001', '003').then(function () {
                return exporter("002");
            }).then(function (exportData) {
                var tables = [
                    'posts', 'users', 'roles', 'roles_users', 'permissions', 'permissions_roles',
                    'settings', 'tags', 'posts_tags', 'custom_data', 'posts_custom_data'
                ];

                should.exist(exportData);

                should.exist(exportData.meta);
                should.exist(exportData.data);

                exportData.meta.version.should.equal("002");
                _.findWhere(exportData.data.settings, {key: "currentVersion"}).value.should.equal("002");

                _.each(tables, function (name) {
                    should.exist(exportData.data[name]);
                });

                done();
            }).then(null, done);
        });
    });
});