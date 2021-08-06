// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...
const should = require('should');

const sinon = require('sinon');
const supertest = require('supertest');
const cheerio = require('cheerio');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const ghost = testUtils.startGhost;
let request;

describe('Frontend Routing: Preview Routes', function () {
    function doEnd(done) {
        return function (err, res) {
            if (err) {
                return done(err);
            }

            should.not.exist(res.headers['x-cache-invalidate']);
            should.not.exist(res.headers['X-CSRF-Token']);
            should.not.exist(res.headers['set-cookie']);
            should.exist(res.headers.date);

            done();
        };
    }

    function addPosts(done) {
        testUtils.clearData().then(function () {
            return testUtils.initData();
        }).then(function () {
            return testUtils.fixtures.insertPostsAndTags();
        }).then(function () {
            done();
        });
    }

    afterEach(function () {
        sinon.restore();
    });

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            });
    });

    before(addPosts);

    it('should display draft posts accessed via uuid', function (done) {
        request.get('/p/d52c42ae-2755-455c-80ec-70b2ec55c903/')
            .expect('Content-Type', /html/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                const $ = cheerio.load(res.text);

                should.not.exist(res.headers['x-cache-invalidate']);
                should.not.exist(res.headers['X-CSRF-Token']);
                should.not.exist(res.headers['set-cookie']);
                should.exist(res.headers.date);

                $('title').text().should.equal('Not finished yet');
                $('meta[name="description"]').attr('content').should.equal('meta description for draft post');

                // @TODO: use theme from fixtures and don't rely on content/themes/casper
                // $('.content .post').length.should.equal(1);
                // $('.poweredby').text().should.equal('Proudly published with Ghost');
                // $('body.post-template').length.should.equal(1);
                // $('article.post').length.should.equal(1);

                done();
            });
    });

    it('should redirect published posts to their live url', function (done) {
        request.get('/p/2ac6b4f6-e1f3-406c-9247-c94a0496d39d/')
            .expect(301)
            .expect('Location', '/short-and-sweet/')
            .expect('Cache-Control', testUtils.cacheRules.year)
            .end(doEnd(done));
    });

    it('404s unknown uuids', function (done) {
        request.get('/p/aac6b4f6-e1f3-406c-9247-c94a0496d39f/')
            .expect(404)
            .end(doEnd(done));
    });
});
