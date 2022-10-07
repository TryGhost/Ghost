// # Frontend Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...
const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const cheerio = require('cheerio');

const testUtils = require('../utils');
const config = require('../../core/shared/config');
const bridge = require('../../core/bridge');

describe('Frontend Routing: Email Routes', function () {
    let request;
    let emailPosts;

    before(async function () {
        await testUtils.startGhost({forceStart: true});

        request = supertest.agent(config.get('url'));

        emailPosts = await testUtils.fixtures.insertPosts([{
            title: 'I am visible through email route!',
            status: 'sent',
            posts_meta: {
                email_only: true
            }
        }, {
            title: 'I am NOT visible through email route!',
            status: 'draft',
            posts_meta: {
                email_only: true
            }
        }]);
    });

    after(function () {
        sinon.restore();
    });

    it('should display email_only post', async function () {
        const res = await request.get(`/email/${emailPosts[0].get('uuid')}/`)
            .expect('Content-Type', /html/)
            .expect(200);

        const $ = cheerio.load(res.text);

        $('title').text().should.equal('I am visible through email route!');

        should.not.exist(res.headers['x-cache-invalidate']);
        should.not.exist(res.headers['X-CSRF-Token']);
        should.not.exist(res.headers['set-cookie']);
        should.exist(res.headers.date);
    });

    it('404s for draft email only post', function () {
        return request.get(`/email/${emailPosts[1].get('uuid')}/`)
            .expect(404);
    });

    it('404s known slug', function () {
        return request.get(`/email/${emailPosts[0].get('slug')}/`)
            .expect(404);
    });

    it('404s unknown slug', function () {
        return request.get('/email/random-slug/')
            .expect(404);
    });
});
