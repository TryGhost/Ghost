const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');
const fs = require('fs-extra');
const path = require('path');
const configUtils = require('../../../utils/configUtils');
const errors = require('@tryghost/errors');
const SettingsLoader = rewire('../../../../core/server/services/route-settings/settings-loader');

describe('UNIT > SettingsLoader:', function () {
    beforeEach(function () {
        configUtils.set('paths:contentPath', path.join(__dirname, '../../../utils/fixtures/'));
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    describe('Settings Loader', function () {
        const yamlStubFile = {
            routes: null,
            collections: {
                '/': {
                    permalink: '/{slug}/',
                    template: ['home', 'index']
                }
            },
            taxonomies: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
        };

        let yamlParserStub;
        let validateStub;

        beforeEach(function () {
            yamlParserStub = sinon.stub();
            validateStub = sinon.stub();
        });

        it('reads a settings object for routes.yaml file', function () {
            const settingsLoader = new SettingsLoader();
            const settingsStubFile = {
                routes: null,
                collections: {
                    '/': {
                        permalink: '/{slug}/',
                        template: ['home', 'index']
                    }
                },
                resources: {
                    tag: '/tag/{slug}/',
                    author: '/author/{slug}/'
                }
            };
            const fsReadFileStub = sinon.stub(fs, 'readFileSync').returns(settingsStubFile);

            const result = settingsLoader.loadSettingsSync();
            should.exist(result);
            result.should.be.an.Object().with.properties('routes', 'collections', 'taxonomies');
            fsReadFileStub.calledOnce.should.be.true();
        });

        it('can find yaml settings file and returns a settings object', function () {
            const fsReadFileSpy = sinon.spy(fs, 'readFileSync');
            const expectedSettingsFile = path.join(__dirname, '../../../utils/fixtures/settings/routes.yaml');

            yamlParserStub.returns(yamlStubFile);
            validateStub.returns({routes: {}, collections: {}, taxonomies: {}});

            SettingsLoader.__set__('yamlParser', yamlParserStub);
            SettingsLoader.__set__('validate', validateStub);

            const settingsLoader = new SettingsLoader();
            const setting = settingsLoader.loadSettingsSync();
            should.exist(setting);
            setting.should.be.an.Object().with.properties('routes', 'collections', 'taxonomies');

            fsReadFileSpy.calledOnce.should.be.true();
            fsReadFileSpy.calledWith(expectedSettingsFile).should.be.true();
            yamlParserStub.callCount.should.be.eql(1);
        });

        it('can handle errors from YAML parser', function (done) {
            SettingsLoader.__set__('yamlParser', yamlParserStub);
            yamlParserStub.throws(new errors.GhostError({
                message: 'could not parse yaml file',
                context: 'bad indentation of a mapping entry at line 5, column 10'
            }));

            const settingsLoader = new SettingsLoader();
            try {
                settingsLoader.loadSettingsSync();
                done(new Error('Loader should fail'));
            } catch (err) {
                should.exist(err);
                err.message.should.be.eql('could not parse yaml file');
                err.context.should.be.eql('bad indentation of a mapping entry at line 5, column 10');
                yamlParserStub.calledOnce.should.be.true();
                done();
            }
        });

        it('throws error if file can\'t be accessed', function (done) {
            const expectedSettingsFile = path.join(__dirname, '../../../utils/fixtures/settings/routes.yaml');
            const fsError = new Error('no permission');
            fsError.code = 'EPERM';

            const originalFn = fs.readFileSync;
            const fsReadFileStub = sinon.stub(fs, 'readFileSync').callsFake(function (filePath, options) {
                if (filePath.match(/routes\.yaml/)) {
                    throw fsError;
                }

                return originalFn(filePath, options);
            });

            SettingsLoader.__set__('yamlParser', yamlParserStub);
            yamlParserStub = sinon.spy();

            const settingsLoader = new SettingsLoader();

            try {
                settingsLoader.loadSettingsSync();
                done(new Error('Loader should fail'));
            } catch (err) {
                err.message.should.match(/Error trying to load YAML setting for routes from/);
                fsReadFileStub.calledWith(expectedSettingsFile).should.be.true();
                yamlParserStub.calledOnce.should.be.false();
                done();
            }
        });
    });
});
