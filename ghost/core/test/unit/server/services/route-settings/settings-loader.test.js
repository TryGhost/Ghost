const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');
const fs = require('fs-extra');
const path = require('path');
const errors = require('@tryghost/errors');
const SettingsLoader = rewire('../../../../../core/server/services/route-settings/SettingsLoader');

describe('UNIT > SettingsLoader:', function () {
    afterEach(function () {
        sinon.restore();
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

        it('reads a settings object for routes.yaml file', async function () {
            const settingsLoader = new SettingsLoader({
                parseYaml: yamlParserStub,
                settingFilePath: '/content/data/routes.yaml'
            });
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
            const fsReadFileStub = sinon.stub(fs, 'readFile').returns(settingsStubFile);

            const result = await settingsLoader.loadSettings();
            should.exist(result);
            result.should.be.an.Object().with.properties('routes', 'collections', 'taxonomies');
            fsReadFileStub.calledOnce.should.be.true();
        });

        it('can find yaml settings file and returns a settings object', async function () {
            const fsReadFileSpy = sinon.spy(fs, 'readFile');
            const storageFolderPath = path.join(__dirname, '../../../../utils/fixtures/settings/');
            const expectedSettingsFile = path.join(storageFolderPath, 'routes.yaml');

            yamlParserStub.returns(yamlStubFile);
            validateStub.returns({routes: {}, collections: {}, taxonomies: {}});

            SettingsLoader.__set__('validate', validateStub);

            const settingsLoader = new SettingsLoader({
                parseYaml: yamlParserStub,
                settingFilePath: expectedSettingsFile
            });
            const setting = await settingsLoader.loadSettings();
            should.exist(setting);
            setting.should.be.an.Object().with.properties('routes', 'collections', 'taxonomies');

            fsReadFileSpy.calledOnce.should.be.true();
            fsReadFileSpy.calledWith(expectedSettingsFile).should.be.true();
            yamlParserStub.callCount.should.be.eql(1);
        });

        it('can handle errors from YAML parser', async function () {
            const storageFolderPath = path.join(__dirname, '../../../../utils/fixtures/settings/');
            yamlParserStub.throws(new errors.InternalServerError({
                message: 'could not parse yaml file',
                context: 'bad indentation of a mapping entry at line 5, column 10'
            }));

            const settingsLoader = new SettingsLoader({
                parseYaml: yamlParserStub,
                settingFilePath: path.join(storageFolderPath, 'routes.yaml')
            });
            try {
                await settingsLoader.loadSettings();
                throw new Error('Should have failed already');
            } catch (err) {
                should.exist(err);
                err.message.should.be.eql('could not parse yaml file');
                err.context.should.be.eql('bad indentation of a mapping entry at line 5, column 10');
                yamlParserStub.calledOnce.should.be.true();
            }
        });

        it('throws error if file can\'t be accessed', async function () {
            const storageFolderPath = path.join(__dirname, '../../../utils/fixtures/settings/');
            const expectedSettingsFile = path.join(storageFolderPath, 'routes.yaml');
            const fsError = new Error('no permission');
            fsError.code = 'EPERM';

            const originalFn = fs.readFile;
            const fsReadFileStub = sinon.stub(fs, 'readFile').callsFake(function (filePath, options) {
                if (filePath.match(/routes\.yaml/)) {
                    throw fsError;
                }

                return originalFn(filePath, options);
            });

            yamlParserStub = sinon.spy();

            const settingsLoader = new SettingsLoader({
                parseYaml: yamlParserStub,
                settingFilePath: expectedSettingsFile
            });

            try {
                await settingsLoader.loadSettings();
                throw new Error('Should have failed already');
            } catch (err) {
                err.message.should.match(/Error trying to load YAML setting for routes from/);
                fsReadFileStub.calledWith(expectedSettingsFile).should.be.true();
                yamlParserStub.calledOnce.should.be.false();
            }
        });
    });
});
