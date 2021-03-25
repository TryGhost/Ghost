const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const Promise = require('bluebird');
const errors = require('@tryghost/errors');
const db = require('../../../../core/server/data/db');
const exporter = rewire('../../../../core/server/data/exporter');
const schema = require('../../../../core/server/data/schema');
const models = require('../../../../core/server/models');
const schemaTables = Object.keys(schema.tables);

describe('Exporter', function () {
    let tablesStub;
    let queryMock;
    let knexMock;

    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('doExport', function () {
        beforeEach(function () {
            tablesStub = sinon.stub(schema.commands, 'getTables').returns(schemaTables);

            queryMock = {
                whereNot: sinon.stub(),
                select: sinon.stub()
            };

            knexMock = sinon.stub().returns(queryMock);

            sinon.stub(db, 'knex').get(function () {
                return knexMock;
            });
        });

        it('should try to export all the correct tables (without excluded)', function (done) {
            // Execute
            exporter.doExport().then(function (exportData) {
                // No tables, less the number of excluded tables
                const expectedCallCount = schemaTables.length - exporter.BACKUP_TABLES.length;

                should.exist(exportData);

                exportData.meta.version.should.match(/\d+.\d+.\d+/gi);

                tablesStub.calledOnce.should.be.true();
                db.knex.called.should.be.true();

                knexMock.callCount.should.eql(expectedCallCount);
                queryMock.select.callCount.should.have.eql(expectedCallCount);

                knexMock.getCall(0).args[0].should.eql('posts');
                knexMock.getCall(1).args[0].should.eql('posts_meta');
                knexMock.getCall(2).args[0].should.eql('users');
                knexMock.getCall(3).args[0].should.eql('posts_authors');
                knexMock.getCall(4).args[0].should.eql('roles');
                knexMock.getCall(5).args[0].should.eql('roles_users');
                knexMock.getCall(6).args[0].should.eql('permissions');
                knexMock.getCall(7).args[0].should.eql('permissions_users');
                knexMock.getCall(8).args[0].should.eql('permissions_roles');
                knexMock.getCall(9).args[0].should.eql('settings');
                knexMock.getCall(10).args[0].should.eql('tags');
                knexMock.getCall(11).args[0].should.eql('posts_tags');
                knexMock.getCall(12).args[0].should.eql('invites');
                knexMock.getCall(13).args[0].should.eql('brute');
                knexMock.getCall(14).args[0].should.eql('integrations');
                knexMock.getCall(15).args[0].should.eql('webhooks');
                knexMock.getCall(16).args[0].should.eql('api_keys');
                knexMock.getCall(17).args[0].should.eql('members');
                knexMock.getCall(18).args[0].should.eql('labels');
                knexMock.getCall(19).args[0].should.eql('members_labels');
                knexMock.getCall(20).args[0].should.eql('members_stripe_customers');
                knexMock.getCall(21).args[0].should.eql('members_stripe_customers_subscriptions');
                knexMock.getCall(22).args[0].should.eql('actions');
                knexMock.getCall(23).args[0].should.eql('emails');
                knexMock.getCall(24).args[0].should.eql('tokens');
                knexMock.getCall(25).args[0].should.eql('snippets');

                done();
            }).catch(done);
        });

        it('should try to export all the correct tables with extra tables', function (done) {
            const include = ['mobiledoc_revisions', 'email_recipients'];
            exporter.doExport({include}).then(function (exportData) {
                const expectedCallCount = schemaTables.length + include.length - exporter.BACKUP_TABLES.length;

                should.exist(exportData);

                exportData.meta.version.should.match(/\d+.\d+.\d+/gi);

                tablesStub.calledOnce.should.be.true();
                db.knex.called.should.be.true();
                queryMock.select.called.should.be.true();

                knexMock.callCount.should.eql(expectedCallCount);
                queryMock.select.callCount.should.have.eql(expectedCallCount);

                knexMock.getCall(0).args[0].should.eql('posts');
                knexMock.getCall(1).args[0].should.eql('posts_meta');
                knexMock.getCall(2).args[0].should.eql('users');
                knexMock.getCall(3).args[0].should.eql('posts_authors');
                knexMock.getCall(4).args[0].should.eql('roles');
                knexMock.getCall(5).args[0].should.eql('roles_users');
                knexMock.getCall(6).args[0].should.eql('permissions');
                knexMock.getCall(7).args[0].should.eql('permissions_users');
                knexMock.getCall(8).args[0].should.eql('permissions_roles');
                knexMock.getCall(9).args[0].should.eql('settings');
                knexMock.getCall(10).args[0].should.eql('tags');
                knexMock.getCall(11).args[0].should.eql('posts_tags');
                knexMock.getCall(12).args[0].should.eql('invites');
                knexMock.getCall(13).args[0].should.eql('brute');
                knexMock.getCall(14).args[0].should.eql('integrations');
                knexMock.getCall(15).args[0].should.eql('webhooks');
                knexMock.getCall(16).args[0].should.eql('api_keys');
                knexMock.getCall(17).args[0].should.eql('mobiledoc_revisions');
                knexMock.getCall(18).args[0].should.eql('members');
                knexMock.getCall(19).args[0].should.eql('labels');
                knexMock.getCall(20).args[0].should.eql('members_labels');
                knexMock.getCall(21).args[0].should.eql('members_stripe_customers');
                knexMock.getCall(22).args[0].should.eql('members_stripe_customers_subscriptions');
                knexMock.getCall(23).args[0].should.eql('actions');
                knexMock.getCall(24).args[0].should.eql('emails');
                knexMock.getCall(25).args[0].should.eql('email_recipients');
                knexMock.getCall(26).args[0].should.eql('tokens');
                knexMock.getCall(27).args[0].should.eql('snippets');

                done();
            }).catch(done);
        });

        it('should catch and log any errors', function (done) {
            // Setup for failure
            queryMock.select.returns(Promise.reject({}));

            // Execute
            exporter.doExport()
                .then(function () {
                    done(new Error('expected error for export'));
                })
                .catch(function (err) {
                    (err instanceof errors.DataExportError).should.eql(true);
                    done();
                });
        });
    });

    describe('exportFileName', function () {
        it('should return a correctly structured filename', function (done) {
            const settingsStub = sinon.stub(models.Settings, 'findOne').returns(
                new Promise.resolve({
                    get: function () {
                        return 'testblog';
                    }
                })
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.calledOnce.should.be.true();
                result.should.match(/^testblog\.ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });

        it('should return a correctly structured filename if settings is empty', function (done) {
            const settingsStub = sinon.stub(models.Settings, 'findOne').returns(
                new Promise.resolve()
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.calledOnce.should.be.true();
                result.should.match(/^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });

        it('should return a correctly structured filename if settings errors', function (done) {
            const settingsStub = sinon.stub(models.Settings, 'findOne').returns(
                new Promise.reject()
            );

            exporter.fileName().then(function (result) {
                should.exist(result);
                settingsStub.calledOnce.should.be.true();
                result.should.match(/^ghost\.[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{2}\.json$/);

                done();
            }).catch(done);
        });
    });
});
