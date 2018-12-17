const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const url = require('url');
const configUtils = require('../../../../utils/configUtils');
const config = require('../../../../../../core/server/config');
const models = require('../../../../../../core/server/models');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;
let request;

describe('Tags Content API V2', function () {
    let ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.initFixtures('users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
            });
    });

    afterEach(function () {
        configUtils.restore();
    });

    const validKey = localUtils.getValidKey();

    it('browse tags without limit defaults to 15', function (done) {
        request.get(localUtils.API.getApiQuery(`tags/?key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.tags);
                localUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(15);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                should.exist(res.body.tags[0].url);
                should.exist(url.parse(res.body.tags[0].url).protocol);
                should.exist(url.parse(res.body.tags[0].url).host);

                done();
            });
    });

    it('browse tags - limit=all should fetch all tags', function (done) {
        request.get(localUtils.API.getApiQuery(`tags/?limit=all&key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.tags);
                localUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(56);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags without limit=4 fetches 4 tags', function (done) {
        request.get(localUtils.API.getApiQuery(`tags/?limit=4&key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.tags);
                localUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(4);
                localUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
                localUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags - limit=all should fetch all tags and include count.posts', function (done) {
        request.get(localUtils.API.getApiQuery(`tags/?limit=all&key=${validKey}&include=count.posts`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                const jsonResponse = res.body;

                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.be.an.Array().with.lengthOf(56);

                // Each tag should have the correct count
                _.find(jsonResponse.tags, {name: 'Getting Started'}).count.posts.should.eql(7);
                _.find(jsonResponse.tags, {name: 'kitchen sink'}).count.posts.should.eql(2);
                _.find(jsonResponse.tags, {name: 'bacon'}).count.posts.should.eql(2);
                _.find(jsonResponse.tags, {name: 'chorizo'}).count.posts.should.eql(1);
                _.find(jsonResponse.tags, {name: 'pollo'}).count.posts.should.eql(0);
                _.find(jsonResponse.tags, {name: 'injection'}).count.posts.should.eql(0);

                done();
            });
    });
});
