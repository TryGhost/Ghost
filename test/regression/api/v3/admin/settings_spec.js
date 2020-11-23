const _ = require('lodash');
const should = require('should');
const supertest = require('supertest');
const config = require('../../../../../core/shared/config');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;

// NOTE: in future iterations these fields should be fetched from a central module.
//       Have put a list as is here for the lack of better place for it.
const defaultSettingsKeys = [
    'title',
    'description',
    'logo',
    'cover_image',
    'icon',
    'lang',
    'timezone',
    'codeinjection_head',
    'codeinjection_foot',
    'facebook',
    'twitter',
    'navigation',
    'secondary_navigation',
    'meta_title',
    'meta_description',
    'og_image',
    'og_title',
    'og_description',
    'twitter_image',
    'twitter_title',
    'twitter_description',
    'active_theme',
    'is_private',
    'password',
    'public_hash',
    'default_content_visibility',
    'members_allow_free_signup',
    'members_from_address',
    'members_support_address',
    'members_reply_address',
    'members_free_signup_redirect',
    'members_paid_signup_redirect',
    'stripe_product_name',
    'stripe_plans',
    'stripe_secret_key',
    'stripe_publishable_key',
    'stripe_connect_secret_key',
    'stripe_connect_publishable_key',
    'stripe_connect_account_id',
    'stripe_connect_display_name',
    'stripe_connect_livemode',
    'portal_name',
    'portal_button',
    'portal_plans',
    'portal_button_style',
    'portal_button_icon',
    'portal_button_signup_text',
    'mailgun_api_key',
    'mailgun_domain',
    'mailgun_base_url',
    'email_track_opens',
    'amp',
    'amp_gtag_id',
    'labs',
    'slack',
    'unsplash',
    'shared_views',
    'active_timezone',
    'default_locale',
    'accent_color',
    'newsletter_show_badge',
    'newsletter_show_header',
    'newsletter_body_font_category',
    'newsletter_footer_content'
];

describe('Settings API (v3)', function () {
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

                    settings.map(s => s.key).sort().should.deepEqual(defaultSettingsKeys.sort());

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

        it('Can read deprecated default_locale', function (done) {
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

                    testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'group', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                    jsonResponse.settings[0].key.should.eql('default_locale');
                    done();
                });
        });

        it('can edit deprecated default_locale setting', function () {
            return request.get(localUtils.API.getApiQuery('settings/default_locale/'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .then(function (res) {
                    let jsonResponse = res.body;
                    const newValue = 'new value';
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);
                    jsonResponse.settings = [{key: 'default_locale', value: 'ua'}];

                    return jsonResponse;
                })
                .then((editedSetting) => {
                    return request.put(localUtils.API.getApiQuery('settings/'))
                        .set('Origin', config.get('url'))
                        .send(editedSetting)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .then(function (res) {
                            should.exist(res.headers['x-cache-invalidate']);
                            const jsonResponse = res.body;

                            should.exist(jsonResponse);
                            should.exist(jsonResponse.settings);

                            jsonResponse.settings.length.should.eql(1);

                            testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'group', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                            jsonResponse.settings[0].key.should.eql('default_locale');
                            jsonResponse.settings[0].value.should.eql('ua');
                        });
                });
        });

        it('Can read timezone', function (done) {
            request.get(localUtils.API.getApiQuery('settings/timezone/'))
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

                    testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'group', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                    jsonResponse.settings[0].key.should.eql('timezone');
                    done();
                });
        });

        it('Can read active_timezone', function (done) {
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

                    testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'group', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                    jsonResponse.settings[0].key.should.eql('active_timezone');
                    done();
                });
        });

        it('Can read deprecated active_timezone', function (done) {
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

                    testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'group', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                    jsonResponse.settings[0].key.should.eql('active_timezone');
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

        it('can toggle member setting', function () {
            return request.get(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .then(function (res) {
                    const jsonResponse = res.body;

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

                    return request.put(localUtils.API.getApiQuery('settings/'))
                        .set('Origin', config.get('url'))
                        .send(settingToChange)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .then(function ({body, headers}) {
                            const putBody = body;
                            headers['x-cache-invalidate'].should.eql('/*');
                            should.exist(putBody);

                            putBody.settings[0].key.should.eql('labs');
                            putBody.settings[0].value.should.eql(JSON.stringify({subscribers: false, members: false}));
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

        it('can\'t edit non existent setting', function () {
            return request.get(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .then(function (res) {
                    let jsonResponse = res.body;
                    const newValue = 'new value';
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);
                    jsonResponse.settings = [{key: 'testvalue', value: newValue}];

                    return request.put(localUtils.API.getApiQuery('settings/'))
                        .set('Origin', config.get('url'))
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(404)
                        .then(function ({body, headers}) {
                            jsonResponse = body;
                            should.not.exist(headers['x-cache-invalidate']);
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
                        });
                });
        });

        it('Will transform "1"', function () {
            return request.get(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .then(function (res) {
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

                    return request.put(localUtils.API.getApiQuery('settings/'))
                        .set('Origin', config.get('url'))
                        .send(settingToChange)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .then(function ({body, headers}) {
                            const putBody = body;
                            headers['x-cache-invalidate'].should.eql('/*');
                            should.exist(putBody);

                            putBody.settings[0].key.should.eql('is_private');
                            putBody.settings[0].value.should.eql(true);

                            localUtils.API.checkResponse(putBody, 'settings');
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

        it('should not be able to edit settings', function () {
            return request.get(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .then(function (res) {
                    let jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);
                    jsonResponse.settings = [{key: 'visibility', value: 'public'}];

                    return request.put(localUtils.API.getApiQuery('settings/'))
                        .set('Origin', config.get('url'))
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(403)
                        .then(function ({body, headers}) {
                            jsonResponse = body;
                            should.not.exist(headers['x-cache-invalidate']);
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

        it('should not be able to edit settings', function () {
            return request.get(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .then(function (res) {
                    let jsonResponse = res.body;
                    const newValue = 'new value';
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);
                    jsonResponse.settings = [{key: 'visibility', value: 'public'}];

                    return request.put(localUtils.API.getApiQuery('settings/'))
                        .set('Origin', config.get('url'))
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(403)
                        .then(function ({body, headers}) {
                            jsonResponse = body;
                            should.not.exist(headers['x-cache-invalidate']);
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
                        });
                });
        });
    });
});
