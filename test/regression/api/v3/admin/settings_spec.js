const should = require('should');
const supertest = require('supertest');
const config = require('../../../../../core/server/config');
const testUtils = require('../../../../utils');
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

    it('Can\'t read core setting', function () {
        return request
            .get(localUtils.API.getApiQuery('settings/db_hash/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403);
    });

    it('Can\'t read permalinks', function (done) {
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
                testUtils.API.checkResponseValue(jsonResponse.errors[0], [
                    'message',
                    'context',
                    'type',
                    'details',
                    'property',
                    'help',
                    'code',
                    'id'
                ]);
                done();
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
                        testUtils.API.checkResponseValue(jsonResponse.errors[0], [
                            'message',
                            'context',
                            'type',
                            'details',
                            'property',
                            'help',
                            'code',
                            'id'
                        ]);
                        done();
                    });
            });
    });

    it('Will transform "1"', function (done) {
        request.get(localUtils.API.getApiQuery('settings/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                const jsonResponse = res.body,
                    settingToChange = {
                        settings: [
                            {
                                key: 'is_private',
                                value: '1'
                            }
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

                        const putBody = res.body;
                        res.headers['x-cache-invalidate'].should.eql('/*');
                        should.exist(putBody);

                        putBody.settings[0].key.should.eql('is_private');
                        putBody.settings[0].value.should.eql(true);

                        localUtils.API.checkResponse(putBody, 'settings');
                        done();
                    });
            });
    });
});
