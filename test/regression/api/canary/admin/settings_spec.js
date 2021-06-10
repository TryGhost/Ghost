const _ = require('lodash');
const should = require('should');
const supertest = require('supertest');
const config = require('../../../../../core/shared/config');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const db = require('../../../../../core/server/data/db');
const ghost = testUtils.startGhost;

// NOTE: in future iterations these fields should be fetched from a central module.
//       Have put a list as is here for the lack of better place for it.
const defaultSettingsKeyTypes = [
    {
        key: 'title',
        type: 'string',
        group: 'site'
    },
    {
        key: 'description',
        type: 'string',
        group: 'site'
    },
    {
        key: 'logo',
        type: 'string',
        group: 'site'
    },
    {
        key: 'cover_image',
        type: 'string',
        group: 'site'
    },
    {
        key: 'icon',
        type: 'string',
        group: 'site'
    },
    {
        key: 'lang',
        type: 'string',
        group: 'site'
    },
    {
        key: 'locale',
        type: 'string',
        group: 'site'
    },
    {
        key: 'timezone',
        type: 'string',
        group: 'site'
    },
    {
        key: 'codeinjection_head',
        type: 'string',
        group: 'site'
    },
    {
        key: 'codeinjection_foot',
        type: 'string',
        group: 'site'
    },
    {
        key: 'facebook',
        type: 'string',
        group: 'site'
    },
    {
        key: 'twitter',
        type: 'string',
        group: 'site'
    },
    {
        key: 'navigation',
        type: 'array',
        group: 'site'
    },
    {
        key: 'secondary_navigation',
        type: 'array',
        group: 'site'
    },
    {
        key: 'meta_title',
        type: 'string',
        group: 'site'
    },
    {
        key: 'meta_description',
        type: 'string',
        group: 'site'
    },
    {
        key: 'og_image',
        type: 'string',
        group: 'site'
    },
    {
        key: 'og_title',
        type: 'string',
        group: 'site'
    },
    {
        key: 'og_description',
        type: 'string',
        group: 'site'
    },
    {
        key: 'twitter_image',
        type: 'string',
        group: 'site'
    },
    {
        key: 'twitter_title',
        type: 'string',
        group: 'site'
    },
    {
        key: 'twitter_description',
        type: 'string',
        group: 'site'
    },
    {
        key: 'active_theme',
        type: 'string',
        group: 'theme'
    },
    {
        key: 'is_private',
        type: 'boolean',
        group: 'private'
    },
    {
        key: 'password',
        type: 'string',
        group: 'private'
    },
    {
        key: 'public_hash',
        type: 'string',
        group: 'private'
    },
    {
        key: 'default_content_visibility',
        type: 'string',
        group: 'members'
    },
    {
        key: 'members_signup_access',
        type: 'string',
        group: 'members'
    },
    {
        key: 'members_from_address',
        type: 'string',
        group: 'members'
    },
    {
        key: 'members_support_address',
        type: 'string',
        group: 'members'
    },
    {
        key: 'members_reply_address',
        type: 'string',
        group: 'members'
    },
    {
        key: 'members_paid_signup_redirect',
        type: 'string',
        group: 'members'
    },
    {
        key: 'members_free_signup_redirect',
        type: 'string',
        group: 'members'
    },
    {
        key: 'members_free_price_name',
        type: 'string',
        group: 'members'
    },
    {
        key: 'members_free_price_description',
        type: 'string',
        group: 'members'
    },
    {
        key: 'members_monthly_price_id',
        type: 'string',
        group: 'members'
    },
    {
        key: 'members_yearly_price_id',
        type: 'string',
        group: 'members'
    },
    {
        key: 'stripe_product_name',
        type: 'string',
        group: 'members'
    },
    {
        key: 'stripe_plans',
        type: 'array',
        group: 'members'
    },
    {
        key: 'stripe_secret_key',
        type: 'string',
        group: 'members'
    },
    {
        key: 'stripe_publishable_key',
        type: 'string',
        group: 'members'
    },
    {
        key: 'stripe_connect_secret_key',
        type: 'string',
        group: 'members'
    },
    {
        key: 'stripe_connect_publishable_key',
        type: 'string',
        group: 'members'
    },
    {
        key: 'stripe_connect_account_id',
        type: 'string',
        group: 'members'
    },
    {
        key: 'stripe_connect_display_name',
        type: 'string',
        group: 'members'
    },
    {
        key: 'stripe_connect_livemode',
        type: 'boolean',
        group: 'members'
    },
    {
        key: 'portal_name',
        type: 'boolean',
        group: 'portal'
    },
    {
        key: 'portal_button',
        type: 'boolean',
        group: 'portal'
    },
    {
        key: 'portal_plans',
        type: 'array',
        group: 'portal'
    },
    {
        key: 'portal_button_style',
        type: 'string',
        group: 'portal'
    },
    {
        key: 'portal_button_icon',
        type: 'string',
        group: 'portal'
    },
    {
        key: 'portal_button_signup_text',
        type: 'string',
        group: 'portal'
    },
    {
        key: 'mailgun_api_key',
        type: 'string',
        group: 'email'
    },
    {
        key: 'mailgun_domain',
        type: 'string',
        group: 'email'
    },
    {
        key: 'mailgun_base_url',
        type: 'string',
        group: 'email'
    },
    {
        key: 'email_track_opens',
        type: 'boolean',
        group: 'email'
    },
    {
        key: 'amp',
        type: 'boolean',
        group: 'amp'
    },
    {
        key: 'amp_gtag_id',
        type: 'string',
        group: 'amp'
    },
    {
        key: 'slack',
        type: 'string',
        group: 'slack'
    },
    {
        key: 'slack_url',
        type: 'string',
        group: 'slack'
    },
    {
        key: 'slack_username',
        type: 'string',
        group: 'slack'
    },
    {
        key: 'unsplash',
        type: 'boolean',
        group: 'unsplash'
    },
    {
        key: 'shared_views',
        type: 'array',
        group: 'views'
    },
    {
        key: 'active_timezone',
        type: 'string',
        group: 'site'
    },
    {
        key: 'default_locale',
        type: 'string',
        group: 'site'
    },
    {
        key: 'accent_color',
        type: 'string',
        group: 'site'
    },
    {
        key: 'newsletter_show_badge',
        type: 'boolean',
        group: 'newsletter'
    },
    {
        key: 'newsletter_show_header',
        type: 'boolean',
        group: 'newsletter'
    },
    {
        key: 'newsletter_header_image',
        type: 'string',
        group: 'newsletter'
    },
    {
        key: 'newsletter_show_header_icon',
        type: 'boolean',
        group: 'newsletter'
    },
    {
        key: 'newsletter_show_header_title',
        type: 'boolean',
        group: 'newsletter'
    },
    {
        key: 'newsletter_title_alignment',
        type: 'string',
        group: 'newsletter'
    },
    {
        key: 'newsletter_title_font_category',
        type: 'string',
        group: 'newsletter'
    },
    {
        key: 'newsletter_show_feature_image',
        type: 'boolean',
        group: 'newsletter'
    },
    {
        key: 'newsletter_body_font_category',
        type: 'string',
        group: 'newsletter'
    },
    {
        key: 'newsletter_footer_content',
        type: 'string',
        group: 'newsletter'
    },
    {
        key: 'firstpromoter',
        type: 'boolean',
        group: 'firstpromoter'
    },
    {
        key: 'firstpromoter_id',
        type: 'string',
        group: 'firstpromoter'
    },
    {
        key: 'oauth_client_id',
        type: 'string',
        group: 'oauth'
    },
    {
        key: 'oauth_client_secret',
        type: 'string',
        group: 'oauth'
    },
    {
        key: 'editor_default_email_recipients',
        type: 'string',
        group: 'editor'
    },
    {
        key: 'editor_default_email_recipients_filter',
        type: 'string',
        group: 'editor'
    },
    {
        key: 'labs',
        type: 'object',
        group: 'labs'
    }
];

describe('Settings API (canary)', function () {
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
                            return (setting.key === defaultSetting.key)
                                && (setting.type === defaultSetting.type)
                                && (setting.group === defaultSetting.group);
                        }), `Expected to find a setting with key ${defaultSetting.key}, type ${defaultSetting.type}, and group ${defaultSetting.group}`);
                    }

                    const unsplash = settings.find(s => s.key === 'unsplash');
                    should.exist(unsplash);
                    unsplash.value.should.equal(true);

                    localUtils.API.checkResponse(jsonResponse, 'settings');
                });
        });

        it('Ignores the deprecated type filter', function () {
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
                    // Returns all settings
                    should.equal(settings.length, defaultSettingsKeyTypes.length);
                    for (const defaultSetting of defaultSettingsKeyTypes) {
                        should.exist(settings.find((setting) => {
                            return setting.key === defaultSetting.key && setting.type === defaultSetting.type;
                        }), `Expected to find a setting with key ${defaultSetting.key} and type ${defaultSetting.type}`);
                    }

                    localUtils.API.checkResponse(jsonResponse, 'settings');
                });
        });

        it('Can request settings by group', function () {
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

                    Object.keys(settings).length.should.equal(1);
                    settings[0].key.should.equal('active_theme');
                    settings[0].value.should.equal('casper');
                    settings[0].type.should.equal('string');
                    settings[0].group.should.equal('theme');

                    localUtils.API.checkResponse(jsonResponse, 'settings');
                });
        });

        it('Requesting core settings type ignores the parameter and returns all settings', function () {
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

                    Object.keys(settings).length.should.equal(defaultSettingsKeyTypes.length);

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

        it('Can\'t read secret setting', function (done) {
            const key = 'stripe_secret_key';
            request
                .get(localUtils.API.getApiQuery(`settings/${key}/`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    const json = res.body;
                    should.exist(json);
                    should.exist(json.settings);

                    json.settings.length.should.eql(1);
                    json.settings[0].key.should.eql('stripe_secret_key');
                    should(json.settings[0].value).be.null();

                    done();
                });
        });

        it('Can\'t read secret setting', function (done) {
            const key = 'stripe_secret_key';
            request.put(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .send({
                    settings: [{
                        key,
                        value: 'sk_test_4eC39HqLyjWDarjtT1zdp7dc'
                    }]
                })
                .then(() => {
                    request
                        .get(localUtils.API.getApiQuery(`settings/${key}/`))
                        .set('Origin', config.get('url'))
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            const json = res.body;
                            should.exist(json);
                            should.exist(json.settings);

                            json.settings.length.should.eql(1);
                            json.settings[0].key.should.eql('stripe_secret_key');
                            json.settings[0].value.should.eql('••••••••');

                            done();
                        });
                });
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

        it('Can read slack_url introduced in v4', function (done) {
            request.get(localUtils.API.getApiQuery('settings/slack_url/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;

                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);

                    jsonResponse.settings.length.should.eql(1);
                    jsonResponse.settings[0].key.should.eql('slack_url');
                    done();
                });
        });

        it('Can read labs', async function () {
            const res = await request.get(localUtils.API.getApiQuery('settings/labs/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            should.not.exist(res.headers['x-cache-invalidate']);
            const jsonResponse = res.body;

            should.exist(jsonResponse);
            should.exist(jsonResponse.settings);

            jsonResponse.settings.length.should.eql(1);
            testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'group', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);

            const jsonObjectRegex = /^\{.*\}$/; // '{...}'
            jsonResponse.settings[0].key.should.eql('labs');
            jsonResponse.settings[0].value.should.match(jsonObjectRegex);
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

        it('Can edit deprecated default_locale setting', function () {
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

        it('Can edit deprecated lang setting', function () {
            return request.get(localUtils.API.getApiQuery('settings/lang/'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .then(function (res) {
                    let jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);
                    jsonResponse.settings = [{key: 'lang', value: 'ua'}];

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
                            jsonResponse.settings[0].key.should.eql('lang');
                            jsonResponse.settings[0].value.should.eql('ua');
                        });
                });
        });

        it('Can edit newly introduced locale setting', function () {
            return request.get(localUtils.API.getApiQuery('settings/locale/'))
                .set('Origin', config.get('url'))
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .then(function (res) {
                    let jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);
                    jsonResponse.settings = [{key: 'locale', value: 'ge'}];

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
                            jsonResponse.settings[0].key.should.eql('locale');
                            jsonResponse.settings[0].value.should.eql('ge');
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

        it('Can read slack renamed&reformatted in v4', function (done) {
            request.get(localUtils.API.getApiQuery('settings/slack/'))
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
                    jsonResponse.settings[0].key.should.eql('slack');
                    done();
                });
        });

        it('Format of unsplash is boolean as introduced with v4', function (done) {
            request.get(localUtils.API.getApiQuery('settings/unsplash/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    const jsonResponse = res.body;

                    should.exist(jsonResponse);
                    should.exist(jsonResponse.settings);

                    jsonResponse.settings.length.should.eql(1);

                    testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'group', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
                    jsonResponse.settings[0].key.should.eql('unsplash');
                    JSON.parse(jsonResponse.settings[0].value).should.eql(true);

                    done();
                });
        });

        it('Can\'t read non existent setting', function (done) {
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

        it('Can\'t edit permalinks', function (done) {
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

        it('Can edit only allowed labs keys', async function () {
            const settingToChange = {
                settings: [{
                    key: 'labs',
                    value: JSON.stringify({
                        activitypub: true,
                        gibberish: true
                    })
                }]
            };

            const res = await request.put(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .send(settingToChange)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            const jsonResponse = res.body;

            should.exist(jsonResponse);
            should.exist(jsonResponse.settings);

            jsonResponse.settings.length.should.eql(1);
            testUtils.API.checkResponseValue(jsonResponse.settings[0], ['id', 'group', 'key', 'value', 'type', 'flags', 'created_at', 'updated_at']);
            jsonResponse.settings[0].key.should.eql('labs');

            jsonResponse.settings[0].value.should.eql(JSON.stringify({
                activitypub: true
            }));
        });

        it('Can\'t edit non existent setting', function () {
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

        it('Can edit multiple setting along with a deprecated one from v4', async function () {
            const settingToChange = {
                settings: [
                    {
                        key: 'slack',
                        value: JSON.stringify([{
                            url: 'https://newurl.tld/slack',
                            username: 'New Slack Username'
                        }])
                    }, {
                        key: 'unsplash',
                        value: true
                    }, {
                        key: 'title',
                        value: 'New Value'
                    }
                ]
            };

            const {body, headers} = await request.put(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .send(settingToChange)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            const putBody = body;
            headers['x-cache-invalidate'].should.eql('/*');
            should.exist(putBody);

            putBody.settings.length.should.equal(3);

            putBody.settings[0].key.should.eql('unsplash');
            should.equal(putBody.settings[0].value, true);

            putBody.settings[1].key.should.eql('title');
            should.equal(putBody.settings[1].value, 'New Value');

            putBody.settings[2].key.should.eql('slack');
            should.equal(putBody.settings[2].value, JSON.stringify([{
                url: 'https://newurl.tld/slack',
                username: 'New Slack Username'
            }]));

            localUtils.API.checkResponse(putBody, 'settings');
        });

        it('Can edit a setting introduced in v4', async function () {
            const settingToChange = {
                settings: [
                    {
                        key: 'slack_username',
                        value: 'can edit me'
                    }
                ]
            };

            const {body, headers} = await request.put(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .send(settingToChange)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            const putBody = body;
            headers['x-cache-invalidate'].should.eql('/*');
            should.exist(putBody);

            putBody.settings.length.should.equal(1);

            localUtils.API.checkResponse(putBody, 'settings');
            putBody.settings[0].key.should.eql('slack_username');
            putBody.settings[0].value.should.eql('can edit me');
        });

        it('Can edit URLs without internal storage format leaking', async function () {
            const settingsToChange = {
                settings: [
                    {key: 'cover_image', value: `${config.get('url')}/content/images/cover_image.png`},
                    {key: 'logo', value: `${config.get('url')}/content/images/logo.png`},
                    {key: 'icon', value: `${config.get('url')}/content/images/icon.png`},
                    {key: 'portal_button_icon', value: `${config.get('url')}/content/images/portal_button_icon.png`},
                    {key: 'og_image', value: `${config.get('url')}/content/images/og_image.png`},
                    {key: 'twitter_image', value: `${config.get('url')}/content/images/twitter_image.png`}
                ]
            };

            const {body} = await request.put(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .send(settingsToChange)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            const responseSettings = body.settings.reduce((acc, setting) => {
                acc[setting.key] = setting.value;
                return acc;
            }, {});

            responseSettings.should.have.property('cover_image', `${config.get('url')}/content/images/cover_image.png`);
            responseSettings.should.have.property('logo', `${config.get('url')}/content/images/logo.png`);
            responseSettings.should.have.property('icon', `${config.get('url')}/content/images/icon.png`);
            responseSettings.should.have.property('portal_button_icon', `${config.get('url')}/content/images/portal_button_icon.png`);
            responseSettings.should.have.property('og_image', `${config.get('url')}/content/images/og_image.png`);
            responseSettings.should.have.property('twitter_image', `${config.get('url')}/content/images/twitter_image.png`);

            const dbSettingsRows = await db.knex('settings')
                .select('key', 'value')
                .whereIn('key', ['cover_image', 'logo', 'icon', 'portal_button_icon', 'og_image', 'twitter_image']);

            const dbSettings = dbSettingsRows.reduce((acc, setting) => {
                acc[setting.key] = setting.value;
                return acc;
            }, {});

            dbSettings.should.have.property('cover_image', '__GHOST_URL__/content/images/cover_image.png');
            dbSettings.should.have.property('logo', '__GHOST_URL__/content/images/logo.png');
            dbSettings.should.have.property('icon', '__GHOST_URL__/content/images/icon.png');
            dbSettings.should.have.property('portal_button_icon', '__GHOST_URL__/content/images/portal_button_icon.png');
            dbSettings.should.have.property('og_image', '__GHOST_URL__/content/images/og_image.png');
            dbSettings.should.have.property('twitter_image', '__GHOST_URL__/content/images/twitter_image.png');
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
