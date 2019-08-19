var should = require('should'),
    _ = require('lodash'),
    supertest = require('supertest'),
    os = require('os'),
    fs = require('fs-extra'),
    testUtils = require('../../../utils/index'),
    localUtils = require('./utils'),
    config = require('../../../../server/config/index'),
    ghost = testUtils.startGhost,
    request;

describe('Settings API', function () {
    var accesstoken = '', ghostServer;

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
            });
    });

    after(function () {
        return ghostServer.stop();
    });

    it('browse', function (done) {
        request.get(localUtils.API.getApiQuery('settings/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);

                localUtils.API.checkResponse(jsonResponse, 'settings');

                JSON.parse(_.find(jsonResponse.settings, {key: 'unsplash'}).value).isActive.should.eql(true);
                JSON.parse(_.find(jsonResponse.settings, {key: 'amp'}).value).should.eql(true);
                should.not.exist(_.find(jsonResponse.settings, {key: 'permalinks'}));

                testUtils.API.isISO8601(jsonResponse.settings[0].created_at).should.be.true();
                jsonResponse.settings[0].created_at.should.be.an.instanceof(String);

                should.not.exist(_.find(jsonResponse.settings, function (setting) {
                    return setting.type === 'core';
                }));

                done();
            });
    });

    it('read', function (done) {
        request.get(localUtils.API.getApiQuery('settings/title/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.settings);

                testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'key', 'value', 'type', 'created_at', 'created_by', 'updated_at', 'updated_by']);
                jsonResponse.settings[0].key.should.eql('title');
                testUtils.API.isISO8601(jsonResponse.settings[0].created_at).should.be.true();
                done();
            });
    });

    it('can\'t read permalinks', function (done) {
        request.get(localUtils.API.getApiQuery('settings/permalinks/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                done();
            });
    });

    it('can\'t read non existent setting', function (done) {
        request.get(localUtils.API.getApiQuery('settings/testsetting/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                done();
            });
    });

    it('can edit settings', function (done) {
        request.get(localUtils.API.getApiQuery('settings/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body,
                    changedValue = [],
                    settingToChange = {
                        settings: [
                            {key: 'title', value: changedValue}
                        ]
                    };

                should.exist(jsonResponse);
                should.exist(jsonResponse.settings);

                request.put(localUtils.API.getApiQuery('settings/'))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .send(settingToChange)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var putBody = res.body;
                        res.headers['x-cache-invalidate'].should.eql('/*');
                        should.exist(putBody);
                        putBody.settings[0].value.should.eql(JSON.stringify(changedValue));
                        localUtils.API.checkResponse(putBody, 'settings');
                        done();
                    });
            });
    });

    it('can\'t edit permalinks', function (done) {
        const settingToChange = {
            settings: [{key: 'permalinks', value: '/:primary_author/:slug/'}]
        };

        request.put(localUtils.API.getApiQuery('settings/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .send(settingToChange)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                done();
            });
    });

    it('can\'t edit settings with invalid accesstoken', function (done) {
        request.get(localUtils.API.getApiQuery('settings/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body,
                    changedValue = 'Ghost changed';
                should.exist(jsonResponse);
                jsonResponse.title = changedValue;

                request.put(localUtils.API.getApiQuery('settings/'))
                    .set('Authorization', 'Bearer ' + 'invalidtoken')
                    .send(jsonResponse)
                    .expect(401)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
    });

    it('can\'t edit non existent setting', function (done) {
        request.get(localUtils.API.getApiQuery('settings/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body,
                    newValue = 'new value';
                should.exist(jsonResponse);
                should.exist(jsonResponse.settings);
                jsonResponse.settings = [{key: 'testvalue', value: newValue}];

                request.put(localUtils.API.getApiQuery('settings/'))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .send(jsonResponse)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        jsonResponse = res.body;
                        should.not.exist(res.headers['x-cache-invalidate']);
                        should.exist(jsonResponse.errors);
                        testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                        done();
                    });
            });
    });

    it('can download routes.yaml', function () {
        return request.get(localUtils.API.getApiQuery('settings/routes/yaml/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .set('Accept', 'application/yaml')
            .expect(200)
            .then((res) => {
                res.headers['content-disposition'].should.eql('Attachment; filename="routes.yaml"');
                res.headers['content-type'].should.eql('application/yaml; charset=utf-8');
                res.headers['content-length'].should.eql('138');
            });
    });

    it('can upload routes.yaml', function () {
        const newRoutesYamlPath = `${os.tmpdir()}/routes.yaml`;

        return fs.writeFile(newRoutesYamlPath, 'routes:\ncollections:\ntaxonomies:\n')
            .then(() => {
                return request
                    .post(localUtils.API.getApiQuery('settings/routes/yaml/'))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .set('Origin', testUtils.API.getURL())
                    .attach('routes', newRoutesYamlPath)
                    .expect('Content-Type', /application\/json/)
                    .expect(200);
            })
            .then((res) => {
                res.headers['x-cache-invalidate'].should.eql('/*');
            })
            .finally(() => {
                return ghostServer.stop();
            });
    });
});
