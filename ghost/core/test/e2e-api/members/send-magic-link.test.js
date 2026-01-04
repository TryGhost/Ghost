const {agentProvider, mockManager, fixtureManager, matchers, configUtils, resetRateLimits, dbUtils} = require('../../utils/e2e-framework');
const should = require('should');
const sinon = require('sinon');
const assert = require('assert/strict');
const settingsCache = require('../../../core/shared/settings-cache');
const settingsService = require('../../../core/server/services/settings');
const DomainEvents = require('@tryghost/domain-events');
const {anyErrorId, anyString} = matchers;
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
        const testEmail = 'member1@test.com';

        beforeEach(function () {
            mockManager.mockLabsDisabled();
        });

        afterEach(function () {
            mockManager.restore();
        });

        function scrubEmailContent(mail) {
            const scrub = s => s && s
                .replace(/([?&])token=[^&\s'\"]+/gi, '$1token=<TOKEN>')
                .replace(/\d{6}/g, '<OTC>');

            return {
                to: mail.to,
                subject: scrub(mail.subject),
                html: scrub(mail.html),
                text: scrub(mail.text)
            };
        }

        async function sendSigninRequest(options = {}) {
            const body = {
                email: testEmail,
                emailType: 'signin',
                ...options
            };

            await membersAgent.post('/api/send-magic-link')
                .body(body)
                .expectStatus(201);

            return mockManager.assert.sentEmail({to: testEmail});
        }

        it('matches snapshot', async function () {
            const mail = await sendSigninRequest();
            const scrubbedEmail = scrubEmailContent(mail);
            should(scrubbedEmail).matchSnapshot();
        });

        it('matches OTC snapshot', async function () {
            const mail = await sendSigninRequest({includeOTC: true});
            const scrubbedEmail = scrubEmailContent(mail);
            should(scrubbedEmail).matchSnapshot();
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
            it('allows signins from email domains blocked in config', async function () {
                const email = 'hello-enabled@blocked-domain-config.com';
                await membersService.api.members.create({email, name: 'Member Test'});

                await membersAgent.post('/api/send-magic-link')
                    .body({
                        email,
                        emailType: 'signin',
                        includeOTC: true
                    })
                    .expectStatus(201)
                    .expect(({body}) => {
                        body.otc_ref.should.be.a.String().and.match(/^[a-f0-9-]{36}$/);
                    });
            });

            it('allows signins from email domains blocked in settings', async function () {
                settingsCache.set('all_blocked_email_domains', {value: ['blocked-domain-setting.com']});

                const email = 'hello-enabled@blocked-domain-setting.com';
                await membersService.api.members.create({email, name: 'Member Test'});

                await membersAgent.post('/api/send-magic-link')
                    .body({
                        email,
                        emailType: 'signin',
                        includeOTC: true
                    })
                    .expectStatus(201)
                    .expect(({body}) => {
                        body.otc_ref.should.be.a.String().and.match(/^[a-f0-9-]{36}$/);
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

    describe('OTC', function () {
        function sendMagicLinkRequest(email, emailType = 'signin', otc = false) {
            const body = {email, emailType};
            if (otc) {
                body.includeOTC = otc;
            }

            return membersAgent
                .post('/api/send-magic-link')
                .body(body);
        }

        function assertOTCInEmailContent(mail) {
            const otcRegex = /\d{6}/;

            // NOTE: we don't (at time of writing tests) include the OTC in the subject line
            assert(otcRegex.test(mail.html), 'Email HTML should contain OTC');
            assert(otcRegex.test(mail.text), 'Email text should contain OTC');
        }

        function assertNoOTCInEmailContent(mail) {
            const otcRegex = /\d{6}|\scode\s|\sotc\s/i;

            const subjectMatch = mail.subject.match(otcRegex);
            assert(!subjectMatch, `Email subject should not contain OTC. Found: "${subjectMatch?.[0]}" in subject: "${mail.subject}"`);

            const htmlMatch = mail.html.match(otcRegex);
            assert(!htmlMatch, `Email HTML should not contain OTC. Found: "${htmlMatch?.[0]}" near: "${mail.html.substring(mail.html.search(otcRegex) - 50, mail.html.search(otcRegex) + 100)}"`);

            const textMatch = mail.text.match(otcRegex);
            assert(!textMatch, `Email text should not contain OTC. Found: "${textMatch?.[0]}" near: "${mail.text.substring(mail.text.search(otcRegex) - 50, mail.text.search(otcRegex) + 100)}"`);
        }

        beforeEach(async function () {
            // ensure we don't hit rate limits whilst testing
            await dbUtils.truncate('brute');
            await resetRateLimits();
        });

        it('Should return empty body for signin magic link requests', async function () {
            await sendMagicLinkRequest('member1@test.com')
                .expectEmptyBody()
                .expectStatus(201);
        });

        it('Should include otc_ref in response when requesting magic link with OTC', async function () {
            const response = await sendMagicLinkRequest('member1@test.com', 'signin', true)
                .expectStatus(201);

            assert(response.body.otc_ref, 'Response should contain otc_ref');
        });

        it('Should not include otc_ref in response when requesting magic link without OTC', async function () {
            const response = await sendMagicLinkRequest('member1@test.com', 'signin', false)
                .expectStatus(201);

            assert(!response.body.otc_ref, 'Response should not contain otc_ref');
        });

        it('Should include OTC in email content when requesting magic link with OTC', async function () {
            await sendMagicLinkRequest('member1@test.com', 'signin', true);

            const mail = mockManager.assert.sentEmail({
                to: 'member1@test.com'
            });

            assertOTCInEmailContent(mail);
        });

        ['signin', 'signup'].forEach((emailType) => {
            it(`Should not include OTC in ${emailType} email content when requesting magic link without OTC`, async function () {
                await sendMagicLinkRequest('member1@test.com', emailType, false);

                const mail = mockManager.assert.sentEmail({
                    to: 'member1@test.com'
                });

                assertNoOTCInEmailContent(mail);
            });
        });

        it('Should allow normal magic link authentication flow', async function () {
            const magicLink = await membersService.api.getMagicLink('member1@test.com', 'signin');
            const magicLinkUrl = new URL(magicLink);
            const token = magicLinkUrl.searchParams.get('token');

            await membersAgent.get(`/?token=${token}`)
                .expectStatus(302)
                .expectHeader('Location', /success=true/)
                .expectHeader('Set-Cookie', /members-ssr.*/);
        });

        [true, 'true'].forEach((otcValue) => {
            it(`Should include OTC when requested with otc parameter value: ${otcValue}`, async function () {
                const response = await sendMagicLinkRequest('member1@test.com', 'signin', otcValue)
                    .expectStatus(201);

                assert(response.body.otc_ref, `Response should contain otc_ref for includeOTC=${otcValue}`);

                const mail = mockManager.assert.sentEmail({
                    to: 'member1@test.com'
                });

                assertOTCInEmailContent(mail);
            });
        });

        [false, 'false'].forEach((otcValue) => {
            it(`Should not include OTC when requested with otc parameter value: ${otcValue}`, async function () {
                const response = await sendMagicLinkRequest('member1@test.com', 'signin', otcValue)
                    .expectStatus(201);

                assert(!response.body.otc_ref, `Response should not contain otc_ref for includeOTC=${otcValue}`);

                const mail = mockManager.assert.sentEmail({
                    to: 'member1@test.com'
                });

                assertNoOTCInEmailContent(mail);
            });
        });

        it('Should gracefully handle OTC generation failures', async function () {
            const tokenProvider = require('../../../core/server/services/members/SingleUseTokenProvider');
            const deriveOTCStub = sinon.stub(tokenProvider.prototype, 'deriveOTC').throws(new Error('OTC generation failed'));

            try {
                const response = await sendMagicLinkRequest('member1@test.com', 'signin', true)
                    .expectStatus(201);

                // Ensure we're actually hitting our stub
                sinon.assert.called(deriveOTCStub);

                // Should still succeed but without OTC
                assert(!response.body.otc_ref, 'Response should not contain otc_ref when OTC generation fails');

                const mail = mockManager.assert.sentEmail({
                    to: 'member1@test.com'
                });

                assertNoOTCInEmailContent(mail);
            } finally {
                deriveOTCStub.restore();
            }
        });

        it('Should handle OTC parameter with non-existent member email', async function () {
            const response = await sendMagicLinkRequest('nonexistent@test.com', 'signin', true)
                .expectStatus(400);

            // Should still process the request normally for non-existent members
            assert(!response.body.otc_ref, 'Should not return otc_ref for non-existent member');
        });

        async function sendAndVerifyOTC(email, emailType = 'signin', options = {}) {
            const response = await sendMagicLinkRequest(email, emailType, true)
                .expectStatus(201);

            const mail = mockManager.assert.sentEmail({
                to: email
            });

            const otcRef = response.body.otc_ref;
            const otc = mail.text.match(/\d{6}/)[0];

            const verifyResponse = await membersAgent
                .post('/api/verify-otc')
                .header('Referer', options.referer)
                .body({
                    otcRef,
                    otc,
                    redirect: options.redirect
                })
                .expectStatus(200);

            return verifyResponse;
        }

        it('Can verify provided OTC using /verify-otc endpoint', async function () {
            const verifyResponse = await sendAndVerifyOTC('member1@test.com', 'signin');

            assert(verifyResponse.body.redirectUrl, 'Response should contain redirectUrl');

            const redirectUrl = new URL(verifyResponse.body.redirectUrl);
            assert(redirectUrl.pathname.endsWith('members/'), 'Redirect URL should end with /members');

            const token = redirectUrl.searchParams.get('token');
            const otcVerification = redirectUrl.searchParams.get('otc_verification');

            assert(token, 'Redirect URL should contain token');
            assert(otcVerification, 'Redirect URL should contain otc_verification');
        });

        it('/verify-otc endpoint returns correct redirectUrl using Referer header', async function () {
            const verifyResponse = await sendAndVerifyOTC('member1@test.com', 'signin', {referer: 'https://www.test.com'});

            const redirectUrl = new URL(verifyResponse.body.redirectUrl);
            assert.equal(redirectUrl.searchParams.get('r'), 'https://www.test.com');
        });

        it('/verify-otc endpoint returns correct redirectUrl using redirect body param', async function () {
            const verifyResponse = await sendAndVerifyOTC('member1@test.com', 'signin', {referer: 'https://www.test.com/signin', redirect: 'https://www.test.com/post'});

            const redirectUrl = new URL(verifyResponse.body.redirectUrl);
            assert.equal(redirectUrl.searchParams.get('r'), 'https://www.test.com/post');
        });

        describe('Rate limiting', function () {
            before(async function () {
                // Adjust rate limits for faster testing
                // Note: enumeration limit must be higher than per-code limit for the "limits enforced per code" test
                configUtils.set('spam:otc_verification:freeRetries', 2);
                configUtils.set('spam:otc_verification_enumeration:freeRetries', 5);
                await resetRateLimits();
            });

            after(async function () {
                await configUtils.restore();
                await resetRateLimits();
            });

            beforeEach(async function () {
                await dbUtils.truncate('brute');
                await resetRateLimits();
            });

            it('Will rate limit OTC verification enumeration (IP-based)', async function () {
                const otcVerificationEnumerationLimit = configUtils.config.get('spam').otc_verification_enumeration.freeRetries + 1;

                // Make multiple verification attempts with *different* otcRefs from same IP
                for (let i = 0; i < otcVerificationEnumerationLimit; i++) {
                    await membersAgent
                        .post('/api/verify-otc')
                        .body({
                            otcRef: `fake-otc-ref-${i}`,
                            otc: '000000'
                        })
                        .expectStatus(400);
                }

                // Now we should be rate limited (enumeration)
                await membersAgent
                    .post('/api/verify-otc')
                    .body({
                        otcRef: 'fake-otc-ref-final',
                        otc: '000000'
                    })
                    .expectStatus(429)
                    .matchBodySnapshot({
                        errors: [{
                            id: anyErrorId,
                            type: 'TooManyRequestsError',
                            message: anyString,
                            code: anyString
                        }]
                    });
            });

            it('Will rate limit OTC verification for specific otcRef', async function () {
                const otcVerificationLimit = configUtils.config.get('spam').otc_verification.freeRetries + 1;
                const otcRef = 'fake-otc-ref-single';

                // Make multiple failed attempts with the *same* otcRef
                for (let i = 0; i < otcVerificationLimit; i++) {
                    await membersAgent
                        .post('/api/verify-otc')
                        .body({
                            otcRef,
                            otc: `00000${i + 1}`
                        })
                        .expectStatus(400);
                }

                // Now we should be rate limited for this specific otcRef
                await membersAgent
                    .post('/api/verify-otc')
                    .body({
                        otcRef,
                        otc: '000000'
                    })
                    .expectStatus(429)
                    .matchBodySnapshot({
                        errors: [{
                            id: anyErrorId,
                            type: 'TooManyRequestsError',
                            message: anyString,
                            code: anyString
                        }]
                    });
            });

            it('Different otcRefs are tracked independently', async function () {
                const otcVerificationLimit = configUtils.config.get('spam').otc_verification.freeRetries + 1;
                const otcVerificationEnumerationLimit = configUtils.config.get('spam').otc_verification_enumeration.freeRetries + 1;

                // Ensure we can test specific limits without hitting enumeration limit
                assert(otcVerificationLimit < otcVerificationEnumerationLimit, 'Specific otcRef limit must be lower than enumeration limit for this test');

                // Exhaust attempts for first otcRef
                for (let i = 0; i < otcVerificationLimit; i++) {
                    await membersAgent
                        .post('/api/verify-otc')
                        .body({
                            otcRef: 'fake-otc-ref-one',
                            otc: '000000'
                        })
                        .expectStatus(400);
                }

                // First otcRef should be rate limited
                await membersAgent
                    .post('/api/verify-otc')
                    .body({
                        otcRef: 'fake-otc-ref-one',
                        otc: '000000'
                    })
                    .expectStatus(429);

                // But second otcRef should still work (independent counter)
                await membersAgent
                    .post('/api/verify-otc')
                    .body({
                        otcRef: 'fake-otc-ref-two',
                        otc: '000000'
                    })
                    .expectStatus(400);
            });
        });
    });
});
