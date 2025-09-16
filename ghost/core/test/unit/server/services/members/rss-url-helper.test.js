const should = require('should');
const sinon = require('sinon');
const crypto = require('crypto');
const rssUrlHelper = require('../../../../../core/server/services/members/rss-url-helper');
const settingsHelpers = require('../../../../../core/server/services/settings-helpers');
const urlUtils = require('../../../../../core/shared/url-utils');

describe('RSS URL Helper', function () {
    let mockMember;
    const testValidationKey = 'test-validation-key';

    beforeEach(function () {
        mockMember = {
            uuid: 'test-member-uuid-123',
            email: 'test@example.com',
            name: 'Test Member'
        };

        sinon.stub(settingsHelpers, 'getMembersValidationKey').returns(testValidationKey);
        sinon.stub(urlUtils, 'urlFor').withArgs('home', true).returns('https://example.com/');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('generateMemberRSSUrl', function () {
        it('should generate valid RSS URL with UUID and HMAC key', function () {
            const url = rssUrlHelper.generateMemberRSSUrl(mockMember);
            const expectedKey = crypto.createHmac('sha256', testValidationKey)
                .update(mockMember.uuid)
                .digest('hex');

            url.should.equal(`https://example.com//rss/?uuid=${mockMember.uuid}&key=${expectedKey}`);
        });

        it('should generate RSS URL with custom path', function () {
            const customPath = '/tag/news/rss/';
            const url = rssUrlHelper.generateMemberRSSUrl(mockMember, customPath);
            const expectedKey = crypto.createHmac('sha256', testValidationKey)
                .update(mockMember.uuid)
                .digest('hex');

            url.should.equal(`https://example.com/${customPath}?uuid=${mockMember.uuid}&key=${expectedKey}`);
        });

        it('should return empty string for null member', function () {
            const url = rssUrlHelper.generateMemberRSSUrl(null);
            url.should.equal('');
        });

        it('should return empty string for member without UUID', function () {
            const memberWithoutUuid = {
                email: 'test@example.com',
                name: 'Test Member'
            };

            const url = rssUrlHelper.generateMemberRSSUrl(memberWithoutUuid);
            url.should.equal('');
        });

        it('should return empty string for undefined member', function () {
            const url = rssUrlHelper.generateMemberRSSUrl(undefined);
            url.should.equal('');
        });

        it('should generate different keys for different UUIDs', function () {
            const member1 = {uuid: 'uuid-1'};
            const member2 = {uuid: 'uuid-2'};

            const url1 = rssUrlHelper.generateMemberRSSUrl(member1);
            const url2 = rssUrlHelper.generateMemberRSSUrl(member2);

            url1.should.not.equal(url2);

            // Extract keys from URLs
            const key1 = new URL(url1).searchParams.get('key');
            const key2 = new URL(url2).searchParams.get('key');

            key1.should.not.equal(key2);
        });

        it('should generate consistent URLs for same member', function () {
            const url1 = rssUrlHelper.generateMemberRSSUrl(mockMember);
            const url2 = rssUrlHelper.generateMemberRSSUrl(mockMember);

            url1.should.equal(url2);
        });

        it('should use default /rss/ path when no path provided', function () {
            const url = rssUrlHelper.generateMemberRSSUrl(mockMember);
            url.should.containEql('/rss/?');
        });

        it('should handle author RSS path', function () {
            const authorPath = '/author/john/rss/';
            const url = rssUrlHelper.generateMemberRSSUrl(mockMember, authorPath);
            url.should.containEql(authorPath);
        });

        it('should handle tag RSS path', function () {
            const tagPath = '/tag/javascript/rss/';
            const url = rssUrlHelper.generateMemberRSSUrl(mockMember, tagPath);
            url.should.containEql(tagPath);
        });
    });
});