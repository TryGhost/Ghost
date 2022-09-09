const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');
const should = require('should');

let membersAgent, membersService;

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

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

    it('Creates a valid magic link from custom signup with redirection', async function () {
        const customSignupUrl = 'http://localhost:2368/custom-signup-form-page';
        const email = 'newly-created-user-magic-link-test@test.com';
        await membersAgent
            .post('/api/send-magic-link')
            .header('Referer', customSignupUrl)
            .body({
                email,
                emailType: 'signup',
                autoRedirect: true
            })
            .expectEmptyBody()
            .expectStatus(201);

        const mail = await mockManager.assert.sentEmail({
            to: email,
            subject: /Complete your sign up to Ghost!/
        });
        const [url] = mail.text.match(/https?:\/\/[^\s]+/);
        const parsed = new URL(url);
        const redirect = parsed.searchParams.get('r');
        should(redirect).equal(customSignupUrl);
    });

    it('Creates a valid magic link from custom signup with redirection disabled', async function () {
        const customSignupUrl = 'http://localhost:2368/custom-signup-form-page';
        const email = 'newly-created-user-magic-link-test@test.com';
        await membersAgent
            .post('/api/send-magic-link')
            .header('Referer', customSignupUrl)
            .body({
                email,
                emailType: 'signup',
                autoRedirect: false
            })
            .expectEmptyBody()
            .expectStatus(201);

        const mail = await mockManager.assert.sentEmail({
            to: email,
            subject: /Complete your sign up to Ghost!/
        });
        const [url] = mail.text.match(/https?:\/\/[^\s]+/);
        const parsed = new URL(url);
        const redirect = parsed.searchParams.get('r');
        should(redirect).equal(null);
    });

    it('triggers email alert for free member signup', async function () {
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

        // Get member data from token
        const data = await membersService.api.getMemberDataFromMagicLinkToken(token);

        // Wait for the dispatched events (because this happens async)
        await sleep(250);
        // Check member alert is sent to site owners
        mockManager.assert.sentEmail({
            to: 'jbloggs@example.com',
            subject: /🥳 Free member signup: newly-created-user-magic-link-test@test.com/
        });

        // Check member data is returned
        should(data).match({
            email
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
                        time: Date.now()
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
