var testUtils     = require('../../../utils'),
    /*jshint unused:false*/
    should        = require('should'),
    path          = require('path'),
    fs            = require('fs-extra'),
    supertest     = require('supertest'),
    ghost         = testUtils.startGhost,
    rewire        = require('rewire'),
    config        = require('../../../../../core/server/config'),
    request;

describe('Upload Icon API', function () {
    var accesstoken = '',
        getIconDimensions,
        icons = [];

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
        }).then(function () {
            return testUtils.doAuth(request);
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(done);
    });

    after(function (done) {
        icons.forEach(function (icon) {
            fs.removeSync(config.get('paths').appRoot + icon);
        });

        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    describe('success cases for icons', function () {
        it('valid png', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/favicon.png'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    icons.push(res.body);
                    done();
                });
        });

        it('valid ico with multiple sizes', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/favicon_multi_sizes.ico'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    icons.push(res.body);
                    done();
                });
        });
        it('valid ico with one size', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/favicon_32x_single.ico'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    icons.push(res.body);
                    done();
                });
        });
    });

    describe('error cases for icons', function () {
        it('import should fail without file', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(403)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('import should fail with unsupported file', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/ghosticon.jpg'))
                .expect(415)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('incorrect extension', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .set('content-type', 'image/png')
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/ghost-logo.pngx'))
                .expect(415)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('import should fail, if icon is not square', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/favicon_not_square.png'))
                .expect(422)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('import should fail, if icon file size is too large', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/favicon_size_too_large.png'))
                .expect(413)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('import should fail, if icon dimensions are too large', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/favicon_too_large.png'))
                .expect(422)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('import should fail, if png icon dimensions are too small', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/favicon_too_small.png'))
                .expect(422)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('import should fail, if png icon dimensions are too small', function (done) {
            request.post(testUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/favicon_16x_single.ico'))
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
