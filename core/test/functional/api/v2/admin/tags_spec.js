const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../../core/server/config');
const ghost = testUtils.startGhost;

describe('Tag API V2', function () {
    let request;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'posts');
            });
    });

    it('browse', function () {
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

                jsonResponse.tags[0].url.should.eql(`${config.get('url')}/tag/pollo/`);

                should.exist(jsonResponse.tags[0].count.posts);
            });
    });

    it('browse accepts the page parameter', function () {
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

    it('read', function () {
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

    it('add', function () {
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
                // @TODO: model layer has no defaults for these properties
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url'], [
                    'feature_image',
                    'meta_description',
                    'meta_title',
                    'parent'
                ]);
                testUtils.API.isISO8601(jsonResponse.tags[0].created_at).should.be.true();
            });
    });

    it('add internal', function () {
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

    it('edit', function () {
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

    it('destroy', function () {
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
