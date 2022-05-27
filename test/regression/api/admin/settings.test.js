const _ = require('lodash');
const should = require('should');
const supertest = require('supertest');
const config = require('../../../../core/shared/config');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const db = require('../../../../core/server/data/db');
const settingsCache = require('../../../../core/shared/settings-cache');

describe('Settings API (canary)', function () {
    let request;

    async function checkCanEdit(key, value, expectedValue) {
        if (!expectedValue) {
            expectedValue = value;
        }

        const settingToChange = {
            settings: [{key, value}]
        };

        await request.put(localUtils.API.getApiQuery('settings/'))
            .set('Origin', config.get('url'))
            .send(settingToChange)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .expect((response) => {
                should.exist(response.headers['x-cache-invalidate']);
                response.headers['x-cache-invalidate'].should.eql('/*');
            });

        // Check if not changed (also check internal ones)
        const afterValue = settingsCache.get(key);
        should.deepEqual(afterValue, expectedValue);
    }

    async function checkCantEdit(key, value) {
        // Get current value (internal)
        const currentValue = settingsCache.get(key);

        const settingToChange = {
            settings: [{key, value}]
        };

        if (currentValue === value) {
            throw new Error('This test requires a different value than the current one');
        }

        await request.put(localUtils.API.getApiQuery('settings/'))
            .set('Origin', config.get('url'))
            .send(settingToChange)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .expect((response) => {
                should.not.exist(response.headers['x-cache-invalidate']);
            });

        // Check if not changed (also check internal ones)
        const afterValue = settingsCache.get(key);
        should.deepEqual(afterValue, currentValue);
    }

    describe('As Owner', function () {
        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));
            await localUtils.doAuth(request);
        });

        it('Can edit newly introduced locale setting', async function () {
            await checkCanEdit('locale', 'ge');
        });

        it('Can\'t edit permalinks', async function () {
            await checkCantEdit('permalinks', '/:primary_author/:slug/');
        });

        it('Can edit only allowed labs keys', async function () {
            await checkCanEdit('labs', 
                JSON.stringify({
                    activitypub: true,
                    gibberish: true
                }),
                {
                    activitypub: true
                }
            );
        });

        it('Can\'t edit non existent setting', async function () {
            await checkCantEdit('non-existent-setting', 'value');
        });

        it('Will transform "1"', function () {
            return checkCanEdit('is_private', '1', true);
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

            let setting = putBody.settings.find(s => s.key === 'unsplash');
            should.equal(setting.value, true);

            setting = putBody.settings.find(s => s.key === 'title');
            should.equal(setting.value, 'New Value');

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

            localUtils.API.checkResponse(putBody, 'settings');
            const setting = putBody.settings.find(s => s.key === 'slack_username');
            setting.value.should.eql('can edit me');
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
            responseSettings.should.have.property('icon', `${config.get('url')}/content/images/size/w256h256/icon.png`);
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
            await checkCantEdit('notifications', JSON.stringify(['do not touch me']));
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

    // @TODO swap this internally for using settingsbread and then remove
    describe('edit via context internal', function () {
        const api = require('../../../../core/server/api').endpoints;

        before(async function () {
            await localUtils.startGhost();
        });

        it('allows editing settings that cannot be edited via HTTP', async function () {
            // Get current value
            const {settings} = await api.settings.browse({}, testUtils.context.internal);

            const currentValue = settings.find(s => s.key === 'email_verification_required');

            if (!currentValue || currentValue.value === true) {
                throw new Error('Invalid key or unchanged value');
            }
        
            let jsonResponse = await api.settings.edit({
                settings: [{key: 'email_verification_required', value: true}]
            }, testUtils.context.internal);

            const setting = jsonResponse.settings.find(s => s.key === 'email_verification_required');
            should.exist(setting);
            setting.value.should.eql(true);
        });
    });
});
