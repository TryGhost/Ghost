var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),

    // Stuff we are testing
    versioning = require('../../server/data/schema').versioning,
    db = require('../../server/data/db'),
    errors = require('../../server/errors'),

    sandbox = sinon.sandbox.create();

describe('Versioning', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('getNewestDatabaseVersion', function () {
        it('should return the correct version', function () {
            var currentVersion = '1.0';

            // This function has an internal cache, so we call it twice.
            // First, to check that it fetches the correct version from default-settings.json.
            versioning.getNewestDatabaseVersion().should.eql(currentVersion);
            // Second, to check that it returns the same value from the cache.
            versioning.getNewestDatabaseVersion().should.eql(currentVersion);
        });
    });

    describe('getDatabaseVersion', function () {
        var knexStub, knexMock, queryMock;

        beforeEach(function () {
            queryMock = {
                where: sandbox.stub().returnsThis(),
                first: sandbox.stub()
            };

            knexMock = sandbox.stub().returns(queryMock);
            knexMock.schema = {
                hasTable: sandbox.stub()
            };

            // this MUST use sinon, not sandbox, see sinonjs/sinon#781
            knexStub = sinon.stub(db, 'knex', {
                get: function () {
                    return knexMock;
                }
            });
        });

        afterEach(function () {
            knexStub.restore();
        });

        it('should throw error if settings table does not exist', function (done) {
            // Setup
            knexMock.schema.hasTable.returns(new Promise.resolve(false));

            // Execute
            versioning.getDatabaseVersion().then(function () {
                done('Should throw an error if the settings table does not exist');
            }).catch(function (err) {
                should.exist(err);
                (err instanceof errors.DatabaseVersionError).should.eql(true);

                knexStub.get.calledOnce.should.be.true();
                knexMock.schema.hasTable.calledOnce.should.be.true();
                knexMock.schema.hasTable.calledWith('settings').should.be.true();
                queryMock.where.called.should.be.false();
                queryMock.first.called.should.be.false();
                done();
            }).catch(done);
        });

        it('should lookup & return version, if settings table exists', function (done) {
            // Setup
            knexMock.schema.hasTable.returns(new Promise.resolve(true));
            queryMock.first.returns(new Promise.resolve({value: '1.0'}));

            // Execute
            versioning.getDatabaseVersion().then(function (version) {
                should.exist(version);
                version.should.eql('1.0');

                knexStub.get.calledTwice.should.be.true();
                knexMock.schema.hasTable.calledOnce.should.be.true();
                knexMock.schema.hasTable.calledWith('settings').should.be.true();
                queryMock.where.called.should.be.true();
                queryMock.first.called.should.be.true();

                done();
            }).catch(done);
        });

        it('should throw error if version does not exist', function (done) {
            // Setup
            knexMock.schema.hasTable.returns(new Promise.resolve(true));
            queryMock.first.returns(new Promise.resolve());

            // Execute
            versioning.getDatabaseVersion().then(function () {
                done('Should throw an error if version does not exist');
            }).catch(function (err) {
                should.exist(err);
                (err instanceof errors.DatabaseVersionError).should.eql(true);
                err.code.should.eql('VERSION_DOES_NOT_EXIST');

                knexStub.get.calledTwice.should.be.true();
                knexMock.schema.hasTable.calledOnce.should.be.true();
                knexMock.schema.hasTable.calledWith('settings').should.be.true();
                queryMock.where.called.should.be.true();
                queryMock.first.called.should.be.true();

                done();
            }).catch(done);
        });

        it('should throw error if version is not a number', function (done) {
            // Setup
            knexMock.schema.hasTable.returns(new Promise.resolve(true));
            queryMock.first.returns(new Promise.resolve({value: 'Eyjafjallajökull'}));

            // Execute
            versioning.getDatabaseVersion().then(function () {
                done('Should throw an error if version is not a number');
            }).catch(function (err) {
                should.exist(err);
                (err instanceof errors.DatabaseVersionError).should.eql(true);

                knexStub.get.calledTwice.should.be.true();
                knexMock.schema.hasTable.calledOnce.should.be.true();
                knexMock.schema.hasTable.calledWith('settings').should.be.true();
                queryMock.where.called.should.be.true();
                queryMock.first.called.should.be.true();

                done();
            }).catch(done);
        });

        it('database does exist: expect alpha error', function (done) {
            knexMock.schema.hasTable.returns(new Promise.resolve(true));
            queryMock.first.returns(new Promise.resolve({value: '008'}));

            versioning.getDatabaseVersion()
                .then(function () {
                    done('Should throw an error if version is not a number');
                })
                .catch(function (err) {
                    (err instanceof errors.DatabaseVersionError).should.eql(true);
                    err.message.should.eql('Your database version is not compatible with Ghost 1.0.0 Alpha (master branch)');
                    done();
                });
        });
    });

    describe('setDatabaseVersion', function () {
        var knexStub, knexMock, queryMock;

        beforeEach(function () {
            queryMock = {
                where: sandbox.stub().returnsThis(),
                update: sandbox.stub().returns(new Promise.resolve())
            };

            knexMock = sandbox.stub().returns(queryMock);

            // this MUST use sinon, not sandbox, see sinonjs/sinon#781
            knexStub = sinon.stub(db, 'knex', {
                get: function () {
                    return knexMock;
                }
            });
        });

        afterEach(function () {
            knexStub.restore();
        });

        it('should try to update the databaseVersion', function (done) {
            versioning.setDatabaseVersion().then(function () {
                knexStub.get.calledOnce.should.be.true();
                queryMock.where.called.should.be.true();
                queryMock.update.called.should.be.true();

                done();
            }).catch(done);
        });
    });
});
