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
                return testUtils.initFixtures('users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'client:trusted-domain');
            });
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('browse tags without limit defaults to 15', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?client_id=ghost-admin&client_secret=not_available'))
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
                testUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(15);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');

                should.exist(res.body.tags[0].url);
                should.exist(url.parse(res.body.tags[0].url).protocol);
                should.exist(url.parse(res.body.tags[0].url).host);

                done();
            });
    });

    it('browse tags - limit=all should fetch all tags', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?limit=all&client_id=ghost-admin&client_secret=not_available'))
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
                testUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(56);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags without limit=4 fetches 4 tags', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?limit=4&client_id=ghost-admin&client_secret=not_available'))
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
                testUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(4);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag', ['url']);
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags - limit=all should fetch all tags and include count.posts', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?limit=all&client_id=ghost-admin&client_secret=not_available&include=count.posts'))
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
