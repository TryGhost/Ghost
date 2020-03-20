const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const testUtils = require('../../utils');
const config = require('../../../server/config');
const models = require('../../../server/models');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;
let request;

describe('Pages API', function () {
    let ghostServer;
    let ownerCookie;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'users:extra', 'posts');
            })
            .then(function (cookie) {
                ownerCookie = cookie;
            });
    });

    it('Can retrieve all pages', function (done) {
        request.get(localUtils.API.getApiQuery('pages/'))
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
                should.exist(jsonResponse.pages);
                localUtils.API.checkResponse(jsonResponse, 'pages');
                jsonResponse.pages.should.have.length(2);

                localUtils.API.checkResponse(jsonResponse.pages[0], 'page');
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.pages[0].featured).should.eql(true);

                // Absolute urls by default
                jsonResponse.pages[0].url.should.match(new RegExp(`${config.get('url')}/p/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}`));
                jsonResponse.pages[1].url.should.eql(`${config.get('url')}/static-page-test/`);

                done();
            });
    });

    it('Can add a page', function () {
        const page = {
            title: 'My Page',
            page: false,
            status: 'published'
        };

        return request.post(localUtils.API.getApiQuery('pages/'))
            .set('Origin', config.get('url'))
            .send({pages: [page]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201)
            .then((res) => {
                res.body.pages.length.should.eql(1);

                localUtils.API.checkResponse(res.body.pages[0], 'page');
                should.exist(res.headers['x-cache-invalidate']);

                return models.Post.findOne({
                    id: res.body.pages[0].id
                }, testUtils.context.internal);
            })
            .then((model) => {
                model.get('title').should.eql(page.title);
                model.get('status').should.eql(page.status);
                model.get('type').should.eql('page');
            });
    });

    it('Can update a page', function () {
        const page = {
            title: 'updated page',
            page: false
        };

        return request
            .get(localUtils.API.getApiQuery(`pages/${testUtils.DataGenerator.Content.posts[5].id}/`))
            .set('Origin', config.get('url'))
            .expect(200)
            .then((res) => {
                page.updated_at = res.body.pages[0].updated_at;

                return request.put(localUtils.API.getApiQuery('pages/' + testUtils.DataGenerator.Content.posts[5].id))
                    .set('Origin', config.get('url'))
                    .send({pages: [page]})
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then((res) => {
                should.exist(res.headers['x-cache-invalidate']);
                localUtils.API.checkResponse(res.body.pages[0], 'page');

                return models.Post.findOne({
                    id: res.body.pages[0].id
                }, testUtils.context.internal);
            })
            .then((model) => {
                model.get('type').should.eql('page');
            });
    });

    it('Cannot get page via posts endpoint', function () {
        return request.get(localUtils.API.getApiQuery(`posts/${testUtils.DataGenerator.Content.posts[5].id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });

    it('Cannot update page via posts endpoint', function () {
        const page = {
            title: 'fails',
            updated_at: new Date().toISOString()
        };

        return request.put(localUtils.API.getApiQuery('posts/' + testUtils.DataGenerator.Content.posts[5].id))
            .set('Origin', config.get('url'))
            .send({posts: [page]})
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404);
    });

    it('Can delete a page', function () {
        return request.del(localUtils.API.getApiQuery('pages/' + testUtils.DataGenerator.Content.posts[5].id))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204)
            .then((res) => {
                res.body.should.be.empty();
                res.headers['x-cache-invalidate'].should.eql('/*');
            });
    });
});
