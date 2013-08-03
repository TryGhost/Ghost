/*globals describe, beforeEach, it*/
var _ = require("underscore"),
    should = require('should'),
    when = require('when'),
    sinon = require('sinon'),
    knex = require("../../server/models/base").Knex,
    helpers = require('./helpers'),
    migration = require('../../server/data/migration'),
    exporter = require('../../server/data/export'),
    importer = require('../../server/data/import'),
    Importer001 = require('../../server/data/import/001'),
    Importer002 = require('../../server/data/import/002'),
    errors = require('../../server/errorHandling');

describe("Import", function () {

    should.exist(exporter);
    should.exist(importer);

    beforeEach(function (done) {
        // clear database... we need to initialise it manually for each test
        helpers.clearData().then(function () {
            done();
        }, done);
    });

    it("resolves 001", function (done) {
        var importStub = sinon.stub(Importer001, "importData", function () {
                return when.resolve();
            }),
            fakeData = { test: true };

        importer("001", fakeData).then(function () {
            importStub.calledWith(fakeData).should.equal(true);

            importStub.restore();

            done();
        }).then(null, done);
    });

    describe("001", function () {
        this.timeout(4000);

        should.exist(Importer001);

        it("imports data from 001", function (done) {
            var exportData;

            // initialise database to version 001 - confusingly we have to set the max version to be one higher
            // than the migration version we want
            migration.migrateUpFromVersion('001', '002').then(function () {
                // export the version 001 data ready to import
                // TODO: Should have static test data here?
                return exporter("001");
            }).then(function (exported) {
                exportData = exported;

                // Version 001 exporter required the database be empty...
                var tables = [
                        'posts', 'users', 'roles', 'roles_users', 'permissions', 'permissions_roles',
                        'settings'
                    ],
                    truncateOps = _.map(tables, function (name) {
                        return knex(name).truncate();
                    });

                return when.all(truncateOps);
            }).then(function () {
                return importer("001", exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select()
                ]);
            }).then(function (importedData) {

                should.exist(importedData);
                importedData.length.should.equal(3);

                // we always have 0 users as there isn't one in fixtures
                importedData[0].length.should.equal(0);
                importedData[1].length.should.equal(exportData.data.posts.length);
                // version 001 settings have 7 fields
                importedData[2].length.should.equal(7);

                _.findWhere(exportData.data.settings, {key: "currentVersion"}).value.should.equal("001");

                done();
            }).then(null, done);
        });
    });

    it("resolves 002", function (done) {
        var importStub = sinon.stub(Importer002, "importData", function () {
                return when.resolve();
            }),
            fakeData = { test: true };

        importer("002", fakeData).then(function () {
            importStub.calledWith(fakeData).should.equal(true);

            importStub.restore();

            done();
        }).then(null, done);
    });

    describe("002", function () {
        this.timeout(4000);

        should.exist(Importer002);

        it("imports data from 001", function (done) {
            var exportData;

            // initialise database to version 001 - confusingly we have to set the max version to be one higher
            // than the migration version we want
            migration.migrateUpFromVersion('001', '002').then(function () {
                // export the version 001 data ready to import
                // TODO: Should have static test data here?
                return exporter("001");
            }).then(function (exported) {
                exportData = exported;

                // now migrate up to the proper version ready for importing - confusingly we have to set the max version
                // to be one higher than the migration version we want
                return migration.migrateUpFromVersion('002', '003');
            }).then(function () {
                return importer("002", exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select()
                ]);
            }).then(function (importedData) {

                should.exist(importedData);
                importedData.length.should.equal(3);

                // we always have 0 users as there isn't one in fixtures
                importedData[0].length.should.equal(0);
                // import no longer requires all data to be dropped, and adds posts
                importedData[1].length.should.equal(exportData.data.posts.length + 1);
                // version 002 settings have 10 fields, and settings get updated not inserted
                importedData[2].length.should.equal(10);

                _.findWhere(importedData[2], {key: "currentVersion"}).value.should.equal("002");

                done();
            }).then(null, done);
        });

        it("imports data from 002", function (done) {
            var exportData;

            // initialise database to version 001 - confusingly we have to set the max version to be one higher
            // than the migration version we want
            migration.migrateUpFromVersion('001', '003').then(function () {
                // export the version 002 data ready to import
                // TODO: Should have static test data here?
                return exporter("002");
            }).then(function (exported) {
                exportData = exported;

                return importer("002", exportData);
            }).then(function () {
                // Grab the data from tables
                return when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select()
                ]);
            }).then(function (importedData) {

                should.exist(importedData);
                importedData.length.should.equal(3);

                // we always have 0 users as there isn't one in fixtures
                importedData[0].length.should.equal(0);
                // import no longer requires all data to be dropped, and adds posts
                importedData[1].length.should.equal(exportData.data.posts.length + 1);
                // version 002 settings have 10 fields, and settings get updated not inserted
                importedData[2].length.should.equal(10);

                _.findWhere(importedData[2], {key: "currentVersion"}).value.should.equal("002");

                done();
            }).then(null, done);
        });
    });
});