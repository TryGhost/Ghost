const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const url = require('url');
const configUtils = require('../../utils/configUtils');
const config = require('../../../core/server/config');
const models = require('../../../core/server/models');
const testUtils = require('../../utils');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;
let request;

describe('Authors Content API', function () {
    let ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.initFixtures('owner:post', 'users:no-owner', 'user:inactive', 'posts', 'api_keys');
            });
    });

    afterEach(function () {
        configUtils.restore();
    });

    const validKey = localUtils.getValidKey();

    it('Can request authors', function (done) {
        request.get(localUtils.API.getApiQuery(`authors/?key=${validKey}`))
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
                should.exist(jsonResponse.authors);
                localUtils.API.checkResponse(jsonResponse, 'authors');
                jsonResponse.authors.should.have.length(3);

                // We don't expose the email address, status and other attrs.
                localUtils.API.checkResponse(jsonResponse.authors[0], 'author', ['url'], null, null);

                // Default order 'name asc' check
                jsonResponse.authors[0].name.should.eql('Ghost');
                jsonResponse.authors[2].name.should.eql('Slimer McEctoplasm');

                should.exist(res.body.authors[0].url);
                should.exist(url.parse(res.body.authors[0].url).protocol);
                should.exist(url.parse(res.body.authors[0].url).host);

                // Public api returns all authors, but no status! Locked/Inactive authors can still have written articles.
                models.Author.findPage(Object.assign({status: 'all'}, testUtils.context.internal))
                    .then((response) => {
                        _.map(response.data, model => model.toJSON()).length.should.eql(3);
                        done();
                    });
            });
    });

    it('Can request authors including post count', function (done) {
        request.get(localUtils.API.getApiQuery(`authors/?key=${validKey}&include=count.posts&order=count.posts ASC`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;

                should.exist(jsonResponse.authors);
                jsonResponse.authors.should.have.length(3);

                // We don't expose the email address.
                localUtils.API.checkResponse(jsonResponse.authors[0], 'author', ['count', 'url'], null, null);

                // Each user should have the correct count and be more than 0
                _.find(jsonResponse.authors, {slug: 'joe-bloggs'}).count.posts.should.eql(4);
                _.find(jsonResponse.authors, {slug: 'slimer-mcectoplasm'}).count.posts.should.eql(1);
                _.find(jsonResponse.authors, {slug: 'ghost'}).count.posts.should.eql(7);

                const ids = jsonResponse.authors
                    .filter(author => (author.slug !== 'ghost'))
                    .map(user => user.id);

                ids.should.eql([
                    testUtils.DataGenerator.Content.users[3].id,
                    testUtils.DataGenerator.Content.users[0].id
                ]);

                done();
            });
    });

    it('Can request single author', function (done) {
        request.get(localUtils.API.getApiQuery(`authors/slug/ghost/?key=${validKey}`))
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

                should.exist(jsonResponse.authors);
                jsonResponse.authors.should.have.length(1);

                // We don't expose the email address.
                localUtils.API.checkResponse(jsonResponse.authors[0], 'author', ['url'], null, null);
                done();
            });
    });

    it('Can request author by id including post count', function (done) {
        request.get(localUtils.API.getApiQuery(`authors/1/?key=${validKey}&include=count.posts`))
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

                should.exist(jsonResponse.authors);
                jsonResponse.authors.should.have.length(1);

                // We don't expose the email address.
                localUtils.API.checkResponse(jsonResponse.authors[0], 'author', ['count', 'url'], null, null);
                done();
            });
    });
});
