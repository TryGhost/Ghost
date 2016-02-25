/*globals describe, it, afterEach */
var should = require('should'),
    sinon  = require('sinon'),

    // Stuff we are testing
    versioning = require('../../server/data/schema').versioning,
    errors     = require('../../server/errors'),

    sandbox    = sinon.sandbox.create();

describe('Versioning', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('getMigrationVersions', function () {
        it('should output a single item if the from and to versions are the same', function () {
            should.exist(versioning.getMigrationVersions);
            versioning.getMigrationVersions('003', '003').should.eql(['003']);
            versioning.getMigrationVersions('004', '004').should.eql(['004']);
        });

        it('should output an empty array if the toVersion is higher than the fromVersion', function () {
            versioning.getMigrationVersions('003', '002').should.eql([]);
        });

        it('should output all the versions between two versions', function () {
            versioning.getMigrationVersions('003', '004').should.eql(['003', '004']);
            versioning.getMigrationVersions('003', '005').should.eql(['003', '004', '005']);
            versioning.getMigrationVersions('003', '006').should.eql(['003', '004', '005', '006']);
            versioning.getMigrationVersions('010', '011').should.eql(['010', '011']);
        });
    });

    describe('getDefaultDatabaseVersion', function () {
        it('should return the correct version', function () {
            var currentVersion = require('../../server/data/schema').defaultSettings.core.databaseVersion.defaultValue;
            // This function has an internal cache, so we call it twice.
            // First, to check that it fetches the correct version from default-settings.json.
            versioning.getDefaultDatabaseVersion().should.eql(currentVersion);
            // Second, to check that it returns the same value from the cache.
            versioning.getDefaultDatabaseVersion().should.eql(currentVersion);
        });
    });

    describe('showCannotMigrateError', function () {
        it('should output a detailed error message', function () {
            var errorStub = sandbox.stub(errors, 'logAndRejectError');
            versioning.showCannotMigrateError();
            errorStub.calledOnce.should.be.true();
            errorStub.calledWith(
                'Unable to upgrade from version 0.4.2 or earlier',
                'Please upgrade to 0.7.1 first',
                'See http://support.ghost.org/how-to-upgrade/ for instructions.'
            ).should.be.true();
        });
    });
});
