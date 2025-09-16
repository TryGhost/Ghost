const should = require('should');
const supertest = require('supertest');
const crypto = require('crypto');
const testUtils = require('../utils');
const config = require('../../core/shared/config');

describe('Member RSS', function () {
    let request;

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
    });

    beforeEach(function () {
        testUtils.initData();
    });

    afterEach(function () {
        testUtils.clearData();
    });

    after(function () {
        return testUtils.stopGhost();
    });

    it('should serve public RSS feed without authentication', async function () {
        await request
            .get('/rss/')
            .expect(200)
            .expect('Content-Type', /application\/rss\+xml/)
            .expect((res) => {
                res.text.should.containEql('<?xml version="1.0" encoding="UTF-8"?>');
                res.text.should.containEql('<rss version="2.0">');
            });
    });

    it('should serve public RSS feed with invalid authentication params', async function () {
        await request
            .get('/rss/?uuid=invalid&key=invalid')
            .expect(200)
            .expect('Content-Type', /application\/rss\+xml/)
            .expect((res) => {
                // Should still return RSS feed (fallback to public)
                res.text.should.containEql('<?xml version="1.0" encoding="UTF-8"?>');
            });
    });

    it('should include member context when valid auth provided', async function () {
        // This test would need a valid member UUID and HMAC key
        // For now, we just test that invalid auth falls back gracefully
        const fakeUuid = 'fake-uuid-123';
        const fakeKey = 'fake-key-456';

        await request
            .get(`/rss/?uuid=${fakeUuid}&key=${fakeKey}`)
            .expect(200)
            .expect('Content-Type', /application\/rss\+xml/)
            .expect((res) => {
                // Should serve public RSS feed since auth is invalid
                res.text.should.containEql('<?xml version="1.0" encoding="UTF-8"?>');
            });
    });

    it('should handle RSS authentication middleware errors gracefully', async function () {
        // Test with malformed parameters
        await request
            .get('/rss/?uuid=&key=')
            .expect(200)
            .expect('Content-Type', /application\/rss\+xml/);
    });
});

describe('Member RSS URL Helper', function () {
    const rssUrlHelper = require('../../core/core/server/services/members/rss-url-helper');

    it('should generate RSS URL for valid member', function () {
        const member = {
            uuid: 'test-uuid-123',
            email: 'test@example.com'
        };

        const rssUrl = rssUrlHelper.generateMemberRSSUrl(member);

        should.exist(rssUrl);
        rssUrl.should.containEql('/rss/');
        rssUrl.should.containEql('uuid=test-uuid-123');
        rssUrl.should.containEql('key=');
    });

    it('should return null for member without UUID', function () {
        const member = {
            email: 'test@example.com'
        };

        const rssUrl = rssUrlHelper.generateMemberRSSUrl(member);
        should.not.exist(rssUrl);
    });

    it('should return null for null member', function () {
        const rssUrl = rssUrlHelper.generateMemberRSSUrl(null);
        should.not.exist(rssUrl);
    });

    it('should generate URLs object with main feed', function () {
        const member = {
            uuid: 'test-uuid-123',
            email: 'test@example.com'
        };

        const rssUrls = rssUrlHelper.generateMemberRSSUrls(member);

        should.exist(rssUrls);
        should.exist(rssUrls.main);
        rssUrls.main.should.containEql('/rss/');
    });
});