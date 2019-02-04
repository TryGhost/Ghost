const should = require('should');
const _ = require('lodash');
const supertest = require('supertest');
const os = require('os');
const fs = require('fs-extra');
const config = require('../../../../server/config');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;
let request;

describe('Settings API', function () {
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

    it('Can request all settings', function (done) {
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

    it('Can read a setting', function (done) {
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

                testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'key', 'value', 'type', 'created_at', 'updated_at']);
                jsonResponse.settings[0].key.should.eql('title');
                testUtils.API.isISO8601(jsonResponse.settings[0].created_at).should.be.true();
                done();
            });
    });

    it('Can edit a setting', function (done) {
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

    it('Can download routes.yaml', ()=> {
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

    it('Can upload routes.yaml', ()=> {
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
