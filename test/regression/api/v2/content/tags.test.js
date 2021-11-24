const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const localUtils = require('./utils');
const testUtils = require('../../../../utils');
const configUtils = require('../../../../utils/configUtils');
const config = require('../../../../../core/shared/config');

let request;

describe('api/v2/content/tags', function () {
    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await testUtils.initFixtures('users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
    });

    afterEach(function () {
        configUtils.restore();
    });

    const validKey = localUtils.getValidKey();

    it('Can read tags with fields', function () {
        return request
            .get(localUtils.API.getApiQuery(`tags/${testUtils.DataGenerator.Content.tags[0].id}/?key=${validKey}&fields=name,slug`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                localUtils.API.checkResponse(res.body.tags[0], 'tag', null, null, ['id', 'name', 'slug']);
            });
    });

    it('Can request all tags with count.posts field', function () {
        return request
            .get(localUtils.API.getApiQuery(`tags/?key=${validKey}&include=count.posts`))
            .set('Origin', testUtils.API.getURL())
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.have.length(4);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['count', 'url']);

                jsonResponse.meta.pagination.should.have.property('page', 1);
                jsonResponse.meta.pagination.should.have.property('limit', 15);
                jsonResponse.meta.pagination.should.have.property('pages', 4);
                jsonResponse.meta.pagination.should.have.property('total', 56);
                jsonResponse.meta.pagination.should.have.property('next', 2);
                jsonResponse.meta.pagination.should.have.property('prev', null);

                should.exist(jsonResponse.tags[0].count.posts);
                // Each tag should have the correct count
                _.find(jsonResponse.tags, {name: 'Getting Started'}).count.posts.should.eql(7);
                _.find(jsonResponse.tags, {name: 'kitchen sink'}).count.posts.should.eql(2);
                _.find(jsonResponse.tags, {name: 'bacon'}).count.posts.should.eql(2);
                _.find(jsonResponse.tags, {name: 'chorizo'}).count.posts.should.eql(1);
            });
    });
});
