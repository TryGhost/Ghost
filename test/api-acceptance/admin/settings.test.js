const should = require('should');
const _ = require('lodash');
const supertest = require('supertest');
const os = require('os');
const fs = require('fs-extra');
const config = require('../../../core/shared/config');
const testUtils = require('../../utils');
const localUtils = require('./utils');

describe('Settings API', function () {
    let request;
    let ghostServer;

    before(async function () {
        ghostServer = await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    after(function () {
        return ghostServer.stop();
    });

    it('Can request all settings', async function () {
        const res = await request.get(localUtils.API.getApiQuery('settings/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);

        localUtils.API.checkResponse(jsonResponse, 'settings');

        JSON.parse(_.find(jsonResponse.settings, {key: 'unsplash'}).value).should.eql(true);
        JSON.parse(_.find(jsonResponse.settings, {key: 'amp'}).value).should.eql(true);
        should.not.exist(_.find(jsonResponse.settings, {key: 'permalinks'}));
        should.not.exist(_.find(jsonResponse.settings, {key: 'ghost_head'}));
        should.not.exist(_.find(jsonResponse.settings, {key: 'ghost_foot'}));

        testUtils.API.isISO8601(jsonResponse.settings[0].created_at).should.be.true();
        jsonResponse.settings[0].created_at.should.be.an.instanceof(String);

        should.not.exist(_.find(jsonResponse.settings, function (setting) {
            return setting.type === 'core';
        }));
    });

    it('Can read a setting', async function () {
        const res = await request.get(localUtils.API.getApiQuery('settings/codeinjection_head/'))
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
        jsonResponse.settings[0].key.should.eql('codeinjection_head');
        testUtils.API.isISO8601(jsonResponse.settings[0].created_at).should.be.true();
    });

    it('Can edit a setting', async function () {
        const res = await request.get(localUtils.API.getApiQuery('settings/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private);

        const jsonResponse = res.body;
        const changedValue = [];

        const settingToChange = {
            settings: [
                {
                    key: 'title',
                    value: changedValue
                },
                {
                    key: 'codeinjection_head',
                    value: null
                },
                {
                    key: 'navigation',
                    value: JSON.stringify([{
                        label: 'label1'
                    }])
                },
                {
                    key: 'slack',
                    value: JSON.stringify([{
                        url: 'https://overrides.tld',
                        username: 'Overrides Username'
                    }])
                },
                {
                    key: 'slack_username',
                    value: 'New Slack Username'
                },
                {
                    key: 'is_private',
                    value: false
                },
                {
                    key: 'meta_title',
                    value: 'SEO title'
                },
                {
                    key: 'meta_description',
                    value: 'SEO description'
                },
                {
                    key: 'og_image',
                    value: '/content/images/2019/07/facebook.png'
                },
                {
                    key: 'og_title',
                    value: 'facebook title'
                },
                {
                    key: 'og_description',
                    value: 'facebook description'
                },
                {
                    key: 'twitter_image',
                    value: '/content/images/2019/07/twitter.png'
                },
                {
                    key: 'twitter_title',
                    value: 'twitter title'
                },
                {
                    key: 'twitter_description',
                    value: 'twitter description'
                },
                {
                    key: 'lang',
                    value: 'ua'
                },
                {
                    key: 'labs',
                    value: JSON.stringify({})
                },
                {
                    key: 'timezone',
                    value: 'Pacific/Auckland'
                },
                {
                    key: 'unsplash',
                    value: false
                }
            ]
        };

        should.exist(jsonResponse);
        should.exist(jsonResponse.settings);

        const {body, headers} = await request.put(localUtils.API.getApiQuery('settings/'))
            .set('Origin', config.get('url'))
            .send(settingToChange)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        const putBody = body;
        headers['x-cache-invalidate'].should.eql('/*');
        should.exist(putBody);

        putBody.settings.length.should.equal(settingToChange.settings.length);

        putBody.settings[0].key.should.eql('title');
        putBody.settings[0].value.should.eql(JSON.stringify(changedValue));

        putBody.settings[1].key.should.eql('codeinjection_head');
        should.equal(putBody.settings[1].value, null);

        putBody.settings[2].key.should.eql('navigation');
        should.equal(putBody.settings[2].value, JSON.stringify([{label: 'label1'}]));

        putBody.settings[3].key.should.eql('slack_username');
        should.equal(putBody.settings[3].value, 'New Slack Username');

        putBody.settings[4].key.should.eql('is_private');
        should.equal(putBody.settings[4].value, false);

        putBody.settings[5].key.should.eql('meta_title');
        should.equal(putBody.settings[5].value, 'SEO title');

        putBody.settings[6].key.should.eql('meta_description');
        should.equal(putBody.settings[6].value, 'SEO description');

        putBody.settings[6].key.should.eql('meta_description');
        should.equal(putBody.settings[6].value, 'SEO description');

        putBody.settings[7].key.should.eql('og_image');
        should.equal(putBody.settings[7].value, `${config.get('url')}/content/images/2019/07/facebook.png`);

        putBody.settings[8].key.should.eql('og_title');
        should.equal(putBody.settings[8].value, 'facebook title');

        putBody.settings[9].key.should.eql('og_description');
        should.equal(putBody.settings[9].value, 'facebook description');

        putBody.settings[10].key.should.eql('twitter_image');
        should.equal(putBody.settings[10].value, `${config.get('url')}/content/images/2019/07/twitter.png`);

        putBody.settings[11].key.should.eql('twitter_title');
        should.equal(putBody.settings[11].value, 'twitter title');

        putBody.settings[12].key.should.eql('twitter_description');
        should.equal(putBody.settings[12].value, 'twitter description');

        putBody.settings[13].key.should.eql('lang');
        should.equal(putBody.settings[13].value, 'ua');

        putBody.settings[14].key.should.eql('labs');
        should.equal(putBody.settings[14].value, JSON.stringify({}));

        putBody.settings[15].key.should.eql('timezone');
        should.equal(putBody.settings[15].value, 'Pacific/Auckland');

        putBody.settings[16].key.should.eql('unsplash');
        should.equal(putBody.settings[16].value, false);

        putBody.settings[17].key.should.eql('slack');
        should.equal(putBody.settings[17].value, JSON.stringify([{
            url: 'https://overrides.tld',
            username: 'New Slack Username'
        }]));

        localUtils.API.checkResponse(putBody, 'settings');
    });

    it('Can download routes.yaml', async function () {
        const res = await request.get(localUtils.API.getApiQuery('settings/routes/yaml/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/yaml')
            .expect(200);

        res.headers['content-disposition'].should.eql('Attachment; filename="routes.yaml"');
        res.headers['content-type'].should.eql('application/yaml; charset=utf-8');
        res.headers['content-length'].should.eql('138');
    });

    it('Can upload routes.yaml', async function () {
        const newRoutesYamlPath = `${os.tmpdir()}/routes.yaml`;

        await fs.writeFile(newRoutesYamlPath, 'routes:\ncollections:\ntaxonomies:\n');
        const res = await request
            .post(localUtils.API.getApiQuery('settings/routes/yaml/'))
            .set('Origin', config.get('url'))
            .attach('routes', newRoutesYamlPath)
            .expect('Content-Type', /application\/json/)
            .expect(200);

        res.headers['x-cache-invalidate'].should.eql('/*');
        await ghostServer.stop();
    });
});
