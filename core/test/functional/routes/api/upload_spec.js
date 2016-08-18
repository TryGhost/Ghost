var testUtils     = require('../../../utils'),
    /*jshint unused:false*/
    should        = require('should'),
    path          = require('path'),
    fs            = require('fs-extra'),
    supertest     = require('supertest'),
    ghost         = require('../../../../../core'),
    config        = require('../../../../../core/server/config'),
    request;

describe('Upload API', function () {
    var accesstoken = '',
        images = [];

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
        images.forEach(function (image) {
            fs.removeSync(config.paths.appRoot + image);
        });

        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    describe('success cases', function () {
        it('valid png', function (done) {
            request.post(testUtils.API.getApiQuery('uploads'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/ghost-logo.png'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    images.push(res.body);
                    done();
                });
        });

        it('valid jpg', function (done) {
            request.post(testUtils.API.getApiQuery('uploads'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/ghosticon.jpg'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    images.push(res.body);
                    done();
                });
        });

        it('valid gif', function (done) {
            request.post(testUtils.API.getApiQuery('uploads'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/images/loadingcat.gif'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    images.push(res.body);
                    done();
                });
        });
    });

    describe('error cases', function () {
        it('import should fail without file', function (done) {
            request.post(testUtils.API.getApiQuery('uploads'))
                .set('Authorization', 'Bearer ' + accesstoken)
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
            request.post(testUtils.API.getApiQuery('uploads'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage',  path.join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv'))
                .expect(415)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('incorrect extension', function (done) {
            request.post(testUtils.API.getApiQuery('uploads'))
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
    });
});
