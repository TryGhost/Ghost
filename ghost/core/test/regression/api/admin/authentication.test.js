const nock = require('nock');
const assert = require('assert/strict');
const {agentProvider, mockManager, fixtureManager, matchers} = require('../../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyISODateTime, anyErrorId} = matchers;

const {tokens} = require('@tryghost/security');
const models = require('../../../../core/server/models');
const settingsCache = require('../../../../core/shared/settings-cache');

async function waitForEmailSent(emailMockReceiver, number = 1) {
    let sentEmailCount = 0;
    while (sentEmailCount === 0) {
        try {
            emailMockReceiver.assertSentEmailCount(number);
            sentEmailCount = number;
        } catch (e) {
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
        }
    }
}

describe('Authentication API', function () {
    let emailMockReceiver;
    let agent;

    describe('Blog setup', function () {
        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
        });

        beforeEach(async function () {
            await mockManager.disableStripe();
            emailMockReceiver = mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
            nock.cleanAll();
        });

        it('is setup? no', async function () {
            await agent
                .get('authentication/setup')
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('complete setup', async function () {
            const email = 'test@example.com';
            const password = 'thisissupersafe';

            const requestMock = nock('https://api.github.com')
                .get('/repos/tryghost/dawn/zipball')
                .query(true)
                .replyWithFile(200, fixtureManager.getPathForFixture('themes/valid.zip'));

            await agent
                .post('authentication/setup')
                .body({
                    setup: [{
                        name: 'test user',
                        email,
                        password,
                        blogTitle: 'a test blog',
                        theme: 'TryGhost/Dawn',
                        accentColor: '#85FF00',
                        description: 'Custom Site Description on Setup &mdash; great for everyone'
                    }]
                })
                .expectStatus(201)
                .matchBodySnapshot({
                    users: [{
                        created_at: anyISODateTime,
                        updated_at: anyISODateTime
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            await waitForEmailSent(emailMockReceiver);

            // Test our side effects
            emailMockReceiver.matchHTMLSnapshot();
            emailMockReceiver.matchPlaintextSnapshot();
            emailMockReceiver.matchMetadataSnapshot();

            assert.equal(requestMock.isDone(), true, 'The dawn github URL should have been used');

            const activeTheme = await settingsCache.get('active_theme');
            const accentColor = await settingsCache.get('accent_color');
            const description = await settingsCache.get('description');
            assert.equal(activeTheme, 'dawn', 'The theme dawn should have been installed');
            assert.equal(accentColor, '#85FF00', 'The accent color should have been set');
            assert.equal(description, 'Custom Site Description on Setup &mdash; great for everyone', 'The site description should have been set');

            // Test that we would not show any notifications (errors) to the user
            await agent.loginAs(email, password);
            await agent
                .get('notifications/')
                .expectStatus(200)
                .expect(({body}) => {
                    assert.deepEqual(body.notifications, [], 'The setup should not create notifications');
                });

            // Test that the default Tier has been renamed from 'Default Product'
            const {body} = await agent.get('/tiers/');
            const tierWithDefaultProductName = body.tiers.find(x => x.name === 'Default Product');

            assert(tierWithDefaultProductName === undefined, 'The default Tier should have had a name change');

            // Test that the default Newsletter has name and sender name changed to blog title
            const {body: newsletterBody} = await agent.get('/newsletters/');
            const defaultNewsletter = newsletterBody.newsletters.find(x => x.slug === 'default-newsletter');
            const newsletterWithDefaultName = newsletterBody.newsletters.find(x => x.name
                === 'Default Newsletter');

            assert (defaultNewsletter.name === 'a test blog', 'The default newsletter should have had a name change');

            assert(newsletterWithDefaultName === undefined, 'The default newsletter should have had a name change');
        });

        it('is setup? yes', async function () {
            await agent
                .get('authentication/setup')
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('complete setup again', function () {
            return agent
                .post('authentication/setup')
                .body({
                    setup: [{
                        name: 'test user',
                        email: 'test-leo@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expectStatus(403)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('update setup', async function () {
            await fixtureManager.init();
            await agent.loginAsOwner();

            await agent
                .put('authentication/setup')
                .body({
                    setup: [{
                        name: 'test user edit',
                        email: 'test-edit@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot({
                    users: [{
                        created_at: anyISODateTime,
                        last_seen: anyISODateTime,
                        updated_at: anyISODateTime
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('complete setup with default theme', async function () {
            const cleanAgent = await agentProvider.getAdminAPIAgent();

            const email = 'test@example.com';
            const password = 'thisissupersafe';

            const requestMock = nock('https://api.github.com')
                .get('/repos/tryghost/casper/zipball')
                .query(true)
                .replyWithFile(200, fixtureManager.getPathForFixture('themes/valid.zip'));

            await cleanAgent
                .post('authentication/setup')
                .body({
                    setup: [{
                        name: 'test user',
                        email,
                        password,
                        blogTitle: 'a test blog',
                        theme: 'TryGhost/Casper',
                        accentColor: '#85FF00',
                        description: 'Custom Site Description on Setup &mdash; great for everyone'
                    }]
                })
                .expectStatus(201)
                .matchBodySnapshot({
                    users: [{
                        created_at: anyISODateTime,
                        updated_at: anyISODateTime
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            await waitForEmailSent(emailMockReceiver);

            // Test our side effects
            emailMockReceiver.matchHTMLSnapshot();
            emailMockReceiver.matchPlaintextSnapshot();
            emailMockReceiver.matchMetadataSnapshot();

            assert.equal(requestMock.isDone(), false, 'The ghost github URL should not have been used');

            const activeTheme = await settingsCache.get('active_theme');
            const accentColor = await settingsCache.get('accent_color');
            const description = await settingsCache.get('description');
            assert.equal(activeTheme, 'casper', 'The theme casper should have been installed');
            assert.equal(accentColor, '#85FF00', 'The accent color should have been set');
            assert.equal(description, 'Custom Site Description on Setup &mdash; great for everyone', 'The site description should have been set');

            // Test that we would not show any notifications (errors) to the user
            await cleanAgent.loginAs(email, password);
            await cleanAgent
                .get('notifications/')
                .expectStatus(200)
                .expect(({body}) => {
                    assert.deepEqual(body.notifications, [], 'The setup should not create notifications');
                });
        });
    });

    describe('Invitation', function () {
        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init('invites');
            await agent.loginAsOwner();
        });

        it('check invite with invalid email', function () {
            return agent
                .get('authentication/invitation?email=invalidemail')
                .expectStatus(400)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('check valid invite', async function () {
            await agent
                .get(`authentication/invitation?email=${fixtureManager.get('invites', 0).email}`)
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('check invalid invite', async function () {
            await agent
                .get(`authentication/invitation?email=notinvited@example.org`)
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('try to accept without invite', function () {
            return agent
                .post('authentication/invitation')
                .body({
                    invitation: [{
                        token: 'lul11111',
                        password: 'lel123456',
                        email: 'not-invited@example.org',
                        name: 'not invited'
                    }]
                })
                .expectStatus(404)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('try to accept with invite and existing email address', function () {
            return agent
                .post('authentication/invitation')
                .body({
                    invitation: [{
                        token: fixtureManager.get('invites', 0).token,
                        password: '12345678910',
                        email: fixtureManager.get('users', 0).email,
                        name: 'invited'
                    }]
                })
                .expectStatus(422)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('try to accept with invite', async function () {
            await agent
                .post('authentication/invitation')
                .body({
                    invitation: [{
                        token: fixtureManager.get('invites', 0).token,
                        password: '12345678910',
                        email: fixtureManager.get('invites', 0).email,
                        name: 'invited'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Password reset', function () {
        const email = fixtureManager.get('users', 0).email;

        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init('invites');
            await agent.loginAsOwner();
        });

        beforeEach(function () {
            mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('reset password', async function () {
            const ownerUser = await fixtureManager.getCurrentOwnerUser();

            const token = tokens.resetToken.generateHash({
                expires: Date.now() + (1000 * 60),
                email: email,
                dbHash: settingsCache.get('db_hash'),
                password: ownerUser.get('password')
            });

            await agent.put('authentication/password_reset')
                .header('Accept', 'application/json')
                .body({
                    password_reset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('reset password: invalid token', async function () {
            await agent
                .put('authentication/password_reset')
                .header('Accept', 'application/json')
                .body({
                    password_reset: [{
                        token: 'invalid',
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(401)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('reset password: expired token', async function () {
            const ownerUser = await fixtureManager.getCurrentOwnerUser();

            const dateInThePast = Date.now() - (1000 * 60);
            const token = tokens.resetToken.generateHash({
                expires: dateInThePast,
                email: email,
                dbHash: settingsCache.get('db_hash'),
                password: ownerUser.get('password')
            });

            await agent
                .put('authentication/password_reset')
                .header('Accept', 'application/json')
                .body({
                    password_reset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('reset password: unmatched token', async function () {
            const token = tokens.resetToken.generateHash({
                expires: Date.now() + (1000 * 60),
                email: email,
                dbHash: settingsCache.get('db_hash'),
                password: 'invalid_password'
            });

            await agent
                .put('authentication/password_reset')
                .header('Accept', 'application/json')
                .body({
                    password_reset: [{
                        token: token,
                        newPassword: 'thisissupersafe',
                        ne2Password: 'thisissupersafe'
                    }]
                })
                .expectStatus(400)
                .matchBodySnapshot({
                    errors: [{
                        id: anyErrorId
                    }]
                })
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });

        it('reset password: generate reset token', async function () {
            await agent
                .post('authentication/password_reset')
                .header('Accept', 'application/json')
                .body({
                    password_reset: [{
                        email: email
                    }]
                })
                .expectStatus(200)
                .matchBodySnapshot()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });
        });
    });

    describe('Reset all passwords', function () {
        before(async function () {
            agent = await agentProvider.getAdminAPIAgent();
            await fixtureManager.init('invites');
            await agent.loginAsOwner();
        });

        beforeEach(function () {
            emailMockReceiver = mockManager.mockMail();
        });

        afterEach(function () {
            mockManager.restore();
        });

        it('reset all passwords returns 204', async function () {
            await agent.post('authentication/global_password_reset')
                .header('Accept', 'application/json')
                .body({})
                .expectStatus(204)
                .expectEmptyBody()
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                });

            // Check side effects
            // All users locked
            const users = await models.User.fetchAll();
            for (const user of users) {
                assert.equal(user.get('status'), 'locked', `Status should be locked for user ${user.get('email')}`);
            }

            // No session left
            const sessions = await models.Session.fetchAll();
            assert.equal(sessions.length, 0, 'There should be no sessions left in the DB');

            mockManager.assert.sentEmailCount(2);

            mockManager.assert.sentEmail({
                subject: 'Reset Password',
                to: 'jbloggs@example.com'
            });
            mockManager.assert.sentEmail({
                subject: 'Reset Password',
                to: 'ghost-author@example.com'
            });
        });
    });
});
