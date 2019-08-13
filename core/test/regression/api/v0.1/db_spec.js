const should = require('should');
const supertest = require('supertest');
const Promise = require('bluebird');
const testUtils = require('../../../utils/index');
const path = require('path');
const sinon = require('sinon');
const config = require('../../../../server/config/index');
const models = require('../../../../server/models/index');
const fs = require('fs-extra');
const _ = require('lodash');
const common = require('../../../../server/lib/common/index');
const localUtils = require('./utils');

let ghost = testUtils.startGhost;
let request;
let eventsTriggered;

describe('DB API', function () {
    var accesstoken = '', ghostServer, clients, backupClient, schedulerClient, backupQuery, schedulerQuery, fsStub;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            })
            .then(function (token) {
                accesstoken = token;
                return models.Client.findAll();
            })
            .then(function (result) {
                clients = result.toJSON();
                backupClient = _.find(clients, {slug: 'ghost-backup'});
                schedulerClient = _.find(clients, {slug: 'ghost-scheduler'});
            });
    });

    beforeEach(function () {
        eventsTriggered = {};

        sinon.stub(common.events, 'emit').callsFake(function (eventName, eventObj) {
            if (!eventsTriggered[eventName]) {
                eventsTriggered[eventName] = [];
            }

            eventsTriggered[eventName].push(eventObj);
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('attaches the Content-Disposition header on export', function (done) {
        request.get(localUtils.API.getApiQuery('db/'))
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
                should.exist(res.headers['content-disposition']);

                var jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                done();
            });
    });

    it('should work with access token set as query parameter', function (done) {
        request.get(localUtils.API.getApiQuery('db/?access_token=' + accesstoken))
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                Object.keys(jsonResponse.db[0].data).length.should.eql(25);
                done();
            });
    });

    it('include more tables', function (done) {
        request.get(localUtils.API.getApiQuery('db/?include=clients,client_trusted_domains'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                const jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                Object.keys(jsonResponse.db[0].data).length.should.eql(27);
                done();
            });
    });

    it('import should fail without file', function () {
        return request.post(localUtils.API.getApiQuery('db/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(422);
    });

    it('import should fail with unsupported file', function (done) {
        request.post(localUtils.API.getApiQuery('db/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv'))
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
        fsStub = sinon.stub(fs, 'writeFile').resolves();
        request.post(localUtils.API.getApiQuery('db/backup' + backupQuery))
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                (typeof res.body).should.be.Object;
                should.exist(res.body.db[0].filename);
                fsStub.calledOnce.should.eql(true);

                done();
            });
    });

    it('export can be triggered and named by backup client', function (done) {
        backupQuery = '?client_id=' + backupClient.slug + '&client_secret=' + backupClient.secret + '&filename=test';
        fsStub = sinon.stub(fs, 'writeFile').resolves();
        request.post(localUtils.API.getApiQuery('db/backup' + backupQuery))
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                (typeof res.body).should.be.Object;
                res.body.db[0].filename.should.match(/test\.json/);
                fsStub.calledOnce.should.eql(true);

                done();
            });
    });

    it('export can not be triggered by client other than backup', function (done) {
        schedulerQuery = '?client_id=' + schedulerClient.slug + '&client_secret=' + schedulerClient.secret;
        fsStub = sinon.stub(fs, 'writeFile').resolves();
        request.post(localUtils.API.getApiQuery('db/backup' + schedulerQuery))
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

    it('delete all content (owner)', function (done) {
        request.get(localUtils.API.getApiQuery('posts/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                let jsonResponse = res.body;
                let results = jsonResponse.posts;
                jsonResponse.posts.should.have.length(7);
                _.filter(results, {page: false, status: 'published'}).length.should.equal(7);

                request.delete(localUtils.API.getApiQuery('db/'))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .set('Accept', 'application/json')
                    .expect(204)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }
                        request.get(localUtils.API.getApiQuery('posts/'))
                            .set('Authorization', 'Bearer ' + accesstoken)
                            .expect('Content-Type', /json/)
                            .expect('Cache-Control', testUtils.cacheRules.private)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }
                                res.body.posts.should.have.length(0);
                                eventsTriggered['post.unpublished'].length.should.eql(7);
                                eventsTriggered['post.deleted'].length.should.eql(7);
                                eventsTriggered['tag.deleted'].length.should.eql(1);
                                done();
                            });
                    });
            });
    });
});
