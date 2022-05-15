const _ = require('lodash');
const should = require('should');
const supertest = require('supertest');
const config = require('../../../../core/shared/config');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const db = require('../../../../core/server/data/db');

describe('Settings API (canary)', function () {
    let request;

    describe('As Owner', function () {
        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));
            await localUtils.doAuth(request);
        });

        it('Can edit newly introduced locale setting', function () {
            return request.put(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .send({
                    settings: [{key: 'locale', value: 'ge'}]
                })
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

            const responseObj = JSON.parse(jsonResponse.settings[0].value);

            should.not.exist(responseObj.gibberish);
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
                                'id',
                                'ghostErrorCode'
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

            putBody.settings.length.should.equal(2);

            putBody.settings[0].key.should.eql('unsplash');
            should.equal(putBody.settings[0].value, true);

            putBody.settings[1].key.should.eql('title');
            should.equal(putBody.settings[1].value, 'New Value');

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

        it('Can only send array values for keys defined with array type', async function () {
            const settingsToChange = {
                settings: [
                    {key: 'navigation', value: 'not an array'}
                ]
            };

            await request.put(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .send(settingsToChange)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422);
        });

        it('Cannot edit notifications key through API', async function () {
            const settingsToChange = {
                settings: [
                    {key: 'notifications', value: JSON.stringify(['do not touch me'])}
                ]
            };

            await request.put(localUtils.API.getApiQuery('settings/'))
                .set('Origin', config.get('url'))
                .send(settingsToChange)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);
        });
    });

    describe('As Admin', function () {
        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));

            // create admin
            const admin = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({email: 'admin+1@ghost.org'}),
                role: testUtils.DataGenerator.Content.roles[0].name
            });
            request.user = admin;
            // by default we login with the owner
            await localUtils.doAuth(request);
        });
    });

    describe('As Editor', function () {
        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));
            // create editor
            request.user = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({email: 'test+1@ghost.org'}),
                role: testUtils.DataGenerator.Content.roles[1].name
            });

            // by default we login with the owner
            await localUtils.doAuth(request);
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
                                'id',
                                'ghostErrorCode'
                            ]);
                        });
                });
        });
    });

    describe('As Author', function () {
        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));

            // create author
            request.user = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({email: 'test+2@ghost.org'}),
                role: testUtils.DataGenerator.Content.roles[2].name
            });

            // by default we login with the owner
            await localUtils.doAuth(request);
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
                                'id',
                                'ghostErrorCode'
                            ]);
                        });
                });
        });
    });
});
