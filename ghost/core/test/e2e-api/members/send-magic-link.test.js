const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');
const should = require('should');

let membersAgent, membersService;

describe('sendMagicLink', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;

        membersService = require('../../../core/server/services/members');

        await fixtureManager.init('members');
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Creates a valid magic link with tokenData, and without urlHistory', async function () {
        const email = 'newly-created-user-magic-link-test@test.com';
        await membersAgent.post('/api/send-magic-link')
            .body({
                email,
                emailType: 'signup'
            })
            .expectEmptyBody()
            .expectStatus(201);

        // Check email is sent
        const mail = mockManager.assert.sentEmail({
            to: email,
            subject: /Complete your sign up to Ghost!/
        });

        // Get link from email
        const [url] = mail.text.match(/https?:\/\/[^\s]+/);
        const parsed = new URL(url);
        const token = parsed.searchParams.get('token');

        // Get data
        const data = await membersService.api.getTokenDataFromMagicLinkToken(token);
        
        should(data).match({
            email,
            attribution: {
                id: null,
                url: null,
                type: null
            }
        });
    });

    it('Converts the urlHistory to the attribution and stores it in the token', async function () {
        const email = 'newly-created-user-magic-link-test-2@test.com';
        await membersAgent.post('/api/send-magic-link')
            .body({
                email,
                emailType: 'signup',
                urlHistory: [
                    {
                        path: '/test-path',
                        time: 123
                    }
                ]
            })
            .expectEmptyBody()
            .expectStatus(201);

        // Check email is sent
        const mail = mockManager.assert.sentEmail({
            to: email,
            subject: /Complete your sign up to Ghost!/
        });

        // Get link from email
        const [url] = mail.text.match(/https?:\/\/[^\s]+/);
        const parsed = new URL(url);
        const token = parsed.searchParams.get('token');

        // Get data
        const data = await membersService.api.getTokenDataFromMagicLinkToken(token);
        
        should(data).match({
            email,
            attribution: {
                id: null,
                url: '/test-path',
                type: 'url'
            }
        });
    });
});
