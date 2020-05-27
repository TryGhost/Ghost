const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;

describe('Tag API', function () {
    let request;

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'posts');
            });
    });

    it('Can request all tags', function () {
        return request
            .get(localUtils.API.getApiQuery('tags/?include=count.posts&order=name%20DESC'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.have.length(6);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['count', 'url']);

                testUtils.API.isISO8601(jsonResponse.tags[0].created_at).should.be.true();
                jsonResponse.tags[0].created_at.should.be.an.instanceof(String);

                jsonResponse.meta.pagination.should.have.property('page', 1);
                jsonResponse.meta.pagination.should.have.property('limit', 15);
                jsonResponse.meta.pagination.should.have.property('pages', 1);
                jsonResponse.meta.pagination.should.have.property('total', 6);
                jsonResponse.meta.pagination.should.have.property('next', null);
                jsonResponse.meta.pagination.should.have.property('prev', null);

                // returns 404 because this tag has no published posts
                jsonResponse.tags[0].url.should.eql(`${config.get('url')}/404/`);
                jsonResponse.tags[1].url.should.eql(`${config.get('url')}/tag/kitchen-sink/`);

                should.exist(jsonResponse.tags[0].count.posts);
            });
    });

    it('Can paginate tags', function () {
        return request
            .get(localUtils.API.getApiQuery('tags/?page=2'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.equal(res.body.meta.pagination.page, 2);
            });
    });

    it('Can read a tag', function () {
        return request
            .get(localUtils.API.getApiQuery(`tags/${testUtils.existingData.tags[0].id}/?include=count.posts`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.have.length(1);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['count', 'url']);
                should.exist(jsonResponse.tags[0].count.posts);

                jsonResponse.tags[0].url.should.eql(`${config.get('url')}/tag/getting-started/`);
            });
    });

    it('Can add a tag', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag();

        return request
            .post(localUtils.API.getApiQuery('tags/'))
            .set('Origin', config.get('url'))
            .send({
                tags: [tag]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                should.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.have.length(1);

                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
                testUtils.API.isISO8601(jsonResponse.tags[0].created_at).should.be.true();
            });
    });

    it('Can add an internal tag', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag({
            name: '#test',
            slug: null
        });

        return request
            .post(localUtils.API.getApiQuery('tags/'))
            .set('Origin', config.get('url'))
            .send({
                tags: [tag]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                should.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                jsonResponse.tags[0].visibility.should.eql('internal');
                jsonResponse.tags[0].name.should.eql('#test');
                jsonResponse.tags[0].slug.should.eql('hash-test');
            });
    });

    it('Can edit a tag', function () {
        return request
            .put(localUtils.API.getApiQuery(`tags/${testUtils.existingData.tags[0].id}`))
            .set('Origin', config.get('url'))
            .send({
                tags: [Object.assign({}, testUtils.existingData.tags[0], {description: 'hey ho ab ins klo'})]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.have.length(1);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
                jsonResponse.tags[0].description.should.eql('hey ho ab ins klo');
            });
    });

    it('Can destroy a tag', function () {
        return request
            .del(localUtils.API.getApiQuery(`tags/${testUtils.existingData.tags[0].id}`))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204)
            .then((res) => {
                should.exist(res.headers['x-cache-invalidate']);
                res.body.should.eql({});
            });
    });
});
