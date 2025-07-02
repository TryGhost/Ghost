const should = require('should');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs-extra');

const logging = require('@tryghost/logging');
const CustomRedirectsAPI = require('../../../../../core/server/services/custom-redirects/CustomRedirectsAPI');

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
            logging.error.called.should.be.false();
        });
    });

    describe('get', function () {
        it('returns empty array if file does not exist', async function () {
            fsPathExistsStub.withArgs(`${basePath}redirects.yaml`).resolves(false);
            fsPathExistsStub.withArgs(`${basePath}redirects.json`).resolves(false);

            const file = await customRedirectsAPI.get();

            should.deepEqual(file, []);
        });

        it('returns a redirects YAML file if it exists', async function () {
            fsPathExistsStub.withArgs(`${basePath}redirects.yaml`).resolves(true);
            fsPathExistsStub.withArgs(`${basePath}redirects.json`).resolves(false);

            fsReadFileStub.withArgs(`${basePath}redirects.yaml`, 'utf-8').resolves('yaml content');
            fsReadFileStub.withArgs(`${basePath}redirects.json`, 'utf-8').resolves(null);

            const file = await customRedirectsAPI.get();

            should.deepEqual(file, 'yaml content');
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

            should.deepEqual(file, redirectJSONFixture);
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

            if (!expectedErrorMessage) {
                // This should never happen because the JSON is invalid
                should.fail('expectedErrorMessage is not set');
            }

            try {
                await customRedirectsAPI.setFromFilePath(invalidFilePath, '.json');
                should.fail('setFromFilePath did not throw');
            } catch (err) {
                should.exist(err);
                err.message.should.eql(`Could not parse JSON: ${expectedErrorMessage}.`);
            }
        });

        it('throws a syntax error when setting invalid (plain string) YAML redirects file', async function () {
            const invalidFilePath = path.join(__dirname, '/invalid/redirects/yaml.json');
            fsReadFileStub.withArgs(invalidFilePath, 'utf-8').resolves('x');

            try {
                await customRedirectsAPI.setFromFilePath(invalidFilePath, '.yaml');
                should.fail('setFromFilePath did not throw');
            } catch (err) {
                should.exist(err);
                err.message.should.eql('YAML input is invalid. Check the contents of your YAML file.');
            }
        });

        it('throws a syntax error when setting invalid (empty) YAML redirects file', async function () {
            const invalidFilePath = path.join(__dirname, '/invalid/redirects/yaml.json');
            fsReadFileStub.withArgs(invalidFilePath, 'utf-8').resolves('');

            try {
                await customRedirectsAPI.setFromFilePath(invalidFilePath, '.yaml');
                should.fail('setFromFilePath did not throw');
            } catch (err) {
                should.exist(err);
                err.message.should.eql('YAML input is invalid. Check the contents of your YAML file.');
            }
        });

        it('throws bad request error when the YAML file is invalid', async function () {
            const invalidFilePath = path.join(__dirname, '/invalid/redirects/yaml.json');
            fsReadFileStub.withArgs(invalidFilePath, 'utf-8').resolves(`
                routes:
                \
                invalid yaml:
                /
            `);

            try {
                await customRedirectsAPI.setFromFilePath(invalidFilePath, '.yaml');
                should.fail('setFromFilePath did not throw');
            } catch (err) {
                should.exist(err);
                err.errorType.should.eql('BadRequestError');
                err.message.should.match(/Could not parse YAML: can not read an implicit mapping pair/);
            }
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
            fsUnlinkStub.called.should.be.true();
            fsUnlinkStub.calledWith(backupFilePath).should.be.true();

            // backed up current routes file
            fsMoveStub.called.should.be.true();
            fsMoveStub.calledWith(existingRedirectsFilePath, backupFilePath).should.be.true();

            // written new routes file
            fsWriteFileStub.calledWith(existingRedirectsFilePath, redirectsJSONConfig, 'utf-8').should.be.true();

            // redirects have been re-registered
            redirectManager.removeAllRedirects.calledOnce.should.be.true();
            // one redirect in total
            redirectManager.addRedirect.calledOnce.should.be.true();
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
            fsUnlinkStub.called.should.not.be.true();

            // backed up current routes file
            fsMoveStub.called.should.be.true();

            // overwritten with incoming routes.yaml file
            fsCopyStub.calledWith(incomingFilePath, `${basePath}redirects.yaml`).should.be.true();

            // redirects have been re-registered
            redirectManager.removeAllRedirects.calledOnce.should.be.true();
            // two redirects in total
            redirectManager.addRedirect.calledTwice.should.be.true();
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

            try {
                await customRedirectsAPI.setFromFilePath(incomingFilePath, '.yaml');
                should.fail('setFromFilePath did not throw');
            } catch (err) {
                should.exist(err);
                err.errorType.should.eql('BadRequestError');
            }

            fsUnlinkStub.called.should.not.be.true();
            fsMoveStub.called.should.not.be.true();
        });
    });
});
