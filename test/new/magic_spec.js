// # Default Frontend Routing Test
// These tests check the default out-of-the-box behaviour of Ghost is working as expected.

// Test Structure
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...
const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('./utils');
const configUtils = require('../utils/configUtils');

describe('Default Frontend routing', function () {
    let request;

    afterEach(function () {
        sinon.restore();
    });

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(configUtils.config.get('url'));
    });

    describe('Main Routes', function () {
        it('/ should respond with valid HTML', async function () {
            await request.get('/')
                .expect((res) => {
                    console.log(res.text);
                })
                .expect(200)
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public);

            // const $ = cheerio.load(res.text);

            // // NOTE: "Ghost" is the title from the settings.
            // $('title').text().should.equal('Ghost');

            // $('body.home-template').length.should.equal(1);
            // $('article.post').length.should.equal(7);
            // $('article.tag-getting-started').length.should.equal(7);

            // doEnd(res);
        });

        it('/author/ghost/ should respond with valid HTML', async function () {
            await request.get('/author/ghost/')
                .expect('Content-Type', /html/);
            // .expect('Cache-Control', testUtils.cacheRules.public)
            // .expect(200);

            // const $ = cheerio.load(res.text);

            // // NOTE: "Ghost" is the title from the settings.
            // $('title').text().should.equal('Ghost - Ghost');

            // $('body.author-template').length.should.equal(1);
            // $('article.post').length.should.equal(7);
            // $('article.tag-getting-started').length.should.equal(7);

            // doEnd(res);
        });
    });
});
