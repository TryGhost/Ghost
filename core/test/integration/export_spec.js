/*globals describe, before, beforeEach, afterEach, it*/
var testUtils   = require('../utils/index'),
    should      = require('should'),
    sinon       = require('sinon'),
    Promise     = require('bluebird'),
    _           = require('lodash'),

    // Stuff we are testing
    versioning  = require('../../server/data/schema').versioning,
    exporter    = require('../../server/data/export/index'),

    DEF_DB_VERSION  = versioning.getDefaultDatabaseVersion(),
    sandbox = sinon.sandbox.create();

describe('Exporter', function () {
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    afterEach(function () {
        sandbox.restore();
    });
    beforeEach(testUtils.setup('default'));

    should.exist(exporter);

    it('exports data', function (done) {
        // Stub migrations to return DEF_DB_VERSION as the current database version
        var versioningStub = sandbox.stub(versioning, 'getDatabaseVersion', function () {
            return Promise.resolve(DEF_DB_VERSION);
        });

        exporter().then(function (exportData) {
            var tables = ['posts', 'users', 'roles', 'roles_users', 'permissions', 'permissions_roles',
                'permissions_users', 'settings', 'tags', 'posts_tags'],
                dbVersionSetting;

            should.exist(exportData);

            should.exist(exportData.meta);
            should.exist(exportData.data);

            exportData.meta.version.should.equal(DEF_DB_VERSION);

            dbVersionSetting = _.findWhere(exportData.data.settings, {key: 'databaseVersion'});

            should.exist(dbVersionSetting);

            dbVersionSetting.value.should.equal(DEF_DB_VERSION);

            _.each(tables, function (name) {
                should.exist(exportData.data[name]);
            });
            // should not export sqlite data
            should.not.exist(exportData.data.sqlite_sequence);

            versioningStub.restore();
            done();
        }).catch(done);
    });
});
