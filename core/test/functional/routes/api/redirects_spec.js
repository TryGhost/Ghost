var should = require('should'),
    supertest = require('supertest'),
    fs = require('fs-extra'),
    Promise = require('bluebird'),
    path = require('path'),
    testUtils = require('../../../utils'),
    configUtils = require('../../../utils/configUtils'),
    config = require('../../../../../core/server/config'),
    ghost = testUtils.startGhost,
    request, accesstoken;

should.equal(true, true);

describe('Redirects API', function () {
    var ghostServer;

    afterEach(function () {
        configUtils.restore();
    });

    describe('Download', function () {
        beforeEach(function () {
            return ghost().then(function (_ghostServer) {
                ghostServer = _ghostServer;
                return ghostServer.start();
            }).then(function () {
                request = supertest.agent(config.get('url'));
            }).then(function () {
                return testUtils.doAuth(request, 'client:trusted-domain');
            }).then(function (token) {
                accesstoken = token;
            });
        });

        afterEach(function () {
            return testUtils.clearData()
                .then(function () {
                    return ghostServer.stop();
                });
        });

        it('file does not exist', function (done) {
            // Just set any content folder, which does not contain a redirects file.
            configUtils.set('paths:contentPath', path.join(__dirname, '../../../utils/fixtures/data'));

            request
                .get(testUtils.API.getApiQuery('redirects/json/?client_id=ghost-admin&client_secret=not_available'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .set('Origin', testUtils.API.getURL())
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.headers['content-disposition'].should.eql('Attachment; filename="redirects.json"');
                    res.headers['content-type'].should.eql('application/json; charset=utf-8');
                    should.not.exist(res.headers['x-cache-invalidate']);

                    // API returns an empty file with the correct file structure (empty [])
                    res.headers['content-length'].should.eql('2');

                    done();
                });
        });

        it('file exists', function (done) {
            request
                .get(testUtils.API.getApiQuery('redirects/json/?client_id=ghost-admin&client_secret=not_available'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .set('Origin', testUtils.API.getURL())
                .expect('Content-Type', /application\/json/)
                .expect('Content-Disposition', 'Attachment; filename="redirects.json"')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.headers['content-disposition'].should.eql('Attachment; filename="redirects.json"');
                    res.headers['content-type'].should.eql('application/json; charset=utf-8');
                    res.headers['content-length'].should.eql('463');

                    done();
                });
        });
    });

    describe('Upload', function () {
        describe('Ensure re-registering redirects works', function () {
            var startGhost = function (options) {
                    return ghost(options).then(function (_ghostServer) {
                        ghostServer = _ghostServer;
                        return ghostServer.start();
                    }).then(function () {
                        request = supertest.agent(config.get('url'));
                    }).then(function () {
                        return testUtils.doAuth(request, 'client:trusted-domain');
                    }).then(function (token) {
                        accesstoken = token;
                    });
                },
                stopGhost = function () {
                    return testUtils.clearData()
                        .then(function () {
                            return ghostServer.stop();
                        });
                };

            afterEach(stopGhost);

            it('no redirects file exists', function (done) {
                return startGhost({redirectsFile: false})
                    .then(function () {
                        return new Promise(function (resolve) {
                            setTimeout(resolve, 100);
                        });
                    })
                    .then(function () {
                        return request
                            .get('/my-old-blog-post/')
                            .expect(404);
                    })
                    .then(function () {
                        // Provide a redirects file in the root directory of the content test folder
                        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects-init.json'), JSON.stringify([{from: 'k', to: 'l'}]));

                        return new Promise(function (resolve) {
                            setTimeout(resolve, 100);
                        });
                    })
                    .then(function () {
                        return request
                            .post(testUtils.API.getApiQuery('redirects/json/?client_id=ghost-admin&client_secret=not_available'))
                            .set('Authorization', 'Bearer ' + accesstoken)
                            .set('Origin', testUtils.API.getURL())
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects-init.json'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then(function (res) {
                        res.headers['x-cache-invalidate'].should.eql('/*');

                        return request
                            .get('/k/')
                            .expect(302);
                    })
                    .then(function (response) {
                        response.headers.location.should.eql('/l');

                        var dataFiles = fs.readdirSync(config.getContentPath('data'));
                        dataFiles.join(',').match(/(redirects)/g).length.should.eql(1);
                        done();
                    })
                    .catch(done);
            });

            it('override', function (done) {
                return startGhost()
                    .then(function () {
                        return new Promise(function (resolve) {
                            setTimeout(resolve, 100);
                        });
                    })
                    .then(function () {
                        return request
                            .get('/my-old-blog-post/')
                            .expect(301);
                    })
                    .then(function (response) {
                        response.headers.location.should.eql('/revamped-url/');
                        return stopGhost();
                    })
                    .then(function () {
                        return new Promise(function (resolve) {
                            setTimeout(resolve, 100);
                        });
                    })
                    .then(function () {
                        return startGhost();
                    })
                    .then(function () {
                        // Provide a second redirects file in the root directory of the content test folder
                        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.json'), JSON.stringify([{from: 'c', to: 'd'}]));

                        return new Promise(function (resolve) {
                            setTimeout(resolve, 100);
                        });
                    })
                    .then(function () {
                        // Override redirects file
                        return request
                            .post(testUtils.API.getApiQuery('redirects/json/?client_id=ghost-admin&client_secret=not_available'))
                            .set('Authorization', 'Bearer ' + accesstoken)
                            .set('Origin', testUtils.API.getURL())
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.json'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then(function (res) {
                        res.headers['x-cache-invalidate'].should.eql('/*');

                        return request
                            .get('/my-old-blog-post/')
                            .expect(404);
                    })
                    .then(function () {
                        return request
                            .get('/c/')
                            .expect(302);
                    })
                    .then(function (response) {
                        response.headers.location.should.eql('/d');

                        var dataFiles = fs.readdirSync(config.getContentPath('data'));
                        dataFiles.join(',').match(/(redirects)/g).length.should.eql(2);

                        // Provide another redirects file in the root directory of the content test folder
                        fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects-something.json'), JSON.stringify([{from: 'e', to: 'b'}]));

                        return new Promise(function (resolve) {
                            setTimeout(resolve, 1000 * 2);
                        });
                    })
                    .then(function () {
                        // Override redirects file again and ensure the backup file works twice
                        return request
                            .post(testUtils.API.getApiQuery('redirects/json/?client_id=ghost-admin&client_secret=not_available'))
                            .set('Authorization', 'Bearer ' + accesstoken)
                            .set('Origin', testUtils.API.getURL())
                            .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects-something.json'))
                            .expect('Content-Type', /application\/json/)
                            .expect(200);
                    })
                    .then(function () {
                        var dataFiles = fs.readdirSync(config.getContentPath('data'));
                        dataFiles.join(',').match(/(redirects)/g).length.should.eql(3);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('Error cases', function () {
            beforeEach(function () {
                return ghost().then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    return ghostServer.start();
                }).then(function () {
                    request = supertest.agent(config.get('url'));
                }).then(function () {
                    return testUtils.doAuth(request, 'client:trusted-domain');
                }).then(function (token) {
                    accesstoken = token;
                });
            });

            afterEach(function () {
                return testUtils.clearData()
                    .then(function () {
                        return ghostServer.stop();
                    });
            });

            it('syntax error', function (done) {
                fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.json'), 'something');

                request
                    .post(testUtils.API.getApiQuery('redirects/json/?client_id=ghost-admin&client_secret=not_available'))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .set('Origin', testUtils.API.getURL())
                    .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.json'))
                    .expect('Content-Type', /application\/json/)
                    .expect(400)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });

            it('wrong format: no array', function (done) {
                fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.json'), JSON.stringify({from: 'c', to: 'd'}));

                request
                    .post(testUtils.API.getApiQuery('redirects/json/?client_id=ghost-admin&client_secret=not_available'))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .set('Origin', testUtils.API.getURL())
                    .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.json'))
                    .expect('Content-Type', /application\/json/)
                    .expect(422)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });

            it('wrong format: no from/to', function (done) {
                fs.writeFileSync(path.join(config.get('paths:contentPath'), 'redirects.json'), JSON.stringify([{to: 'd'}]));

                request
                    .post(testUtils.API.getApiQuery('redirects/json/?client_id=ghost-admin&client_secret=not_available'))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .set('Origin', testUtils.API.getURL())
                    .attach('redirects', path.join(config.get('paths:contentPath'), 'redirects.json'))
                    .expect('Content-Type', /application\/json/)
                    .expect(422)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
        });
    });
});
