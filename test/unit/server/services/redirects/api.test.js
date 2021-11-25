const should = require('should');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs-extra');

const logging = require('@tryghost/logging');
const CustomRedirectsAPI = require('../../../../../core/server/services/redirects/api');

describe('UNIT: redirects CustomRedirectsAPI class', function () {
    let customRedirectsAPI;
    let redirectManager;
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

        sinon.stub(fs, 'pathExists');
        sinon.stub(fs, 'writeFile');
        sinon.stub(fs, 'readFile');
        sinon.stub(fs, 'unlink');
        sinon.stub(fs, 'move');
        sinon.stub(fs, 'copy');
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
            fs.pathExists.withArgs(`${basePath}redirects.yaml`).resolves(false);
            fs.pathExists.withArgs(`${basePath}redirects.json`).resolves(false);

            const file = await customRedirectsAPI.get();

            should.deepEqual(file, []);
        });

        it('returns a redirects YAML file if it exists', async function () {
            fs.pathExists.withArgs(`${basePath}redirects.yaml`).resolves(true);
            fs.pathExists.withArgs(`${basePath}redirects.json`).resolves(false);

            fs.readFile.withArgs(`${basePath}redirects.yaml`, 'utf-8').resolves('yaml content');
            fs.readFile.withArgs(`${basePath}redirects.json`, 'utf-8').resolves(null);

            const file = await customRedirectsAPI.get();

            should.deepEqual(file, 'yaml content');
        });

        it('returns a redirects JSON file if YAML does not exists', async function () {
            const redirectJSONFixture = [{
                from: '^/post/[0-9]+/([a-z0-9\\-]+)',
                to: '/$1'
            }];

            fs.pathExists.withArgs(`${basePath}redirects.yaml`).resolves(false);
            fs.pathExists.withArgs(`${basePath}redirects.json`).resolves(true);

            fs.readFile.withArgs(`${basePath}redirects.yaml`, 'utf-8').resolves(null);
            fs.readFile.withArgs(`${basePath}redirects.json`, 'utf-8').resolves(JSON.stringify(redirectJSONFixture));

            const file = await customRedirectsAPI.get();

            should.deepEqual(file, redirectJSONFixture);
        });
    });

    describe('setFromFilePath', function () {
        it('throws a syntax error when setting invalid JSON redirects file', async function () {
            const invalidFilePath = path.join(__dirname, '/invalid/redirects/path.json');
            fs.readFile.withArgs(invalidFilePath, 'utf-8').resolves('{invalid json');

            try {
                await customRedirectsAPI.setFromFilePath(invalidFilePath, '.json');
                should.fail('setFromFilePath did not throw');
            } catch (err) {
                should.exist(err);
                err.message.should.eql('Could not parse JSON: Unexpected token i in JSON at position 1.');
            }
        });

        it('throws a syntax error when setting invalid (plain string) YAML redirects file', async function () {
            const invalidFilePath = path.join(__dirname, '/invalid/redirects/yaml.json');
            fs.readFile.withArgs(invalidFilePath, 'utf-8').resolves('x');

            try {
                await customRedirectsAPI.setFromFilePath(invalidFilePath, '.yaml');
                should.fail('setFromFilePath did not throw');
            } catch (err) {
                should.exist(err);
                err.message.should.eql('YAML input cannot be a plain string. Check the format of your YAML file.');
            }
        });

        it('throws bad request error when the YAML file is invalid', async function () {
            const invalidFilePath = path.join(__dirname, '/invalid/redirects/yaml.json');
            fs.readFile.withArgs(invalidFilePath, 'utf-8').resolves(`
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
            fs.pathExists.withArgs(existingRedirectsFilePath).resolves(true);
            fs.pathExists.withArgs(`${basePath}redirects.yaml`).resolves(false);
            // incoming redirects file
            fs.readFile.withArgs(incomingFilePath, 'utf-8').resolves(redirectsJSONConfig);
            // backup file already exists
            fs.pathExists.withArgs(backupFilePath).resolves(true);
            fs.unlink.withArgs(backupFilePath).resolves(true);
            fs.move.withArgs(incomingFilePath, backupFilePath).resolves(true);

            customRedirectsAPI = new CustomRedirectsAPI({
                basePath,
                redirectManager,
                getBackupFilePath: () => backupFilePath,
                validate: () => {}
            });

            await customRedirectsAPI.setFromFilePath(incomingFilePath, '.json');

            // backed up file with the same name already exists so remove it
            fs.unlink.called.should.be.true();
            fs.unlink.calledWith(backupFilePath).should.be.true();

            // backed up current routes file
            fs.move.called.should.be.true();
            fs.move.calledWith(existingRedirectsFilePath, backupFilePath).should.be.true();

            // written new routes file
            fs.writeFile.calledWith(existingRedirectsFilePath, redirectsJSONConfig, 'utf-8').should.be.true();

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
            fs.pathExists.withArgs(`${basePath}redirects.json`).resolves(false);
            fs.pathExists.withArgs(`${basePath}redirects.yaml`).resolves(true);
            // incoming redirects file
            fs.readFile.withArgs(incomingFilePath, 'utf-8').resolves(redirectsYamlConfig);
            // backup file DOES not exists yet
            fs.pathExists.withArgs(backupFilePath).resolves(false);
            // should not be called
            fs.unlink.withArgs(backupFilePath).resolves(false);
            fs.move.withArgs(`${basePath}redirects.yaml`, backupFilePath).resolves(true);

            customRedirectsAPI = new CustomRedirectsAPI({
                basePath,
                redirectManager,
                getBackupFilePath: () => backupFilePath,
                validate: () => {}
            });

            await customRedirectsAPI.setFromFilePath(incomingFilePath, '.yaml');

            // no existing backup file name match, did not remove any files
            fs.unlink.called.should.not.be.true();

            // backed up current routes file
            fs.move.called.should.be.true();

            // overwritten with incoming routes.yaml file
            fs.copy.calledWith(incomingFilePath, `${basePath}redirects.yaml`).should.be.true();

            // redirects have been re-registered
            redirectManager.removeAllRedirects.calledOnce.should.be.true();
            // two redirects in total
            redirectManager.addRedirect.calledTwice.should.be.true();
        });
    });
});
