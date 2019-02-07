var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils/index'),
    localUtils = require('./utils'),
    config = require('../../../../server/config/index'),
    ghost = testUtils.startGhost,
    request;

describe('Tag API', function () {
    var accesstoken = '', ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'posts');
            })
            .then(function (token) {
                accesstoken = token;
            });
    });

    it('browse', function () {
        return request
            .get(localUtils.API.getApiQuery('tags/?include=count.posts'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.have.length(6);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', 'count');

                testUtils.API.isISO8601(jsonResponse.tags[0].created_at).should.be.true();
                jsonResponse.tags[0].created_at.should.be.an.instanceof(String);

                jsonResponse.meta.pagination.should.have.property('page', 1);
                jsonResponse.meta.pagination.should.have.property('limit', 15);
                jsonResponse.meta.pagination.should.have.property('pages', 1);
                jsonResponse.meta.pagination.should.have.property('total', 6);
                jsonResponse.meta.pagination.should.have.property('next', null);
                jsonResponse.meta.pagination.should.have.property('prev', null);

                should.exist(jsonResponse.tags[0].count.posts);
            });
    });

    it('read', function () {
        return request
            .get(localUtils.API.getApiQuery(`tags/${testUtils.existingData.tags[0].id}/?include=count.posts`))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.have.length(1);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', 'count');
                should.exist(jsonResponse.tags[0].count.posts);
            });
    });

    it('add', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag();

        return request
            .post(localUtils.API.getApiQuery('tags/'))
            .set('Authorization', 'Bearer ' + accesstoken)
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

                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
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
            .set('Authorization', 'Bearer ' + accesstoken)
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
            .set('Authorization', 'Bearer ' + accesstoken)
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
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                jsonResponse.tags[0].description.should.eql('hey ho ab ins klo');
            });
    });

    it('destroy', function () {
        return request
            .del(localUtils.API.getApiQuery(`tags/${testUtils.existingData.tags[0].id}`))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204)
            .then((res) => {
                should.exist(res.headers['x-cache-invalidate']);
                res.body.should.eql({});
            });
    });
});
