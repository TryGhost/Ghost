'use strict';

const sinon = require('sinon'),
    should = require('should'),
    rewire = require('rewire'),
    common = require('../../../../server/lib/common'),

    settings = rewire('../../../../server/services/settings/index'),

    sandbox = sinon.sandbox.create();

describe('UNIT > Settings Service:', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('knownSettings', function () {
        it('returns supported settings files', function () {
            const files = settings.knownSettings();
            // This test will fail when new settings are added without
            // changing this test as well.
            files.should.be.an.Array().with.length(1);
        });
    });

    describe('get', function () {
        let settingsLoaderStub;

        const settingsStubFile = {
            routes: null,
            collections: {
              '/': {
                route: '{globals.permalinks}',
                template: [ 'home', 'index' ]
              }
            },
            resources: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
        };

        beforeEach(function () {
            settingsLoaderStub = sandbox.stub();
        });

        it('returns settings object for `routes`', function () {
            settingsLoaderStub.resolves(settingsStubFile);
            settings.__set__('SettingsLoader', settingsLoaderStub);

            settings.get('routes').then((result) => {
                should.exist(result);
                result.should.be.an.Object().with.properties('routes', 'collections', 'resources');
                settingsLoaderStub.calledOnce.should.be.true();
            });
        });

        it('rejects when requested settings type is not supported', function () {
            settingsLoaderStub.resolves(settingsStubFile);
            settings.__set__('SettingsLoader', settingsLoaderStub);

            return settings.get('something').then((result) => {
                should.not.exist(result);
            }).catch((error) => {
                should.exist(error);
                error.message.should.be.eql('Requested setting is not supported: \'something\'.');
                settingsLoaderStub.callCount.should.be.eql(0);
            });
        });

        it('passes SettingsLoader error through', function () {
            settingsLoaderStub.rejects(new common.errors.GhostError({message: 'oops'}));
            settings.__set__('SettingsLoader', settingsLoaderStub);

            return settings.get('routes').then((result) => {
                should.not.exist(result);
            }).catch((error) => {
                should.exist(error);
                error.message.should.be.eql('oops');
                settingsLoaderStub.calledOnce.should.be.true();
            });
        });
    });

    describe('getAll', function () {
        let settingsLoaderStub,
            knownSettingsStub;

        const settingsStubFile1 = {
                routes: null,
                collections: {
                  '/': {
                    route: '{globals.permalinks}',
                    template: [ 'home', 'index' ]
                  }
                },
                resources: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
            },
            settingsStubFile2 = {
                config: {
                    url: 'https://testblog.com'
                }
            };

        beforeEach(function () {
            knownSettingsStub = sandbox.stub().returns(['routes', 'globals']);
            settings.__set__('this.knownSettings', knownSettingsStub);
            settingsLoaderStub = sandbox.stub();
        });

        it('returns settings object for all known settings', function () {
            settingsLoaderStub.onFirstCall().resolves(settingsStubFile1);
            settingsLoaderStub.onSecondCall().resolves(settingsStubFile2);
            settings.__set__('SettingsLoader', settingsLoaderStub);

            return settings.getAll().then((result) => {
                should.exist(result);
                result.should.be.an.Object().with.properties('routes', 'globals');
                result.routes.should.be.an.Object().with.properties('routes', 'collections', 'resources');
                result.globals.should.be.an.Object().with.properties('config');

                settingsLoaderStub.calledTwice.should.be.true();
            });
        });

        it('passes SettinsLoader error through', function () {
            settingsLoaderStub.onFirstCall().resolves(settingsStubFile1);
            settingsLoaderStub.onSecondCall().rejects(new common.errors.GhostError({message: 'oops'}));
            settings.__set__('SettingsLoader', settingsLoaderStub);

            return settings.getAll().then((result) => {
                should.not.exist(result);
            }).catch((error) => {
                should.exist(error);
                error.message.should.be.eql('oops');
                settingsLoaderStub.calledTwice.should.be.true();
            });
        });
    });
});
