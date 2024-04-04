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
let request;

function assertCorrectFrontendHeaders(res) {
    should.not.exist(res.headers['x-cache-invalidate']);
    should.not.exist(res.headers['X-CSRF-Token']);
    should.not.exist(res.headers['set-cookie']);
    should.exist(res.headers.date);
}

describe('Frontend Routing: Subscribe Routes', function () {
    afterEach(function () {
        sinon.restore();
    });

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
    });

    after(async function () {
        await testUtils.stopGhost();
    });

    it('should return 404 if no token or action parameter is provided', async function () {
        await request.get('/confirm_signup/?action=signup')
            .expect(404);

        await request.get('/confirm_signup/?token=123')
            .expect(404);
    });

    it('should render the subscribe template if a token and action parameter is provided', async function () {
        await request.get('/confirm_signup/?token=123&action=signup')
            .expect('Content-Type', /html/)
            .expect(200)
            .expect(assertCorrectFrontendHeaders)
            .expect((res) => {
                const $ = cheerio.load(res.text);

                should.not.exist(res.headers['x-cache-invalidate']);
                should.not.exist(res.headers['X-CSRF-Token']);
                should.not.exist(res.headers['set-cookie']);
                should.exist(res.headers.date);

                $('#gh-subscribe-form').should.exist;
                $('#gh-subscribe-form').attr('action').should.eql('/members/api/member');
                $('input[name="token"]').val().should.eql('123');
                $('input[name="action"]').val().should.eql('signup');
            });
    });
});
