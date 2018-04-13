'use strict';

const sinon = require('sinon'),
    should = require('should'),
    rewire = require('rewire'),
    fs = require('fs-extra'),
    yaml = require('js-yaml'),
    path = require('path'),
    configUtils = require('../../../utils/configUtils'),
    common = require('../../../../server/lib/common'),

    loadSettings = rewire('../../../../server/services/settings/loader'),

    sandbox = sinon.sandbox.create();

describe('UNIT > Settings Service:', function () {
    beforeEach(function () {
        configUtils.set('paths:contentPath', path.join(__dirname, '../../../utils/fixtures/'));
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    describe('Settings Loader', function () {
        const yamlStubFile = {
            routes: null,
            collections: {
                '/': {
                    route: '{globals.permalinks}',
                    template: ['home', 'index']
                }
            },
            resources: {tag: '/tag/{slug}/', author: '/author/{slug}/'}
        };
        let yamlParserStub;

        beforeEach(function () {
            yamlParserStub = sinon.stub();
        });

        it('can find yaml settings file and returns a settings object', function () {
            const fsReadFileSpy = sandbox.spy(fs, 'readFile');
            const expectedSettingsFile = path.join(__dirname, '../../../utils/fixtures/settings/goodroutes.yaml');
            yamlParserStub.returns(yamlStubFile);
            loadSettings.__set__('yamlParser', yamlParserStub);

            return loadSettings('goodroutes').then((setting) => {
                should.exist(setting);
                setting.should.be.an.Object().with.properties('routes', 'collections', 'resources');
                // There are 4 files in the fixtures folder, but only 1 supported and valid yaml files
                fsReadFileSpy.calledOnce.should.be.true();
                fsReadFileSpy.calledWith(expectedSettingsFile).should.be.true();
                yamlParserStub.callCount.should.be.eql(1);
            });
        });

        it('can handle errors from YAML parser', function () {
            yamlParserStub.rejects(new common.errors.GhostError({
                message: 'could not parse yaml file',
                context: 'bad indentation of a mapping entry at line 5, column 10'
            }));
            loadSettings.__set__('yamlParser', yamlParserStub);

            return loadSettings('goodroutes').then((setting) => {
                should.not.exist(setting);
            }).catch((error) => {
                should.exist(error);
                error.message.should.be.eql('could not parse yaml file');
                error.context.should.be.eql('bad indentation of a mapping entry at line 5, column 10');
                yamlParserStub.calledOnce.should.be.true();
            });
        });

        it('throws error if file can\'t be accessed', function () {
            const expectedSettingsFile = path.join(__dirname, '../../../utils/fixtures/settings/routes.yaml');
            const fsError = new Error('no permission');
            fsError.code = 'EPERM';
            const fsReadFileStub = sandbox.stub(fs, 'readFile').rejects(fsError);
            yamlParserStub = sinon.spy();
            loadSettings.__set__('yamlParser', yamlParserStub);

            return loadSettings('routes').then((settings) => {
                should.not.exist(settings);
            }).catch((error) => {
                should.exist(error);
                error.message.should.match(/Error trying to load YAML setting for routes from/);
                fsReadFileStub.calledWith(expectedSettingsFile).should.be.true();
                yamlParserStub.calledOnce.should.be.false();
            });
        });
    });
});
