const should = require('should');
const supertest = require('supertest');
const config = require('../../../../../server/config');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;

describe('Settings API (v2)', function () {
    let ghostServer;
    let request;

    describe('As Owner', function () {
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

        it('can toggle member setting', function (done) {
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
                                {
                                    key: 'labs',
                                    value: '{"subscribers":false,"members":false}'
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

                            putBody.settings[0].key.should.eql('labs');
                            putBody.settings[0].value.should.eql(JSON.stringify({subscribers: false, members: false}));

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

    describe('As Admin', function () {
        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    // create admin
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'admin+1@ghost.org'}),
                        role: testUtils.DataGenerator.Content.roles[0].name
                    });
                })
                .then(function (admin) {
                    request.user = admin;

                    // by default we login with the owner
                    return localUtils.doAuth(request);
                });
        });

        it('cannot toggle member setting', function (done) {
            const settingToChange = {
                settings: [
                    {
                        key: 'labs',
                        value: '{"subscribers":false,"members":true}'
                    }
                ]
            };

            request.put(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .send(settingToChange)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
    });

    describe('As Editor', function () {
        let editor;

        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    // create editor
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'test+1@ghost.org'}),
                        role: testUtils.DataGenerator.Content.roles[1].name
                    });
                })
                .then(function (_user1) {
                    editor = _user1;
                    request.user = editor;

                    // by default we login with the owner
                    return localUtils.doAuth(request);
                });
        });

        it('should not be able to edit settings', function (done) {
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
                    jsonResponse.settings = [{key: 'visibility', value: 'public'}];

                    request.put(localUtils.API.getApiQuery('settings/'))
                        .set('Origin', config.get('url'))
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(403)
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
    });

    describe('As Author', function () {
        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    // create author
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'test+2@ghost.org'}),
                        role: testUtils.DataGenerator.Content.roles[2].name
                    });
                })
                .then(function (author) {
                    request.user = author;

                    // by default we login with the owner
                    return localUtils.doAuth(request);
                });
        });

        it('should not be able to edit settings', function (done) {
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
                    jsonResponse.settings = [{key: 'visibility', value: 'public'}];

                    request.put(localUtils.API.getApiQuery('settings/'))
                        .set('Origin', config.get('url'))
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(403)
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
    });
});
