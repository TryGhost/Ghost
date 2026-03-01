const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const rewire = require('rewire');
const fs = require('fs-extra');
const path = require('path');
const errors = require('@tryghost/errors');
const SettingsLoader = rewire('../../../../../core/server/services/route-settings/settings-loader');

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
            assertExists(result);
            assert(typeof result === 'object' && result !== null);
            assert('routes' in result && 'collections' in result && 'taxonomies' in result);
            sinon.assert.calledOnce(fsReadFileStub);
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
            assertExists(setting);
            assert(typeof setting === 'object' && setting !== null);
            assert('routes' in setting && 'collections' in setting && 'taxonomies' in setting);

            sinon.assert.calledOnce(fsReadFileSpy);
            sinon.assert.calledWith(fsReadFileSpy, expectedSettingsFile);
            sinon.assert.calledOnce(yamlParserStub);
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
                assertExists(err);
                assert.equal(err.message, 'could not parse yaml file');
                assert.equal(err.context, 'bad indentation of a mapping entry at line 5, column 10');
                sinon.assert.calledOnce(yamlParserStub);
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
                assert.match(err.message, /Error trying to load YAML setting for routes from/);
                sinon.assert.calledWith(fsReadFileStub, expectedSettingsFile);
                sinon.assert.notCalled(yamlParserStub);
            }
        });
    });
});
