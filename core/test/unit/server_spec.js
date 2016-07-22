/*jshint unused:false*/
var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    rewire = require('rewire'),
    config = require('../../server/config'),
    versioning = require(config.paths.corePath + '/server/data/schema/versioning'),
    migration = require(config.paths.corePath + '/server/data/migration'),
    models = require(config.paths.corePath + '/server/models'),
    permissions = require(config.paths.corePath + '/server/permissions'),
    api = require(config.paths.corePath + '/server/api'),
    apps = require(config.paths.corePath + '/server/apps'),
    i18n = require(config.paths.corePath + '/server/i18n'),
    sitemap = require(config.paths.corePath + '/server/data/xml/sitemap'),
    xmlrpc = require(config.paths.corePath + '/server/data/xml/xmlrpc'),
    slack = require(config.paths.corePath + '/server/data/slack'),
    scheduling = require(config.paths.corePath + '/server/scheduling'),
    bootstrap = rewire(config.paths.corePath + '/server'),
    sandbox = sinon.sandbox.create();

describe('server bootstrap', function () {
    var middlewareStub, resetMiddlewareStub, initDbHashAndFirstRunStub, resetInitDbHashAndFirstRunStub;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        middlewareStub = sandbox.stub();
        initDbHashAndFirstRunStub = sandbox.stub();

        sandbox.stub(migration, 'populate').returns(Promise.resolve());
        sandbox.stub(models.Settings, 'populateDefaults').returns(Promise.resolve());
        sandbox.stub(permissions, 'init').returns(Promise.resolve());
        sandbox.stub(api, 'init').returns(Promise.resolve());
        sandbox.stub(i18n, 'init');
        sandbox.stub(apps, 'init').returns(Promise.resolve());
        sandbox.stub(slack, 'listen').returns(Promise.resolve());
        sandbox.stub(xmlrpc, 'listen').returns(Promise.resolve());
        sandbox.stub(sitemap, 'init').returns(Promise.resolve());
        sandbox.stub(scheduling, 'init').returns(Promise.resolve());

        resetMiddlewareStub = bootstrap.__set__('middleware', middlewareStub);
        resetInitDbHashAndFirstRunStub = bootstrap.__set__('initDbHashAndFirstRun', initDbHashAndFirstRunStub);
    });

    afterEach(function () {
        sandbox.restore();
        resetMiddlewareStub();
        resetInitDbHashAndFirstRunStub();
    });

    describe('migrations', function () {
        it('database does not exist', function (done) {
            sandbox.stub(migration, 'update').returns(Promise.resolve());

            sandbox.stub(versioning, 'getDatabaseVersion', function () {
                return Promise.reject();
            });

            bootstrap()
                .then(function () {
                    migration.populate.calledOnce.should.eql(true);
                    migration.update.calledOnce.should.eql(false);
                    models.Settings.populateDefaults.callCount.should.eql(1);
                    config.maintenance.enabled.should.eql(false);
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });

        it('database does exist', function (done) {
            sandbox.stub(migration, 'update', function () {
                config.maintenance.enabled.should.eql(true);
                return Promise.resolve();
            });

            sandbox.stub(versioning, 'getDatabaseVersion', function () {
                return Promise.resolve('006');
            });

            bootstrap()
                .then(function () {
                    migration.update.calledOnce.should.eql(true);
                    migration.update.calledWith({
                        fromVersion: '006',
                        toVersion: '006',
                        forceMigration: undefined
                    }).should.eql(true);

                    models.Settings.populateDefaults.callCount.should.eql(1);
                    migration.populate.calledOnce.should.eql(false);
                    config.maintenance.enabled.should.eql(false);

                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });
    });
});
