const should = require('should');
const supertest = require('supertest');
const config = require('../../../../../core/shared/config');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;

// NOTE: in future iterations these fields should be fetched from a central module.
//       Have put a list as is here for the lack of better place for it.
const defaultSettingsKeyTypes = [
    {key: 'title', type: 'blog'},
    {key: 'description', type: 'blog'},
    {key: 'logo', type: 'blog'},
    {key: 'cover_image', type: 'blog'},
    {key: 'icon', type: 'blog'},
    {key: 'codeinjection_head', type: 'blog'},
    {key: 'codeinjection_foot', type: 'blog'},
    {key: 'facebook', type: 'blog'},
    {key: 'twitter', type: 'blog'},
    {key: 'navigation', type: 'blog'},
    {key: 'secondary_navigation', type: 'blog'},
    {key: 'meta_title', type: 'blog'},
    {key: 'meta_description', type: 'blog'},
    {key: 'og_image', type: 'blog'},
    {key: 'og_title', type: 'blog'},
    {key: 'og_description', type: 'blog'},
    {key: 'twitter_image', type: 'blog'},
    {key: 'twitter_title', type: 'blog'},
    {key: 'twitter_description', type: 'blog'},
    {key: 'active_theme', type: 'theme'},
    {key: 'is_private', type: 'private'},
    {key: 'password', type: 'private'},
    {key: 'public_hash', type: 'private'},
    {key: 'default_content_visibility', type: 'members'},
    {key: 'members_allow_free_signup', type: 'members'},
    {key: 'members_from_address', type: 'members'},
    {key: 'stripe_product_name', type: 'members'},
    {key: 'stripe_plans', type: 'members'},
    {key: 'stripe_secret_key', type: 'members'},
    {key: 'stripe_publishable_key', type: 'members'},
    {key: 'stripe_connect_secret_key', type: 'members'},
    {key: 'stripe_connect_publishable_key', type: 'members'},
    {key: 'stripe_connect_account_id', type: 'members'},
    {key: 'stripe_connect_display_name', type: 'members'},
    {key: 'stripe_connect_livemode', type: 'members'},
    {key: 'portal_name', type: 'portal'},
    {key: 'portal_button', type: 'portal'},
    {key: 'portal_plans', type: 'portal'},
    {key: 'portal_button_style', type: 'portal'},
    {key: 'portal_button_icon', type: 'portal'},
    {key: 'portal_button_signup_text', type: 'portal'},
    {key: 'mailgun_api_key', type: 'bulk_email'},
    {key: 'mailgun_domain', type: 'bulk_email'},
    {key: 'mailgun_base_url', type: 'bulk_email'},
    {key: 'amp', type: 'blog'},
    {key: 'labs', type: 'blog'},
    {key: 'slack', type: 'blog'},
    {key: 'unsplash', type: 'blog'},
    {key: 'shared_views', type: 'blog'},
    {key: 'ghost_head', type: 'blog'},
    {key: 'ghost_foot', type: 'blog'},
    {key: 'active_timezone', type: 'blog'},
    {key: 'default_locale', type: 'blog'}
];

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

        it('Can request all settings', function () {
            return request.get(localUtils.API.getApiQuery(`settings/`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.not.exist(res.headers['x-cache-invalidate']);

                    const jsonResponse = res.body;
                    should.exist(jsonResponse.settings);
                    should.exist(jsonResponse.meta);

                    jsonResponse.settings.should.be.an.Object();
                    const settings = jsonResponse.settings;

                    should.equal(settings.length, defaultSettingsKeyTypes.length);
                    for (const defaultSetting of defaultSettingsKeyTypes) {
                        should.exist(settings.find((setting) => {
                            return setting.key === defaultSetting.key && setting.type === defaultSetting.type;
                        }));
                    }

                    localUtils.API.checkResponse(jsonResponse, 'settings');
                });
        });

        it('Can request settings by type', function () {
            return request.get(localUtils.API.getApiQuery(`settings/?type=theme`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.not.exist(res.headers['x-cache-invalidate']);

                    const jsonResponse = res.body;
                    should.exist(jsonResponse.settings);
                    should.exist(jsonResponse.meta);

                    jsonResponse.settings.should.be.an.Object();
                    const settings = jsonResponse.settings;

                    Object.keys(settings).length.should.equal(1);
                    settings[0].key.should.equal('active_theme');
                    settings[0].value.should.equal('casper');
                    settings[0].type.should.equal('theme');

                    localUtils.API.checkResponse(jsonResponse, 'settings');
                });
        });

        xit('Can not request settings by group, returns all settings instead', function () {
            return request.get(localUtils.API.getApiQuery(`settings/?group=theme`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.not.exist(res.headers['x-cache-invalidate']);

                    const jsonResponse = res.body;
                    should.exist(jsonResponse.settings);
                    should.exist(jsonResponse.meta);

                    jsonResponse.settings.should.be.an.Object();
                    const settings = jsonResponse.settings;

                    Object.keys(settings).length.should.equal(39);
                    settings.map(s => s.key).should.deepEqual(defaultSettingsKeyTypes);

                    localUtils.API.checkResponse(jsonResponse, 'settings');
                });
        });

        it('Can request settings by type and ignores group ', function () {
            return request.get(localUtils.API.getApiQuery(`settings/?group=theme&type=private`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.not.exist(res.headers['x-cache-invalidate']);

                    const jsonResponse = res.body;
                    should.exist(jsonResponse.settings);
                    should.exist(jsonResponse.meta);

                    jsonResponse.settings.should.be.an.Object();
                    const settings = jsonResponse.settings;

                    Object.keys(settings).length.should.equal(3);
                    settings[0].key.should.equal('is_private');
                    settings[0].value.should.equal(false);
                    settings[0].type.should.equal('private');

                    testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                    localUtils.API.checkResponse(jsonResponse, 'settings');
                });
        });

        it('Requesting core settings type returns no results', function () {
            return request.get(localUtils.API.getApiQuery(`settings/?type=core`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.not.exist(res.headers['x-cache-invalidate']);

                    const jsonResponse = res.body;
                    should.exist(jsonResponse.settings);
                    should.exist(jsonResponse.meta);

                    jsonResponse.settings.should.be.an.Object();
                    const settings = jsonResponse.settings;

                    Object.keys(settings).length.should.equal(0);

                    localUtils.API.checkResponse(jsonResponse, 'settings');
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

        it('Can read default_locale deprecated in v3', function (done) {
            request.get(localUtils.API.getApiQuery('settings/default_locale/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;

                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);

                    jsonResponse.settings.length.should.eql(1);

                    testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                    jsonResponse.settings[0].key.should.eql('default_locale');
                    done();
                });
        });

        it('Can read active_timezone deprecated in v3', function (done) {
            request.get(localUtils.API.getApiQuery('settings/active_timezone/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;

                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);

                    jsonResponse.settings.length.should.eql(1);

                    testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                    jsonResponse.settings[0].key.should.eql('active_timezone');
                    done();
                });
        });

        it('Can read ghost_head deprecated in v3', function (done) {
            request.get(localUtils.API.getApiQuery('settings/ghost_head/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;

                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);

                    jsonResponse.settings.length.should.eql(1);

                    testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                    jsonResponse.settings[0].key.should.eql('ghost_head');
                    done();
                });
        });

        it('Can read codeinjection_foot renamed in v3', function (done) {
            request.get(localUtils.API.getApiQuery('settings/codeinjection_foot/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;

                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);

                    jsonResponse.settings.length.should.eql(1);

                    testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                    jsonResponse.settings[0].key.should.eql('codeinjection_foot');
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
                    const jsonResponse = res.body;
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

                    const jsonResponse = res.body;
                    const changedValue = [];

                    const settingToChange = {
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

                    let jsonResponse = res.body;
                    const newValue = 'new value';
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

                    const jsonResponse = res.body;

                    const settingToChange = {
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

                    let jsonResponse = res.body;
                    const newValue = 'new value';
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

                    let jsonResponse = res.body;
                    const newValue = 'new value';
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
