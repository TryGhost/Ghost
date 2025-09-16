const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/configUtils');

const member_rss_url = require('../../../../core/frontend/helpers/member_rss_url');

describe('{{member_rss_url}} helper', function () {
    let mockMember;
    let mockOptions;

    beforeEach(function () {
        mockMember = {
            uuid: 'test-member-uuid-123',
            email: 'test@example.com',
            name: 'Test Member'
        };

        mockOptions = {
            data: {
                root: {
                    member: mockMember
                }
            },
            hash: {}
        };

        // Mock settings helpers
        const settingsHelpers = require('../../../../core/server/services/settings-helpers');
        sinon.stub(settingsHelpers, 'getMembersValidationKey').returns('test-validation-key');
    });

    afterEach(function () {
        configUtils.restore();
        sinon.restore();
    });

    it('should generate member RSS URL', function () {
        const result = member_rss_url.call({}, mockOptions);

        result.should.be.an('object');
        result.string.should.containEql('/rss/');
        result.string.should.containEql('uuid=test-member-uuid-123');
        result.string.should.containEql('key=');
    });

    it('should generate member RSS URL with custom path', function () {
        mockOptions.hash.path = '/tag/news/rss/';

        const result = member_rss_url.call({}, mockOptions);

        result.string.should.containEql('/tag/news/rss/');
        result.string.should.containEql('uuid=test-member-uuid-123');
    });

    it('should throw error when no member in context', function () {
        mockOptions.data.root.member = null;

        should(() => {
            member_rss_url.call({}, mockOptions);
        }).throw('The {{member_rss_url}} helper was used outside of a member context.');
    });

    it('should throw error when member has no uuid', function () {
        mockOptions.data.root.member = {
            email: 'test@example.com',
            name: 'Test Member'
        };

        const result = member_rss_url.call({}, mockOptions);
        result.string.should.equal('');
    });

    it('should return empty string for undefined member', function () {
        mockOptions.data.root.member = undefined;

        should(() => {
            member_rss_url.call({}, mockOptions);
        }).throw('The {{member_rss_url}} helper was used outside of a member context.');
    });
});