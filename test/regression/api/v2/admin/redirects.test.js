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

    describe('Download', function () {
        afterEach(function () {
            configUtils.config.set('paths:contentPath', originalContentPath);
        });

        it('file does not exist', function () {
            // Just set any content folder, which does not contain a redirects file.
            configUtils.set('paths:contentPath', path.join(__dirname, '../../../utils/fixtures/data'));

            return request
                .get(localUtils.API.getApiQuery('redirects/json/'))
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
                .get(localUtils.API.getApiQuery('redirects/json/'))
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

    describe('Upload', function () {
        describe('Error cases', function () {
            it('syntax error', function () {
                fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.json'), 'something');

                return request
                    .post(localUtils.API.getApiQuery('redirects/json/'))
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
                    .post(localUtils.API.getApiQuery('redirects/json/'))
                    .set('Origin', config.get('url'))
                    .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.json'))
                    .expect('Content-Type', /application\/json/)
                    .expect(422);
            });

            it('wrong format: no from/to', function () {
                fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.json'), JSON.stringify([{to: 'd'}]));

                return request
                    .post(localUtils.API.getApiQuery('redirects/json/'))
                    .set('Origin', config.get('url'))
                    .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.json'))
                    .expect('Content-Type', /application\/json/)
                    .expect(422);
            });
        });

        describe('Ensure re-registering redirects works', function () {
            const startGhost = (options) => {
                return ghost(options)
                    .then(() => {
                        request = supertest.agent(config.get('url'));
                    })
                    .then(() => {
                        return localUtils.doAuth(request);
                    });
            };

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
});
