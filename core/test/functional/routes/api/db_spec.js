var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    path = require('path'),
    sinon = require('sinon'),
    config = require('../../../../../core/server/config'),
    models = require('../../../../../core/server/models'),
    fs = require('fs'),
    _ = require('lodash'),
    ghost = testUtils.startGhost,
    request,

    sandbox = sinon.sandbox.create();

describe('DB API', function () {
    var accesstoken = '', ghostServer, clients, backupClient, schedulerClient, backupQuery, schedulerQuery, fsStub;

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (_ghostServer) {
            ghostServer = _ghostServer;
            return ghostServer.start();
        }).then(function () {
            request = supertest.agent(config.get('url'));
        }).then(function () {
            return testUtils.doAuth(request);
        }).then(function (token) {
            accesstoken = token;
            return models.Client.findAll();
        }).then(function (result) {
            clients = result.toJSON();
            backupClient = _.find(clients, {slug: 'ghost-backup'});
            schedulerClient = _.find(clients, {slug: 'ghost-scheduler'});

            done();
        }).catch(done);
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        return testUtils.clearData()
            .then(function () {
                return ghostServer.stop();
            });
    });

    it('attaches the Content-Disposition header on export', function (done) {
        request.get(testUtils.API.getApiQuery('db/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .expect('Content-Disposition', /Attachment; filename="[A-Za-z0-9._-]+\.json"/)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                done();
            });
    });

    it('should work with access token set as query parameter', function (done) {
        request.get(testUtils.API.getApiQuery('db/?access_token=' + accesstoken))
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                done();
            });
    });

    it('import should fail without file', function (done) {
        request.post(testUtils.API.getApiQuery('db/'))
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
        request.post(testUtils.API.getApiQuery('db/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .attach('importfile',  path.join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv'))
            .expect(415)
            .end(function (err) {
                if (err) {
                    return done(err);
                }

                done();
            });
    });

    it('export can be triggered by backup client', function (done) {
        backupQuery = '?client_id=' + backupClient.slug + '&client_secret=' + backupClient.secret;
        fsStub = sandbox.stub(fs, 'writeFile').yields();
        request.post(testUtils.API.getApiQuery('db/backup' + backupQuery))
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                res.body.should.match(/data/);
                fsStub.calledOnce.should.eql(true);

                done();
            });
    });

    it('export can be triggered by backup client', function (done) {
        schedulerQuery = '?client_id=' + schedulerClient.slug + '&client_secret=' + schedulerClient.secret;
        fsStub = sandbox.stub(fs, 'writeFile').yields();
        request.post(testUtils.API.getApiQuery('db/backup' + schedulerQuery))
            .expect('Content-Type', /json/)
            .expect(403)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.exist(res.body.errors);
                res.body.errors[0].errorType.should.eql('NoPermissionError');
                fsStub.called.should.eql(false);

                done();
            });
    });
});
