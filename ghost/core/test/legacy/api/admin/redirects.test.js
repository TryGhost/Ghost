const assert = require('node:assert/strict');
const supertest = require('supertest');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const localUtils = require('./utils');
const config = require('../../../../core/shared/config');

let request;

describe('Redirects API', function () {
    const startGhost = async (options) => {
        await localUtils.startGhost(options);
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    };

    describe('Upload', function () {
        describe('Ensure re-registering redirects works', function () {
            it('no redirects file exists', function () {
                // NOTE: this dance with content folder is here because we need to test a clean state
                //       which is currently impossible with available test utils.
                //       The test itself should be broken down into a unit test for the
                //       Redirects service class.
                const contentFolder = path.join(os.tmpdir(), crypto.randomUUID(), 'ghost-test');
                fs.ensureDirSync(contentFolder);
                fs.ensureDirSync(path.join(contentFolder, 'data'));
                fs.writeFileSync(path.join(contentFolder, 'data', 'redirects.json'), JSON.stringify([]));

                return startGhost({
                    frontend: true,
                    redirectsFile: false,
                    contentFolder: contentFolder
                })
                    .then(() => {
                        return request
                            .get('/my-old-blog-post/')
                            .expect(404);
                    })
                    .then(() => {
                        // Provide a redirects file in the root directory of the content test folder
                        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects-init.json'), JSON.stringify([{
                            from: 'k',
                            to: 'l'
                        }]));
                    })
                    .then(() => {
                        return request
                            .post(localUtils.API.getApiQuery('redirects/upload/'))
                            .set('Origin', config.get('url'))
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects-init.json'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then((res) => {
                        assert.equal(res.headers['x-cache-invalidate'], '/*');

                        return request
                            .get('/k/')
                            .expect(302);
                    })
                    .then((response) => {
                        assert.equal(response.headers.location, '/l');

                        const dataFiles = fs.readdirSync(config.getContentPath('data'));
                        assert.equal(dataFiles.join(',').match(/(redirects)/g).length, 2);

                        const fileContent = fs.readFileSync(path.join(contentFolder, 'data', 'redirects.json'), 'utf-8');
                        assert.equal(fileContent, JSON.stringify([{
                            from: 'k',
                            to: 'l'
                        }]));
                    })
                    .then(() => {
                        // Provide a second redirects file in the root directory of the content test folder
                        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.yaml'), '302:\n  c: d');
                    })
                    .then(() => {
                        // Override redirects file
                        return request
                            .post(localUtils.API.getApiQuery('redirects/upload/'))
                            .set('Origin', config.get('url'))
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.yaml'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then((res) => {
                        assert.equal(res.headers['x-cache-invalidate'], '/*');

                        return request
                            .get('/my-old-blog-post/')
                            .expect(404);
                    })
                    .then(() => {
                        return request
                            .get('/c/')
                            .expect(302);
                    })
                    .then((response) => {
                        assert.equal(response.headers.location, '/d');

                        // FileStore always persists as redirects.json regardless of upload
                        // format and moves the previous file to a timestamped backup. After
                        // two uploads we expect the canonical redirects.json with the parsed
                        // config from the most recent upload, plus a timestamped .json backup
                        // of the first upload's contents.
                        const dataDir = path.join(config.get('paths:contentPath'), 'data');
                        const fileContent = fs.readFileSync(path.join(dataDir, 'redirects.json'), 'utf-8');
                        assert.deepEqual(JSON.parse(fileContent), [
                            {from: 'c', to: 'd', permanent: false}
                        ]);

                        const entries = fs.readdirSync(dataDir);
                        assert.ok(
                            entries.some(name => /^redirects-.+\.json$/.test(name)),
                            `expected a timestamped redirects.json backup in ${entries.join(', ')}`
                        );
                    });
            });
        });
    });
});
