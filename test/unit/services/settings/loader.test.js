const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');
const fs = require('fs-extra');
const path = require('path');
const configUtils = require('../../../utils/configUtils');
const errors = require('@tryghost/errors');
const loadSettings = rewire('../../../../core/frontend/services/settings/loader');

describe('UNIT > Settings Service loader:', function () {
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

        it('can find yaml settings file and returns a settings object', function () {
            const fsReadFileSpy = sinon.spy(fs, 'readFileSync');
            const expectedSettingsFile = path.join(__dirname, '../../../utils/fixtures/settings/goodroutes.yaml');

            yamlParserStub.returns(yamlStubFile);
            validateStub.returns({routes: {}, collections: {}, taxonomies: {}});

            loadSettings.__set__('yamlParser', yamlParserStub);
            loadSettings.__set__('validate', validateStub);

            const setting = loadSettings.loadSettingsSync('goodroutes');
            should.exist(setting);
            setting.should.be.an.Object().with.properties('routes', 'collections', 'taxonomies');
            // There are 4 files in the fixtures folder, but only 1 supported and valid yaml files
            fsReadFileSpy.calledOnce.should.be.true();
            fsReadFileSpy.calledWith(expectedSettingsFile).should.be.true();
            yamlParserStub.callCount.should.be.eql(1);
        });

        it('can handle errors from YAML parser', function (done) {
            yamlParserStub.throws(new errors.GhostError({
                message: 'could not parse yaml file',
                context: 'bad indentation of a mapping entry at line 5, column 10'
            }));

            loadSettings.__set__('yamlParser', yamlParserStub);

            try {
                loadSettings.loadSettingsSync('goodroutes');
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

            yamlParserStub = sinon.spy();
            loadSettings.__set__('yamlParser', yamlParserStub);

            try {
                loadSettings.loadSettingsSync('routes');
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
