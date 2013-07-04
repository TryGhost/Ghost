/*globals describe, beforeEach, it*/
var _ = require("underscore"),
    should = require('should'),
    when = require('when'),
    sinon = require('sinon'),
    knex = require("../../shared/models/base").Knex,
    helpers = require('./helpers'),
    exporter = require('../../shared/data/export'),
    importer = require('../../shared/data/import'),
    Importer001 = require('../../shared/data/import/001'),
    errors = require('../../shared/errorHandling');

describe("Import", function () {

    should.exist(exporter);

    beforeEach(function (done) {
        helpers.resetData().then(function () {
            done();
        }, errors.logAndThrowError);
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
        }, errors.logAndThrowError);
    });

    describe("001", function () {
        this.timeout(4000);

        should.exist(Importer001);

        it("imports data from 001", function (done) {
            var exportData;
            // TODO: Should have static test data here?
            exporter("001").then(function (exported) {
                exportData = exported;

                // Clear the data from all tables.
                var tables = ['posts', 'users', 'roles', 'roles_users', 'permissions', 'permissions_roles', 'settings'],
                    truncateOps = _.map(tables, function (name) {
                        return knex(name).truncate();
                    });

                return when.all(truncateOps);
            }).then(function () {
                return importer("001", exportData);
            }).then(function (importResult) {
                // Grab the data from tables
                return when.all([
                    knex("users").select(),
                    knex("posts").select(),
                    knex("settings").select()
                ]);
            }).then(function (importedData) {

                should.exist(importedData);
                importedData.length.should.equal(3);

                importedData[0].length.should.equal(exportData.data.users.length);
                importedData[1].length.should.equal(exportData.data.posts.length);
                importedData[2].length.should.equal(exportData.data.settings.length);

                done();
            }).otherwise(errors.logAndThrowError);
        });
    });
});