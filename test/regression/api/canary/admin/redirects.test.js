const should = require('should');
const supertest = require('supertest');
const fs = require('fs-extra');
const Promise = require('bluebird');
const path = require('path');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const configUtils = require('../../../../utils/configUtils');
const config = require('../../../../../core/shared/config');

const ghost = testUtils.startGhost;
let request;

describe('Redirects API', function () {
    let originalContentPath;

    before(function () {
        return ghost({redirectsFile: true})
            .then(() => {
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request);
            })
            .then(() => {
                originalContentPath = configUtils.config.get('paths:contentPath');
            });
    });

    const startGhost = (options) => {
        return ghost(options)
            .then(() => {
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request);
            });
    };

    describe('Download', function () {
        afterEach(function () {
            configUtils.config.set('paths:contentPath', originalContentPath);
        });

        it('file does not exist', function () {
            // Just set any content folder, which does not contain a redirects file.
            configUtils.set('paths:contentPath', path.join(__dirname, '../../../utils/fixtures/data'));

            return request
                .get(localUtils.API.getApiQuery('redirects/download/'))
                .set('Origin', config.get('url'))
                .expect(200)
                .then((res) => {
                    res.headers['content-disposition'].should.eql('Attachment; filename="redirects.json"');
                    res.headers['content-type'].should.eql('application/json; charset=utf-8');
                    should.not.exist(res.headers['x-cache-invalidate']);

                    should.deepEqual(res.body, []);
                });
        });

        it('file exists', function () {
            return request
                .get(localUtils.API.getApiQuery('redirects/download/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /application\/json/)
                .expect('Content-Disposition', 'Attachment; filename="redirects.json"')
                .expect(200)
                .then((res) => {
                    res.headers['content-disposition'].should.eql('Attachment; filename="redirects.json"');
                    res.headers['content-type'].should.eql('application/json; charset=utf-8');

                    should.deepEqual(res.body, require('../../../../utils/fixtures/data/redirects.json'));
                });
        });
    });

    describe('Download yaml', function () {
        beforeEach(function () {
            testUtils.setupRedirectsFile(config.get('paths:contentPath'), '.yaml');
        });

        afterEach(function () {
            testUtils.setupRedirectsFile(config.get('paths:contentPath'), '.json');
        });

        // 'file does not exist' doesn't have to be tested because it always returns .json file.
        // TODO: But it should be written when the default redirects file type is changed to yaml.

        it('file exists', function () {
            return request
                .get(localUtils.API.getApiQuery('redirects/download/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /text\/html/)
                .expect('Content-Disposition', 'Attachment; filename="redirects.yaml"')
                .expect(200)
                .then((res) => {
                    res.headers['content-disposition'].should.eql('Attachment; filename="redirects.yaml"');
                    res.headers['content-type'].should.eql('text/html; charset=utf-8');

                    should.deepEqual(res.text, fs.readFileSync(path.join(__dirname, '../../../../utils/fixtures/data/redirects.yaml')).toString());
                });
        });
    });

    describe('Upload', function () {
        describe('Error cases', function () {
            it('syntax error', function () {
                fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.json'), 'something');

                return request
                    .post(localUtils.API.getApiQuery('redirects/upload/'))
                    .set('Origin', config.get('url'))
                    .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.json'))
                    .expect('Content-Type', /application\/json/)
                    .expect(400);
            });

            it('wrong format: no array', function () {
                fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.json'), JSON.stringify({
                    from: 'c',
                    to: 'd'
                }));

                return request
                    .post(localUtils.API.getApiQuery('redirects/upload/'))
                    .set('Origin', config.get('url'))
                    .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.json'))
                    .expect('Content-Type', /application\/json/)
                    .expect(422);
            });

            it('wrong format: no from/to', function () {
                fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.json'), JSON.stringify([{to: 'd'}]));

                return request
                    .post(localUtils.API.getApiQuery('redirects/upload/'))
                    .set('Origin', config.get('url'))
                    .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.json'))
                    .expect('Content-Type', /application\/json/)
                    .expect(422);
            });
        });

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
                            .post(localUtils.API.getApiQuery('redirects/upload/'))
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
                            .post(localUtils.API.getApiQuery('redirects/upload/'))
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
        describe('Error cases', function () {
            it('syntax error', function () {
                fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.yaml'), 'x');

                return request
                    .post(localUtils.API.getApiQuery('redirects/upload/'))
                    .set('Origin', config.get('url'))
                    .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.yaml'))
                    .expect('Content-Type', /application\/json/)
                    .expect(400);
            });
        });

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
                            .post(localUtils.API.getApiQuery('redirects/upload/'))
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
                            .post(localUtils.API.getApiQuery('redirects/upload/'))
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
                            .post(localUtils.API.getApiQuery('redirects/upload/'))
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
