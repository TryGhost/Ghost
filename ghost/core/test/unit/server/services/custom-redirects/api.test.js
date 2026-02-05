const assert = require('node:assert/strict');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs-extra');

const logging = require('@tryghost/logging');
const CustomRedirectsAPI = require('../../../../../core/server/services/custom-redirects/custom-redirects-api');

describe('UNIT: redirects CustomRedirectsAPI class', function () {
    let customRedirectsAPI;
    let redirectManager;
    let fsPathExistsStub;
    let fsReadFileStub;
    let fsUnlinkStub;
    let fsMoveStub;
    let fsCopyStub;
    let fsWriteFileStub;
    const basePath = path.join(__dirname, '../../../../utils/fixtures/data/');

    before(function () {
        customRedirectsAPI = new CustomRedirectsAPI({
            basePath,
            redirectManager,
            getBackupFilePath: () => path.join(basePath, 'backup.json'),
            validate: () => {}
        });
    });

    beforeEach(function () {
        redirectManager = {
            removeAllRedirects: sinon.stub(),
            addRedirect: sinon.stub()
        };

        fsPathExistsStub = sinon.stub(fs, 'pathExists');
        fsWriteFileStub = sinon.stub(fs, 'writeFile');
        fsReadFileStub = sinon.stub(fs, 'readFile');
        fsUnlinkStub = sinon.stub(fs, 'unlink');
        fsMoveStub = sinon.stub(fs, 'move');
        fsCopyStub = sinon.stub(fs, 'copy');
        sinon.spy(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('init', function () {
        it('initializes without errors when redirects file is not present', async function () {
            customRedirectsAPI = new CustomRedirectsAPI({
                basePath,
                redirectManager,
                getBackupFilePath: {},
                validate: () => {}
            });

            await customRedirectsAPI.init();
            sinon.assert.notCalled(logging.error);
        });
    });

    describe('get', function () {
        it('returns empty array if file does not exist', async function () {
            fsPathExistsStub.withArgs(`${basePath}redirects.yaml`).resolves(false);
            fsPathExistsStub.withArgs(`${basePath}redirects.json`).resolves(false);

            const file = await customRedirectsAPI.get();

            assert.deepEqual(file, []);
        });

        it('returns a redirects YAML file if it exists', async function () {
            fsPathExistsStub.withArgs(`${basePath}redirects.yaml`).resolves(true);
            fsPathExistsStub.withArgs(`${basePath}redirects.json`).resolves(false);

            fsReadFileStub.withArgs(`${basePath}redirects.yaml`, 'utf-8').resolves('yaml content');
            fsReadFileStub.withArgs(`${basePath}redirects.json`, 'utf-8').resolves(null);

            const file = await customRedirectsAPI.get();

            assert.deepEqual(file, 'yaml content');
        });

        it('returns a redirects JSON file if YAML does not exists', async function () {
            const redirectJSONFixture = [{
                from: '^/post/[0-9]+/([a-z0-9\\-]+)',
                to: '/$1'
            }];

            fsPathExistsStub.withArgs(`${basePath}redirects.yaml`).resolves(false);
            fsPathExistsStub.withArgs(`${basePath}redirects.json`).resolves(true);

            fsReadFileStub.withArgs(`${basePath}redirects.yaml`, 'utf-8').resolves(null);
            fsReadFileStub.withArgs(`${basePath}redirects.json`, 'utf-8').resolves(JSON.stringify(redirectJSONFixture));

            const file = await customRedirectsAPI.get();

            assert.deepEqual(file, redirectJSONFixture);
        });
    });

    describe('setFromFilePath', function () {
        it('throws a syntax error when setting invalid JSON redirects file', async function () {
            const invalidJSON = '{invalid json';
            const invalidFilePath = path.join(__dirname, '/invalid/redirects/path.json');
            fsReadFileStub.withArgs(invalidFilePath, 'utf-8').resolves(invalidJSON);

            let expectedErrorMessage;
            try {
                JSON.parse(invalidJSON);
            } catch (err) {
                expectedErrorMessage = err.message;
            }
            // This should never happen because the JSON is invalid
            assert(expectedErrorMessage, 'expectedErrorMessage is not set');

            await assert.rejects(async () => {
                await customRedirectsAPI.setFromFilePath(invalidFilePath, '.json');
            }, {message: `Could not parse JSON: ${expectedErrorMessage}.`});
        });

        it('throws a syntax error when setting invalid (plain string) YAML redirects file', async function () {
            const invalidFilePath = path.join(__dirname, '/invalid/redirects/yaml.json');
            fsReadFileStub.withArgs(invalidFilePath, 'utf-8').resolves('x');

            await assert.rejects(async () => {
                await customRedirectsAPI.setFromFilePath(invalidFilePath, '.yaml');
            }, {message: 'YAML input is invalid. Check the contents of your YAML file.'});
        });

        it('throws a syntax error when setting invalid (empty) YAML redirects file', async function () {
            const invalidFilePath = path.join(__dirname, '/invalid/redirects/yaml.json');
            fsReadFileStub.withArgs(invalidFilePath, 'utf-8').resolves('');

            await assert.rejects(async () => {
                await customRedirectsAPI.setFromFilePath(invalidFilePath, '.yaml');
            }, {message: 'YAML input is invalid. Check the contents of your YAML file.'});
        });

        it('throws bad request error when the YAML file is invalid', async function () {
            const invalidFilePath = path.join(__dirname, '/invalid/redirects/yaml.json');
            fsReadFileStub.withArgs(invalidFilePath, 'utf-8').resolves(`
                routes:
                \
                invalid yaml:
                /
            `);

            await assert.rejects(async () => {
                await customRedirectsAPI.setFromFilePath(invalidFilePath, '.yaml');
            }, {
                errorType: 'BadRequestError',
                message: /Could not parse YAML: can not read an implicit mapping pair/
            });
        });

        it('creates a backup file from existing redirects.json file', async function () {
            const incomingFilePath = path.join(__dirname, '/valid/path/redirects_incoming.json');
            const existingRedirectsFilePath = `${basePath}redirects.json`;
            const backupFilePath = path.join(basePath, 'backup.json');

            const redirectsJSONConfig = JSON.stringify([{
                from: 'e',
                to: 'b'
            }]);

            // redirects.json file already exits
            fsPathExistsStub.withArgs(existingRedirectsFilePath).resolves(true);
            fsPathExistsStub.withArgs(`${basePath}redirects.yaml`).resolves(false);
            // incoming redirects file
            fsReadFileStub.withArgs(incomingFilePath, 'utf-8').resolves(redirectsJSONConfig);
            // backup file already exists
            fsPathExistsStub.withArgs(backupFilePath).resolves(true);
            fsUnlinkStub.withArgs(backupFilePath).resolves(true);
            fsMoveStub.withArgs(incomingFilePath, backupFilePath).resolves(true);

            customRedirectsAPI = new CustomRedirectsAPI({
                basePath,
                redirectManager,
                getBackupFilePath: () => backupFilePath,
                validate: () => {}
            });

            await customRedirectsAPI.setFromFilePath(incomingFilePath, '.json');

            // backed up file with the same name already exists so remove it
            sinon.assert.called(fsUnlinkStub);
            sinon.assert.calledWith(fsUnlinkStub, backupFilePath);

            // backed up current routes file
            sinon.assert.called(fsMoveStub);
            sinon.assert.calledWith(fsMoveStub, existingRedirectsFilePath, backupFilePath);

            // written new routes file
            sinon.assert.calledWith(fsWriteFileStub, existingRedirectsFilePath, redirectsJSONConfig, 'utf-8');

            // redirects have been re-registered
            sinon.assert.calledOnce(redirectManager.removeAllRedirects);
            // one redirect in total
            sinon.assert.calledOnce(redirectManager.addRedirect);
        });

        it('creates a backup file from existing redirects.yaml file', async function () {
            const incomingFilePath = path.join(__dirname, '/valid/path/redirects_incoming.yaml');

            const backupFilePath = path.join(basePath, 'backup.yaml');

            const redirectsYamlConfig = `
                301:
                    /my-old-blog-post/: /revamped-url/

                302:
                    /another-old-blog-post/: /hello-there/
            `;

            // redirects.json file already exits
            fsPathExistsStub.withArgs(`${basePath}redirects.json`).resolves(false);
            fsPathExistsStub.withArgs(`${basePath}redirects.yaml`).resolves(true);
            // incoming redirects file
            fsReadFileStub.withArgs(incomingFilePath, 'utf-8').resolves(redirectsYamlConfig);
            // backup file DOES not exists yet
            fsPathExistsStub.withArgs(backupFilePath).resolves(false);
            // should not be called
            fsUnlinkStub.withArgs(backupFilePath).resolves(false);
            fsMoveStub.withArgs(`${basePath}redirects.yaml`, backupFilePath).resolves(true);

            customRedirectsAPI = new CustomRedirectsAPI({
                basePath,
                redirectManager,
                getBackupFilePath: () => backupFilePath,
                validate: () => {}
            });

            await customRedirectsAPI.setFromFilePath(incomingFilePath, '.yaml');

            // no existing backup file name match, did not remove any files
            sinon.assert.notCalled(fsUnlinkStub);

            // backed up current routes file
            sinon.assert.called(fsMoveStub);

            // overwritten with incoming routes.yaml file
            sinon.assert.calledWith(fsCopyStub, incomingFilePath, `${basePath}redirects.yaml`);

            // redirects have been re-registered
            sinon.assert.calledOnce(redirectManager.removeAllRedirects);
            // two redirects in total
            sinon.assert.calledTwice(redirectManager.addRedirect);
        });

        it('does not create a backup file from a bad redirect yaml file', async function () {
            const incomingFilePath = path.join(__dirname, '/invalid/path/redirects_incoming.yaml');
            const backupFilePath = path.join(basePath, 'backup.yaml');

            const invalidYaml = `
                301:
                    /my-old-blog-post/: /revamped-url/
                    /my-old-blog-post/: /revamped-url/

                302:
                    /another-old-blog-post/: /hello-there/
            `;

            // redirects.json file already exits
            fsPathExistsStub.withArgs(`${basePath}redirects.json`).resolves(false);
            fsPathExistsStub.withArgs(`${basePath}redirects.yaml`).resolves(true);
            // incoming redirects file
            fsReadFileStub.withArgs(incomingFilePath, 'utf-8').resolves(invalidYaml);
            // backup file DOES not exists yet
            fsPathExistsStub.withArgs(backupFilePath).resolves(false);
            // should not be called
            fsUnlinkStub.withArgs(backupFilePath).resolves(false);
            fsMoveStub.withArgs(`${basePath}redirects.yaml`, backupFilePath).resolves(true);

            customRedirectsAPI = new CustomRedirectsAPI({
                basePath,
                redirectManager,
                getBackupFilePath: () => backupFilePath,
                validate: () => {}
            });

            await assert.rejects(async () => {
                await customRedirectsAPI.setFromFilePath(incomingFilePath, '.yaml');
            }, {errorType: 'BadRequestError'});

            sinon.assert.notCalled(fsUnlinkStub);
            sinon.assert.notCalled(fsMoveStub);
        });
    });
});
