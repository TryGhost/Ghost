const should = require('should');
const supertest = require('supertest');
const fs = require('fs-extra');
const Promise = require('bluebird');
const path = require('path');
const os = require('os');
const uuid = require('uuid');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../core/shared/config');

const ghost = testUtils.startGhost;
let request;

describe('Redirects API', function () {
    const startGhost = (options) => {
        return ghost(options)
            .then(() => {
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request);
            });
    };

    describe('Upload', function () {
        describe('Ensure re-registering redirects works', function () {
            it('no redirects file exists', function () {
                // NOTE: this dance with content folder is here because we need to test a clean state
                //       which is currently impossible with available test utils.
                //       The test itself should be broken down into a unit test for the
                //       Redirects service class.
                const contentFolder = path.join(os.tmpdir(), uuid.v4(), 'ghost-test');
                fs.ensureDirSync(contentFolder);
                fs.ensureDirSync(path.join(contentFolder, 'data'));
                fs.writeFileSync(path.join(contentFolder, 'data', 'redirects.json'), JSON.stringify([]));

                return startGhost({
                    redirectsFile: false,
                    contentFolder: contentFolder,
                    forceStart: true
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
                            .post(localUtils.API.getApiQuery('redirects/json/'))
                            .set('Origin', config.get('url'))
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects-init.json'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then((res) => {
                        res.headers['x-cache-invalidate'].should.eql('/*');

                        return request
                            .get('/k/')
                            .expect(302);
                    })
                    .then((response) => {
                        response.headers.location.should.eql('/l');

                        const dataFiles = fs.readdirSync(config.getContentPath('data'));
                        dataFiles.join(',').match(/(redirects)/g).length.should.eql(2);
                    });
            });

            it('override', function () {
                return startGhost({forceStart: true})
                    .then(() => {
                        return request
                            .get('/my-old-blog-post/')
                            .expect(301);
                    })
                    .then((response) => {
                        response.headers.location.should.eql('/revamped-url/');
                    })
                    .then(() => {
                        // Provide a second redirects file in the root directory of the content test folder
                        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.json'), JSON.stringify([{
                            from: 'c',
                            to: 'd'
                        }]));
                    })
                    .then(() => {
                        // Override redirects file
                        return request
                            .post(localUtils.API.getApiQuery('redirects/json/'))
                            .set('Origin', config.get('url'))
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.json'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then((res) => {
                        res.headers['x-cache-invalidate'].should.eql('/*');

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
                        response.headers.location.should.eql('/d');

                        // check backup of redirects files
                        const dataFiles = fs.readdirSync(config.getContentPath('data'));
                        dataFiles.join(',').match(/(redirects)/g).length.should.eql(2);

                        // Provide another redirects file in the root directory of the content test folder
                        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects-something.json'), JSON.stringify([{
                            from: 'e',
                            to: 'b'
                        }]));
                    })
                    .then(() => {
                        // the backup is in the format HH:mm:ss, we have to wait minimum a second
                        return new Promise((resolve) => {
                            setTimeout(resolve, 1100);
                        });
                    })
                    .then(() => {
                        // Override redirects file again and ensure the backup file works twice
                        return request
                            .post(localUtils.API.getApiQuery('redirects/json/'))
                            .set('Origin', config.get('url'))
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects-something.json'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then(() => {
                        const dataFiles = fs.readdirSync(config.getContentPath('data'));
                        dataFiles.join(',').match(/(redirects)/g).length.should.eql(3);
                    });
            });
        });
    });

    describe('Upload yaml', function () {
        describe('Ensure re-registering redirects works', function () {
            it('no redirects file exists', function () {
                return startGhost({redirectsFile: false, forceStart: true})
                    .then(() => {
                        return request
                            .get('/my-old-blog-post/')
                            .expect(404);
                    })
                    .then(() => {
                        // Provide a redirects file in the root directory of the content test folder
                        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects-init.yaml'), '302:\n  k: l');
                    })
                    .then(() => {
                        return request
                            .post(localUtils.API.getApiQuery('redirects/json/'))
                            .set('Origin', config.get('url'))
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects-init.yaml'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then((res) => {
                        res.headers['x-cache-invalidate'].should.eql('/*');

                        return request
                            .get('/k/')
                            .expect(302);
                    })
                    .then((response) => {
                        response.headers.location.should.eql('/l');

                        const dataFiles = fs.readdirSync(config.getContentPath('data'));
                        dataFiles.join(',').match(/(redirects)/g).length.should.eql(1);
                    });
            });

            it('override', function () {
                // We want to test if we can override old redirects.json with new redirects.yaml
                // That's why we start with .json.
                return startGhost({forceStart: true, redirectsFileExt: '.json'})
                    .then(() => {
                        return request
                            .get('/my-old-blog-post/')
                            .expect(301);
                    })
                    .then((response) => {
                        response.headers.location.should.eql('/revamped-url/');
                    })
                    .then(() => {
                        // Provide a second redirects file in the root directory of the content test folder
                        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.yaml'), '302:\n  c: d');
                    })
                    .then(() => {
                        // Override redirects file
                        return request
                            .post(localUtils.API.getApiQuery('redirects/json/'))
                            .set('Origin', config.get('url'))
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.yaml'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then((res) => {
                        res.headers['x-cache-invalidate'].should.eql('/*');

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
                        response.headers.location.should.eql('/d');

                        // check backup of redirects files
                        const dataFiles = fs.readdirSync(config.getContentPath('data'));
                        dataFiles.join(',').match(/(redirects)/g).length.should.eql(2);

                        // Provide another redirects file in the root directory of the content test folder
                        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects-something.json'), JSON.stringify([{
                            from: 'e',
                            to: 'b'
                        }]));
                    })
                    .then(() => {
                        // the backup is in the format HH:mm:ss, we have to wait minimum a second
                        return new Promise((resolve) => {
                            setTimeout(resolve, 1100);
                        });
                    })
                    .then(() => {
                        // Override redirects file again and ensure the backup file works twice
                        return request
                            .post(localUtils.API.getApiQuery('redirects/json/'))
                            .set('Origin', config.get('url'))
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects-something.json'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then(() => {
                        return request
                            .get('/e/')
                            .expect(302);
                    })
                    .then((response) => {
                        response.headers.location.should.eql('/b');

                        const dataFiles = fs.readdirSync(config.getContentPath('data'));
                        dataFiles.join(',').match(/(redirects)/g).length.should.eql(3);
                    });
            });
        });
    });

    // TODO: For backward compatibility, we only check if download, upload endpoints work here.
    // when updating to v4, the old endpoints should be updated to the new ones.
    // And the tests below should be removed.
    describe('New endpoints work', function () {
        it('download', function () {
            return request
                .get(localUtils.API.getApiQuery('redirects/download/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /application\/json/)
                .expect('Content-Disposition', 'Attachment; filename="redirects.json"')
                .expect(200);
        });

        it('upload', function () {
            // Provide a redirects file in the root directory of the content test folder
            fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects-init.json'), JSON.stringify([{
                from: 'k',
                to: 'l'
            }]));

            return request
                .post(localUtils.API.getApiQuery('redirects/upload/'))
                .set('Origin', config.get('url'))
                .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects-init.json'))
                .expect('Content-Type', /application\/json/)
                .expect(200);
        });
    });
});
