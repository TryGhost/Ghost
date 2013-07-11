/*globals describe, beforeEach, it*/
var _ = require("underscore"),
    should = require('should'),
    when = require('when'),
    sinon = require('sinon'),
    helpers = require('./helpers'),
    exporter = require('../../shared/data/export'),
    Exporter001 = require('../../shared/data/export/001'),
    errors = require('../../shared/errorHandling');

describe("Export", function () {

    should.exist(exporter);

    beforeEach(function (done) {
        helpers.resetData().then(function () {
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
            exporter("001").then(function (exportData) {
                var tables = ['posts', 'users', 'roles', 'roles_users', 'permissions', 'permissions_roles', 'settings'];

                should.exist(exportData);

                should.exist(exportData.meta);
                should.exist(exportData.data);

                exportData.meta.version.should.equal("001");

                _.each(tables, function (name) {
                    should.exist(exportData.data[name]);
                });

                done();
            }).then(null, done);
        });
    });
});