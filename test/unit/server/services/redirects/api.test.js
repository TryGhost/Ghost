const should = require('should');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs-extra');

const DynamicRedirectManager = require('@tryghost/express-dynamic-redirects');
const CustomRedirectsAPI = require('../../../../../core/server/services/redirects/api');

describe('UNIT: redirects CustomRedirectsAPI class', function () {
    beforeEach(function () {
        sinon.stub(fs, 'pathExists');
        sinon.stub(fs, 'readFile');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('get', function () {
        it('returns empty array if file does not exist', async function () {
            const basePath = path.join(__dirname, '../../../../utils/fixtures/data/');
            fs.pathExists.withArgs(`${basePath}redirects.yaml`).resolves(false);
            fs.pathExists.withArgs(`${basePath}redirects.json`).resolves(false);

            const redirectManager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return `/ghost/${pathname}`;
                }
            });

            const customRedirectsAPI = new CustomRedirectsAPI({
                basePath
            }, redirectManager);

            const file = await customRedirectsAPI.get();

            should.deepEqual(file, []);
        });

        it('returns a redirects YAML file if it exists', async function () {
            const basePath = path.join(__dirname, '../../../../utils/fixtures/data/');
            fs.pathExists.withArgs(`${basePath}redirects.yaml`).resolves(true);
            fs.pathExists.withArgs(`${basePath}redirects.json`).resolves(false);

            fs.readFile.withArgs(`${basePath}redirects.yaml`, 'utf-8').resolves('yaml content');
            fs.readFile.withArgs(`${basePath}redirects.json`, 'utf-8').resolves(null);

            const redirectManager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return `/ghost/${pathname}`;
                }
            });

            const customRedirectsAPI = new CustomRedirectsAPI({
                basePath
            }, redirectManager);

            const file = await customRedirectsAPI.get();

            should.deepEqual(file, 'yaml content');
        });

        it('returns a redirects JSON file if YAML does not exists', async function () {
            const basePath = path.join(__dirname, '../../../../utils/fixtures/data/');
            const redirectJSONFixture = [{
                from: '^/post/[0-9]+/([a-z0-9\\-]+)',
                to: '/$1'
            }];

            fs.pathExists.withArgs(`${basePath}redirects.yaml`).resolves(false);
            fs.pathExists.withArgs(`${basePath}redirects.json`).resolves(true);

            fs.readFile.withArgs(`${basePath}redirects.yaml`, 'utf-8').resolves(null);
            fs.readFile.withArgs(`${basePath}redirects.json`, 'utf-8').resolves(JSON.stringify(redirectJSONFixture));

            const redirectManager = new DynamicRedirectManager({
                permanentMaxAge: 100,
                getSubdirectoryURL: (pathname) => {
                    return `/ghost/${pathname}`;
                }
            });

            const customRedirectsAPI = new CustomRedirectsAPI({
                basePath
            }, redirectManager);

            const file = await customRedirectsAPI.get();

            should.deepEqual(file, redirectJSONFixture);
        });
    });
});
