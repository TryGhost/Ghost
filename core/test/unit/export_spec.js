/*globals describe, before, beforeEach, afterEach, it*/
var testUtils = require('./testUtils'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    _ = require("underscore"),
    errors = require('../../server/errorHandling'),

    // Stuff we are testing
    migration = require('../../server/data/migration'),
    exporter = require('../../server/data/export'),
    Settings = require('../../server/models/settings').Settings;

describe("Exporter", function () {

    should.exist(exporter);

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        this.timeout(5000);
        testUtils.initData().then(function () {
            done();
        }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it("exports data", function (done) {
        // Stub migrations to return 000 as the current database version
        var migrationStub = sinon.stub(migration, "getDatabaseVersion", function () {
            return when.resolve("000");
        });

        exporter().then(function (exportData) {
            var tables = ['posts', 'users', 'roles', 'roles_users', 'permissions', 'permissions_roles', 'permissions_users',
                'settings', 'tags', 'posts_tags'];

            should.exist(exportData);

            should.exist(exportData.meta);
            should.exist(exportData.data);

            exportData.meta.version.should.equal("000");
            _.findWhere(exportData.data.settings, {key: "databaseVersion"}).value.should.equal("000");

            _.each(tables, function (name) {
                should.exist(exportData.data[name]);
            });
            // should not export sqlite data
            should.not.exist(exportData.data.sqlite_sequence);

            migrationStub.restore();
            done();
        }).then(null, done);
    });
});
