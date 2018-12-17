const should = require('should');
const _ = require('lodash');
const supertest = require('supertest');
const os = require('os');
const fs = require('fs-extra');
const config = require('../../../../../../core/server/config');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;
let request;

describe('Settings API V2', function () {
    let ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            });
    });

    after(function () {
        return ghostServer.stop();
    });

    it('browse', function (done) {
        request.get(localUtils.API.getApiQuery('settings/'))
            .set('Origin', config.get('url'))
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
            .set('Origin', config.get('url'))
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

    it('read core setting', function () {
        return request
            .get(localUtils.API.getApiQuery('settings/db_hash/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403);
    });

    it('can\'t read permalinks', function (done) {
        request.get(localUtils.API.getApiQuery('settings/permalinks/'))
            .set('Origin', config.get('url'))
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
            .set('Origin', config.get('url'))
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
            .set('Origin', config.get('url'))
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
                    .set('Origin', config.get('url'))
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
            .set('Origin', config.get('url'))
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

    it('can\'t edit non existent setting', function (done) {
        request.get(localUtils.API.getApiQuery('settings/'))
            .set('Origin', config.get('url'))
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
                    .set('Origin', config.get('url'))
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

    it('can download routes.yaml', ()=> {
        return request.get(localUtils.API.getApiQuery('settings/routes/yaml/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/yaml')
            .expect(200)
            .then((res)=> {
                res.headers['content-disposition'].should.eql('Attachment; filename="routes.yaml"');
                res.headers['content-type'].should.eql('application/yaml; charset=utf-8');
                res.headers['content-length'].should.eql('138');
            });
    });

    it('can upload routes.yaml', ()=> {
        const newRoutesYamlPath = `${os.tmpdir()}/routes.yaml`;

        return fs.writeFile(newRoutesYamlPath, 'routes:\ncollections:\ntaxonomies:\n')
            .then(()=> {
                return request
                    .post(localUtils.API.getApiQuery('settings/routes/yaml/'))
                    .set('Origin', config.get('url'))
                    .attach('routes', newRoutesYamlPath)
                    .expect('Content-Type', /application\/json/)
                    .expect(200);
            })
            .then((res)=> {
                res.headers['x-cache-invalidate'].should.eql('/*');
            })
            .finally(()=> {
                return ghostServer.stop();
            });
    });
});
