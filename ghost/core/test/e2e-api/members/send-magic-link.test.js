const {agentProvider, mockManager, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const should = require('should');
const settingsCache = require('../../../core/shared/settings-cache');
const settingsService = require('../../../core/server/services/settings');
const DomainEvents = require('@tryghost/domain-events');
const {anyErrorId} = matchers;
const spamPrevention = require('../../../core/server/web/shared/middleware/api/spam-prevention');

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

        // Reset spam prevention middleware
        spamPrevention.reset();

        // Reset settings
        settingsCache.set('members_signup_access', {value: 'all'});
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Errors when passed multiple emails', async function () {
        await membersAgent.post('/api/send-magic-link')
            .body({
                email: 'one@test.com,two@test.com',
                emailType: 'signup'
            })
            .expectStatus(400);
    });

    it('Throws an error when logging in to a email that does not exist', async function () {
        const email = 'this-member-does-not-exist@test.com';
        await membersAgent.post('/api/send-magic-link')
            .body({
                email,
                emailType: 'signin'
            })
            .expectStatus(400)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId,
                    // Add this here because it is easy to be overlooked (we need a human readable error!)
                    // 'Please sign up first' should be included only when invite only is disabled.
                    message: 'No member exists with this e-mail address. Please sign up first.'
                }]
            });
    });

    it('Throws an error when logging in to a email that does not exist (invite only)', async function () {
        settingsCache.set('members_signup_access', {value: 'invite'});

        const email = 'this-member-does-not-exist@test.com';
        await membersAgent.post('/api/send-magic-link')
            .body({
                email,
                emailType: 'signin'
            })
            .expectStatus(400)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId,
                    // Add this here because it is easy to be overlooked (we need a human readable error!)
                    // 'Please sign up first' should NOT be included
                    message: 'No member exists with this e-mail address.'
                }]
            });
    });

    it('Throws an error when trying to sign up on an invite-only site', async function () {
        settingsCache.set('members_signup_access', {value: 'invite'});

        const email = 'this-member-does-not-exist@test.com';
        await membersAgent.post('/api/send-magic-link')
            .body({
                email,
                emailType: 'signup'
            })
            .expectStatus(400)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId,
                    message: 'This site is invite-only, contact the owner for access.'
                }]
            });
    });

    it('Throws an error when trying to sign up on a paid-members only site', async function () {
        settingsCache.set('members_signup_access', {value: 'paid'});

        const email = 'this-member-does-not-exist@test.com';
        await membersAgent.post('/api/send-magic-link')
            .body({
                email,
                emailType: 'signup'
            })
            .expectStatus(400)
            .matchBodySnapshot({
                errors: [{id: anyErrorId, message: 'This site only accepts paid members.'}]
            });
    });

    it('Throws an error when trying to sign up on a none-members site', async function () {
        settingsCache.set('members_signup_access', {value: 'none'});

        const email = 'this-member-does-not-exist@test.com';
        await membersAgent.post('/api/send-magic-link')
            .body({
                email,
                emailType: 'signup'
            })
            .expectStatus(400)
            .matchBodySnapshot({
                errors: [{id: anyErrorId}]
            });
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
        await DomainEvents.allSettled();
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

    describe('blocked email domains', function () {
        beforeEach(async function () {
            configUtils.set('spam:blocked_email_domains', ['blocked-domain-config.com']);

            await settingsService.init();
        });

        afterEach(function () {
            configUtils.restore();
        });

        it('blocks signups from email domains blocked in config', async function () {
            const blockedEmail = 'hello@blocked-domain-config.com';
            membersAgent = membersAgent.duplicate();
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: blockedEmail,
                    emailType: 'signup'
                })
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId,
                        message: 'Signups from this email domain are currently restricted.'
                    }]
                });
        });

        it('blocks signups from email domains blocked in settings', async function () {
            settingsCache.set('all_blocked_email_domains', {value: ['blocked-domain-setting.com']});

            const blockedEmail = 'hello@blocked-domain-setting.com';
            membersAgent = membersAgent.duplicate();
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: blockedEmail,
                    emailType: 'signup'
                })
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId,
                        message: 'Signups from this email domain are currently restricted.'
                    }]
                });
        });

        it('allows signups from non-blocked email domains', async function () {
            const allowedEmail = 'hello@example.com';
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: allowedEmail,
                    emailType: 'signup'
                })
                .expectEmptyBody()
                .expectStatus(201);
        });

        it('allows signins from email domains blocked in config', async function () {
            // Create member with the blocked email address in the database
            const email = 'hello@blocked-domain-config.com';
            await membersService.api.members.create({email, name: 'Member Test'});

            // Check that the member can still sign in
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email,
                    emailType: 'signin'
                })
                .expectEmptyBody()
                .expectStatus(201);
        });

        it('allows signins from email domains blocked in settings', async function () {
            settingsCache.set('all_blocked_email_domains', {value: ['blocked-domain-setting.com']});

            // Create member with the blocked email address in the database
            const email = 'hello@blocked-domain-setting.com';
            await membersService.api.members.create({email, name: 'Member Test'});

            // Check that the member can still sign in
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email,
                    emailType: 'signin'
                })
                .expectEmptyBody()
                .expectStatus(201);
        });

        it('blocks changing email to a blocked domain', async function () {
            settingsCache.set('all_blocked_email_domains', {value: ['blocked-domain-setting.com']});
            const email = 'hello@original-domain.com';
            await membersService.api.members.create({email, name: 'Member Test'});

            await membersAgent.post('/api/member/email/')
                .body({
                    email: 'hello@blocked-domain-setting.com',
                    identity: '12345678'
                })
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId,
                        // Add this here because it is easy to be overlooked (we need a human readable error!)
                        // 'Please sign up first' should be included only when invite only is disabled.
                        message: 'Memberships from this email domain are currently restricted.'
                    }]
                });
        });

        it('allows changing email to a non-blocked domain', async function () {
            settingsCache.set('all_blocked_email_domains', {value: ['blocked-domain-setting.com']});

            const email = 'hello@original-domain-1.com';
            const member = await membersService.api.members.create({email, name: 'Member Test'});
            const token = await membersService.api.getMemberIdentityToken(member.get('transient_id'));

            await membersAgent.post('/api/member/email/')
                .body({
                    email: 'hello@allowed-domain-setting.com',
                    identity: token
                })
                .expectStatus(201);
        });
    });
});

