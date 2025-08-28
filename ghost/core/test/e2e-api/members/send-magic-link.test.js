const {agentProvider, mockManager, fixtureManager, matchers, configUtils, resetRateLimits, dbUtils} = require('../../utils/e2e-framework');
const should = require('should');
const sinon = require('sinon');
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

    describe('signin email', function () {
        it('matches snapshot', async function () {
            const email = 'member1@test.com';
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email,
                    emailType: 'signin'
                })
                .expectStatus(201);

            const mail = mockManager.assert.sentEmail({
                to: email
            });

            const scrub = s => s && s
                .replace(/([?&])token=[^&\s'"]+/gi, '$1token=<TOKEN>');

            const snapshot = {
                to: mail.to,
                subject: mail.subject,
                html: scrub(mail.html),
                text: scrub(mail.text)
            };

            should(snapshot).matchSnapshot();
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

        describe('signin from blocked domains', function () {
            describe('with membersSigninOTC feature flag enabled', function () {
                beforeEach(function () {
                    settingsCache.set('labs', {value: JSON.stringify({membersSigninOTC: true})});
                });

                it('allows signins from email domains blocked in config', async function () {
                    const email = 'hello-enabled@blocked-domain-config.com';
                    await membersService.api.members.create({email, name: 'Member Test'});

                    await membersAgent.post('/api/send-magic-link')
                        .body({
                            email,
                            emailType: 'signin'
                        })
                        .expectStatus(201)
                        .expect(({body}) => {
                            Object.keys(body).should.eql(['otc_ref']);
                            body.otc_ref.should.be.a.String().and.match(/^[a-f0-9]{24}$/);
                        });
                });

                it('allows signins from email domains blocked in settings', async function () {
                    settingsCache.set('all_blocked_email_domains', {value: ['blocked-domain-setting.com']});

                    const email = 'hello-enabled@blocked-domain-setting.com';
                    await membersService.api.members.create({email, name: 'Member Test'});

                    await membersAgent.post('/api/send-magic-link')
                        .body({
                            email,
                            emailType: 'signin'
                        })
                        .expectStatus(201)
                        .expect(({body}) => {
                            should.exist(body.otc_ref);
                            body.otc_ref.should.be.a.String().and.match(/^[a-f0-9]{24}$/);
                        });
                });
            });

            describe('with membersSigninOTC feature flag disabled', function () {
                beforeEach(function () {
                    settingsCache.set('labs', {value: JSON.stringify({membersSigninOTC: false})});
                });

                it('allows signins from email domains blocked in config', async function () {
                    const email = 'hello-disabled@blocked-domain-config.com';
                    await membersService.api.members.create({email, name: 'Member Test'});

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

                    const email = 'hello-disabled@blocked-domain-setting.com';
                    await membersService.api.members.create({email, name: 'Member Test'});

                    await membersAgent.post('/api/send-magic-link')
                        .body({
                            email,
                            emailType: 'signin'
                        })
                        .expectEmptyBody()
                        .expectStatus(201);
                });
            });
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

    describe('Homograph attack prevention', function () {
        it('should prevent homograph attacks by normalizing unicode domains', async function () {
            const asciiEmail = 'user@example.com';

            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: asciiEmail,
                    emailType: 'signup'
                })
                .expectStatus(201);

            const unicodeEmail = 'user@exаmple.com'; // Using Cyrillic 'а'

            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: unicodeEmail,
                    emailType: 'signin'
                })
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId,
                        message: 'No member exists with this e-mail address. Please sign up first.'
                    }]
                });
        });

        it('should normalize unicode domains for signup', async function () {
            const unicodeEmail = 'user@tëst.com';

            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: unicodeEmail,
                    emailType: 'signup'
                })
                .expectStatus(201);

            const mail = mockManager.assert.sentEmail({
                to: 'user@xn--tst-jma.com' // Punycode version
            });

            should.exist(mail);
        });
    });

    describe('Rate limiting', function () {
        let clock;

        beforeEach(async function () {
            await dbUtils.truncate('brute');
            await resetRateLimits();
            clock = sinon.useFakeTimers(new Date());
        });

        afterEach(function () {
            clock.restore();
        });

        it('Will rate limit member enumeration', async function () {
            // +1 because this is a retry count, so we have one request + the retries, then blocked
            const userLoginRateLimit = configUtils.config.get('spam').member_login.freeRetries + 1;

            for (let i = 0; i < userLoginRateLimit; i++) {
                await membersAgent.post('/api/send-magic-link')
                    .body({
                        email: 'rate-limiting-test-' + i + '@test.com',
                        emailType: 'signup'
                    })
                    .expectStatus(201);
            }

            // Now we've been rate limited for every email
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'other@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Now we've been rate limited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'one@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Get one of the magic link emails
            const mail = mockManager.assert.sentEmail({
                to: 'rate-limiting-test-0@test.com',
                subject: /Complete your sign up to Ghost!/
            });

            // Get link from email
            const [url] = mail.text.match(/https?:\/\/[^\s]+/);

            const magicLink = new URL(url);

            // Login works, but we're still rate limited (otherwise this would be an easy escape to allow user enumeration)
            await membersAgent.get(magicLink.pathname + magicLink.search);

            // We are still rate limited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Wait 10 minutes and check if we are still rate limited
            clock.tick(10 * 60 * 1000);

            // We should be able to send a new email
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);

            // But only once
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Waiting 10 minutes is still enough (fibonacci)
            clock.tick(10 * 60 * 1000);

            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);

            // Blocked again
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any3@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Waiting 10 minutes is not enough any longer
            clock.tick(10 * 60 * 1000);

            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any3@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Waiting 20 minutes is enough
            clock.tick(10 * 60 * 1000);

            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);

            // Blocked again
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any3@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Waiting 12 hours is enough to reset it completely
            clock.tick(12 * 60 * 60 * 1000 + 1000);

            // We can try multiple times again
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any4@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);

            // Blocked again
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'any5@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);
        });

        it('Will clear rate limits for members auth', async function () {
            // Temporary increase the member_login rate limits to a higher number
            // because other wise we would hit user enumeration rate limits (this won't get reset after a succeeded login)
            // We need to do this here otherwise the middlewares are not setup correctly
            configUtils.set('spam:member_login:freeRetries', 40);

            // We need to reset spam instances to apply the configuration change
            await resetRateLimits();

            // +1 because this is a retry count, so we have one request + the retries, then blocked
            const userLoginRateLimit = configUtils.config.get('spam').user_login.freeRetries + 1;

            for (let i = 0; i < userLoginRateLimit; i++) {
                await membersAgent.post('/api/send-magic-link')
                    .body({
                        email: 'rate-limiting-test-1@test.com',
                        emailType: 'signup'
                    })
                    .expectStatus(201);

                await membersAgent.post('/api/send-magic-link')
                    .body({
                        email: 'rate-limiting-test-2@test.com',
                        emailType: 'signup'
                    })
                    .expectStatus(201);
            }

            // Now we've been rate limited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'rate-limiting-test-1@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Now we've been rate limited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'rate-limiting-test-2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Get one of the magic link emails
            const mail = mockManager.assert.sentEmail({
                to: 'rate-limiting-test-1@test.com',
                subject: /Complete your sign up to Ghost!/
            });

            // Get link from email
            const [url] = mail.text.match(/https?:\/\/[^\s]+/);

            const magicLink = new URL(url);

            // Login
            await membersAgent.get(magicLink.pathname + magicLink.search);

            // The first member has been un ratelimited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'rate-limiting-test-1@test.com',
                    emailType: 'signup'
                })
                .expectEmptyBody()
                .expectStatus(201);

            // The second is still rate limited
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'rate-limiting-test-2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(429);

            // Wait 10 minutes and check if we are still rate limited
            clock.tick(10 * 60 * 1000);

            // We should be able to send a new email
            await membersAgent.post('/api/send-magic-link')
                .body({
                    email: 'rate-limiting-test-2@test.com',
                    emailType: 'signup'
                })
                .expectStatus(201);
        });
    });
});
