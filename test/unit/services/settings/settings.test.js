const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');
const errors = require('@tryghost/errors');
const settings = rewire('../../../../core/frontend/services/settings');

describe('UNIT > Settings Service:', function () {
    afterEach(function () {
        sinon.restore();
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
                    permalink: '/{slug}/',
                    template: ['home', 'index']
                }
            },
            resources: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
        };

        beforeEach(function () {
            settingsLoaderStub = sinon.stub();
        });

        it('returns settings object for `routes`', function () {
            settingsLoaderStub.returns(settingsStubFile);
            settings.__set__('SettingsLoader', settingsLoaderStub);

            const result = settings.get('routes');
            should.exist(result);
            result.should.be.an.Object().with.properties('routes', 'collections', 'resources');
            settingsLoaderStub.calledOnce.should.be.true();
        });

        it('rejects when requested settings type is not supported', function (done) {
            settingsLoaderStub.returns(settingsStubFile);
            settings.__set__('SettingsLoader', settingsLoaderStub);

            try {
                settings.get('something');
                done(new Error('SettingsLoader should fail'));
            } catch (err) {
                should.exist(err);
                err.message.should.be.eql('Requested setting is not supported: \'something\'.');
                settingsLoaderStub.callCount.should.be.eql(0);
                done();
            }
        });

        it('passes SettingsLoader error through', function (done) {
            settingsLoaderStub.throws(new errors.GhostError({message: 'oops'}));
            settings.__set__('SettingsLoader', settingsLoaderStub);

            try {
                settings.get('routes');
                done(new Error('SettingsLoader should fail'));
            } catch (err) {
                should.exist(err);
                err.message.should.be.eql('oops');
                settingsLoaderStub.calledOnce.should.be.true();
                done();
            }
        });
    });
});
