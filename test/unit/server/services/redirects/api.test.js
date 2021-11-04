const should = require('should');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs-extra');

const logging = require('@tryghost/logging');
const DynamicRedirectManager = require('@tryghost/express-dynamic-redirects');
const CustomRedirectsAPI = require('../../../../../core/server/services/redirects/api');

describe('UNIT: redirects CustomRedirectsAPI class', function () {
    let customRedirectsAPI;
    const basePath = path.join(__dirname, '../../../../utils/fixtures/data/');

    before(function () {
        const redirectManager = new DynamicRedirectManager({
            permanentMaxAge: 100,
            getSubdirectoryURL: (pathname) => {
                return `/ghost/${pathname}`;
            }
        });

        customRedirectsAPI = new CustomRedirectsAPI({
            basePath
        }, redirectManager);
    });

    beforeEach(function () {
        sinon.stub(fs, 'pathExists');
        sinon.stub(fs, 'readFile');
        sinon.spy(logging, 'error');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('init', function () {
        it('initializes without errors when redirects file is not present', async function () {
            const redirectManager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return `/ghost/${pathname}`;
                }
            });

            customRedirectsAPI = new CustomRedirectsAPI({
                basePath
            }, redirectManager);

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
    });
});
