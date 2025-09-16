const {agentProvider, fixtureManager, mockManager} = require('../utils/agent-provider');
const assert = require('assert/strict');
const sinon = require('sinon');
const crypto = require('crypto');
const settingsHelpers = require('../../core/server/services/settings-helpers');
const rssUrlHelper = require('../../core/server/services/members/rss-url-helper');

describe('Member RSS Authentication', function () {
    let agent;
    let mockMembersValidationKey;
    let testMember;

    beforeEach(function () {
        agent = agentProvider.getFrontendAPIAgent();
        mockMembersValidationKey = 'test-validation-key';

        // Mock the settings helper to return our test key
        sinon.stub(settingsHelpers, 'getMembersValidationKey').returns(mockMembersValidationKey);

        // Create test member data
        testMember = {
            uuid: 'test-member-uuid-123',
            email: 'test@example.com',
            name: 'Test Member'
        };
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('Public RSS (no authentication)', function () {
        it('should serve public RSS feed without auth params', async function () {
            await agent.get('/rss/')
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.not.containEql('(Member Feed)');
                });
        });

        it('should serve public RSS feed with invalid UUID', async function () {
            const validKey = crypto.createHmac('sha256', mockMembersValidationKey)
                .update('invalid-uuid')
                .digest('hex');

            await agent.get(`/rss/?uuid=invalid-uuid&key=${validKey}`)
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.not.containEql('(Member Feed)');
                });
        });

        it('should serve public RSS feed with invalid key', async function () {
            await agent.get(`/rss/?uuid=${testMember.uuid}&key=invalid-key`)
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.not.containEql('(Member Feed)');
                });
        });

        it('should serve public RSS feed with missing UUID', async function () {
            await agent.get('/rss/?key=some-key')
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.not.containEql('(Member Feed)');
                });
        });

        it('should serve public RSS feed with missing key', async function () {
            await agent.get(`/rss/?uuid=${testMember.uuid}`)
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.not.containEql('(Member Feed)');
                });
        });
    });

    describe('Member RSS (with authentication)', function () {
        beforeEach(function () {
            // Mock member service to return our test member
            const membersService = require('../../core/server/services/members');
            sinon.stub(membersService.api, 'memberBREADService').resolves({
                read: sinon.stub().resolves(testMember)
            });
        });

        it('should serve member RSS feed with valid UUID and key', async function () {
            const validKey = crypto.createHmac('sha256', mockMembersValidationKey)
                .update(testMember.uuid)
                .digest('hex');

            await agent.get(`/rss/?uuid=${testMember.uuid}&key=${validKey}`)
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.containEql('(Member Feed)');
                });
        });

        it('should cache member RSS feed separately from public feed', async function () {
            const validKey = crypto.createHmac('sha256', mockMembersValidationKey)
                .update(testMember.uuid)
                .digest('hex');

            // First request - member feed
            await agent.get(`/rss/?uuid=${testMember.uuid}&key=${validKey}`)
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.containEql('(Member Feed)');
                });

            // Second request - public feed should not contain member indicator
            await agent.get('/rss/')
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.not.containEql('(Member Feed)');
                });
        });
    });

    describe('RSS URL Generator Helper', function () {
        it('should generate valid RSS URL for member', function () {
            const url = rssUrlHelper.generateMemberRSSUrl(testMember);
            const expectedKey = crypto.createHmac('sha256', mockMembersValidationKey)
                .update(testMember.uuid)
                .digest('hex');

            url.should.containEql(`uuid=${testMember.uuid}`);
            url.should.containEql(`key=${expectedKey}`);
            url.should.containEql('/rss/');
        });

        it('should generate RSS URL with custom path', function () {
            const customPath = '/tag/news/rss/';
            const url = rssUrlHelper.generateMemberRSSUrl(testMember, customPath);

            url.should.containEql(customPath);
            url.should.containEql(`uuid=${testMember.uuid}`);
        });

        it('should return empty string for invalid member', function () {
            const url = rssUrlHelper.generateMemberRSSUrl(null);
            url.should.equal('');

            const urlNoUuid = rssUrlHelper.generateMemberRSSUrl({email: 'test@example.com'});
            urlNoUuid.should.equal('');
        });
    });

    describe('Tag and Author RSS with Member Authentication', function () {
        beforeEach(function () {
            // Mock member service
            const membersService = require('../../core/server/services/members');
            sinon.stub(membersService.api, 'memberBREADService').resolves({
                read: sinon.stub().resolves(testMember)
            });
        });

        it('should serve member-authenticated tag RSS', async function () {
            const validKey = crypto.createHmac('sha256', mockMembersValidationKey)
                .update(testMember.uuid)
                .digest('hex');

            await agent.get(`/tag/getting-started/rss/?uuid=${testMember.uuid}&key=${validKey}`)
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.containEql('(Member Feed)');
                });
        });

        it('should serve member-authenticated author RSS', async function () {
            const validKey = crypto.createHmac('sha256', mockMembersValidationKey)
                .update(testMember.uuid)
                .digest('hex');

            await agent.get(`/author/ghost/rss/?uuid=${testMember.uuid}&key=${validKey}`)
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.containEql('(Member Feed)');
                });
        });
    });

    describe('Feed redirect endpoints', function () {
        it('should redirect /feed/ to /rss/ preserving auth params', async function () {
            const validKey = crypto.createHmac('sha256', mockMembersValidationKey)
                .update(testMember.uuid)
                .digest('hex');

            await agent.get(`/feed/?uuid=${testMember.uuid}&key=${validKey}`)
                .expect('Location', `/rss/?uuid=${testMember.uuid}&key=${validKey}`)
                .expect(301);
        });
    });

    describe('Error Handling', function () {
        beforeEach(function () {
            // Mock member service to throw an error
            const membersService = require('../../core/server/services/members');
            sinon.stub(membersService.api, 'memberBREADService').resolves({
                read: sinon.stub().rejects(new Error('Database error'))
            });
        });

        it('should fallback to public feed when member service throws error', async function () {
            const validKey = crypto.createHmac('sha256', mockMembersValidationKey)
                .update(testMember.uuid)
                .digest('hex');

            await agent.get(`/rss/?uuid=${testMember.uuid}&key=${validKey}`)
                .expect('Content-Type', /application\/rss\+xml/)
                .expect(200)
                .expect((res) => {
                    res.text.should.not.containEql('(Member Feed)');
                });
        });
    });
});