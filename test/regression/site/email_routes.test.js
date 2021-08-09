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
const settingsCache = require('../../../core/shared/settings-cache');

describe('Frontend Routing: Email Routes', function () {
    let request;
    let emailPosts;

    afterEach(function () {
        sinon.restore();
    });

    before(async function () {
        const originalSettingsCacheGetFn = settingsCache.get;

        // NOTE: this wacky stubbing can be removed once emailOnlyPosts enters GA stage
        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'labs') {
                return {
                    emailOnlyPosts: true
                };
            }

            return originalSettingsCacheGetFn(key, options);
        });

        await testUtils.startGhost();

        request = supertest.agent(config.get('url'));

        emailPosts = await testUtils.fixtures.insertPosts([{
            title: 'I am visible through email route!',
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

    it('404s when accessed by slug', function () {
        return request.get(`/${emailPosts[0].get('slug')}/`)
            .expect(404);
    });

    it('404s unknown uuids', function () {
        return request.get('/email/aac6b4f6-e1f3-406c-9247-c94a0496d39f/')
            .expect(404);
    });
});
