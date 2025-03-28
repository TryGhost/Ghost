const DomainEvents = require('@tryghost/domain-events');
const {Mention} = require('@tryghost/webmentions');
const mentionsService = require('../../../core/server/services/mentions');
const assert = require('assert/strict');
const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const configUtils = require('../../utils/configUtils');
const {mockSetting} = require('../../utils/e2e-framework-mock-manager');
const ObjectId = require('bson-objectid').default;
const {sendEmail, getDefaultNewsletter, getLastEmail} = require('../../utils/batch-email-utils');
const urlUtils = require('../../utils/urlUtils');

let emailMockReceiver, agent, membersAgent;

async function sendNewsletter() {
    // Prepare a post and email model
    await sendEmail(agent);
}

async function sendRecommendationNotification() {
    // incoming recommendation in this case
    const webmention = await Mention.create({
        source: 'https://www.otherghostsite.com/.well-known/recommendations.json',
        target: 'https://www.mysite.com/',
        timestamp: new Date(),
        payload: null,
        resourceId: null,
        resourceType: null,
        sourceTitle: 'Other Ghost Site',
        sourceSiteTitle: 'Other Ghost Site',
        sourceAuthor: null,
        sourceExcerpt: null,
        sourceFavicon: null,
        sourceFeaturedImage: null
    });

    // Mark it as verified
    webmention.verify('{"url": "https://www.mysite.com/"}', 'application/json');
    assert.ok(webmention.verified);

    // Save to repository
    await mentionsService.repository.save(webmention);
    await DomainEvents.allSettled();
}

async function sendFreeMemberSignupNotification() {
    const email = ObjectId().toHexString() + '@email.com';
    const membersService = require('../../../core/server/services/members');
    await membersService.api.members.create({email, name: 'Member Test'});
    await DomainEvents.allSettled();
}

async function sendCommentNotification() {
    const postId = fixtureManager.get('posts', 0).id;
    await membersAgent
        .post(`/api/comments/`)
        .body({comments: [{
            post_id: postId,
            parent_id: fixtureManager.get('comments', 0).id,
            html: 'This is a reply'
        }]})
        .expectStatus(201);
}

function configureSite({siteUrl}) {
    configUtils.set('url', new URL(siteUrl).href);
}

async function configureNewsletter({sender_email, sender_reply_to, sender_name}) {
    const defaultNewsletter = await getDefaultNewsletter();
    defaultNewsletter.set('sender_email', sender_email || null);
    defaultNewsletter.set('sender_reply_to', sender_reply_to || 'newsletter');
    defaultNewsletter.set('sender_name', sender_name || null);
    await defaultNewsletter.save();
}

function assertFromAddress(from, replyTo) {
    let i = 0;
    while (emailMockReceiver.getSentEmail(i)) {
        const email = emailMockReceiver.getSentEmail(i);
        assert.equal(email.from, from, `From address (${email.from}) of ${i + 1}th email (${email.subject}) does not match ${from}`);

        if (!replyTo) {
            assert(email.replyTo === null || email.replyTo === undefined, `Unexpected reply-to address (${email.replyTo}) of ${i + 1}th email (${email.subject}), expected none`);
        } else {
            assert.equal(email.replyTo, replyTo, `ReplyTo address (${email.replyTo}) of ${i + 1}th email (${email.subject}) does not match ${replyTo}`);
        }

        i += 1;
    }

    assert(i > 0, 'No emails were sent');
}

async function assertFromAddressNewsletter(aFrom, aReplyTo) {
    const email = (await getLastEmail());
    const {from} = email;
    const replyTo = email['h:Reply-To'];

    assert.equal(from, aFrom, `From address (${from}) does not match ${aFrom}`);

    if (!aReplyTo) {
        assert(replyTo === null || replyTo === undefined, `Unexpected reply-to address (${replyTo}), expected none`);
    } else {
        assert.equal(replyTo, aReplyTo, `ReplyTo address (${replyTo}) does not match ${aReplyTo}`);
    }
}

// Tests the from and replyTo addresses for most emails send from within Ghost.
describe('Email addresses', function () {
    before(async function () {
        // Can only set site URL once because otherwise agents are messed up
        configureSite({
            siteUrl: 'http://blog.acme.com'
        });

        const agents = await agentProvider.getAgentsForMembers();
        agent = agents.adminAgent;
        membersAgent = agents.membersAgent;

        await fixtureManager.init('newsletters', 'members:newsletters', 'users', 'posts', 'comments');
        await agent.loginAsAdmin();
        await membersAgent.loginAs('member@example.com');
    });

    beforeEach(async function () {
        emailMockReceiver = mockManager.mockMail();
        mockManager.mockMailgun();

        configureSite({
            siteUrl: 'http://blog.acme.com'
        });
        mockSetting('title', 'Example Site');
        mockSetting('members_support_address', 'support@address.com');
        mockSetting('comments_enabled', 'all');
        configUtils.set('mail:from', '"Postmaster" <postmaster@examplesite.com>');
    });

    afterEach(async function () {
        await configUtils.restore();
        urlUtils.restore();
        mockManager.restore();
    });

    describe('Custom sending domain', function () {
        beforeEach(async function () {
            configUtils.set('hostSettings:managedEmail:enabled', true);
            configUtils.set('hostSettings:managedEmail:sendingDomain', 'sendingdomain.com');
            configUtils.set('mail:from', '"Default Address" <default@sendingdomain.com>');
        });

        it('[STAFF] sends recommendation emails from mail.from config variable', async function () {
            await sendRecommendationNotification();
            assertFromAddress('"Default Address" <default@sendingdomain.com>');
        });

        it('[STAFF] sends new member notification emails from mail.from config variable', async function () {
            await sendFreeMemberSignupNotification();
            assertFromAddress('"Default Address" <default@sendingdomain.com>');
        });

        it('[STAFF] Uses site title as email address name if no name set in mail:from', async function () {
            configUtils.set('mail:from', 'default@sendingdomain.com');
            await sendFreeMemberSignupNotification();
            assertFromAddress('"Example Site" <default@sendingdomain.com>');
        });

        it('[MEMBERS] send a comment reply notification from the configured sending domain if support address is set to noreply', async function () {
            mockSetting('members_support_address', 'noreply');

            await sendCommentNotification();
            assertFromAddress('"Example Site" <noreply@sendingdomain.com>');
        });

        it('[MEMBERS] send a comment reply notification from the default email address if no support address is set', async function () {
            mockSetting('members_support_address', '');

            await sendCommentNotification();
            assertFromAddress('"Default Address" <default@sendingdomain.com>');
        });

        it('[MEMBERS] send a comment reply notification from the support address only if it matches the sending domain', async function () {
            mockSetting('members_support_address', 'support@sendingdomain.com');

            await sendCommentNotification();
            assertFromAddress('"Example Site" <support@sendingdomain.com>');
        });

        it('[MEMBERS] send a comment reply notification with replyTo set to the support address if it doesn\'t match the sending domain', async function () {
            await sendCommentNotification();
            assertFromAddress('"Default Address" <default@sendingdomain.com>', 'support@address.com');
        });

        it('[NEWSLETTER] Does not allow to send a newsletter from any email address (instead uses mail.from), but allows reply-to to be set', async function () {
            await configureNewsletter({
                sender_email: 'anything@possible.com',
                sender_name: 'Anything Possible',
                sender_reply_to: 'newsletter'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Anything Possible" <default@sendingdomain.com>', '"Anything Possible" <anything@possible.com>');
        });

        it('[NEWSLETTER] Does allow to send a newsletter from a custom sending domain', async function () {
            await configureNewsletter({
                sender_email: 'anything@sendingdomain.com',
                sender_name: 'Anything Possible',
                sender_reply_to: 'newsletter'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Anything Possible" <anything@sendingdomain.com>');
        });

        it('[NEWSLETTER] Does allow to set the replyTo address to any address', async function () {
            await configureNewsletter({
                sender_email: 'anything@sendingdomain.com',
                sender_name: 'Anything Possible',
                sender_reply_to: 'anything@possible.com'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Anything Possible" <anything@sendingdomain.com>', 'anything@possible.com');
        });

        it('[NEWSLETTER] Can set the reply to to the support address', async function () {
            await configureNewsletter({
                sender_email: null,
                sender_name: 'Anything Possible',
                sender_reply_to: 'support'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Anything Possible" <default@sendingdomain.com>', 'support@address.com');
        });

        it('[NEWSLETTER] Uses site title as default sender name', async function () {
            await configureNewsletter({
                sender_email: null,
                sender_name: null,
                sender_reply_to: 'newsletter'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Example Site" <default@sendingdomain.com>');
        });
    });

    describe('Managed email without custom sending domain', function () {
        beforeEach(async function () {
            configUtils.set('hostSettings:managedEmail:enabled', true);
            configUtils.set('hostSettings:managedEmail:sendingDomain', undefined);
            configUtils.set('mail:from', 'default@sendingdomain.com');
        });

        it('[STAFF] sends recommendation emails from mail.from config variable', async function () {
            await sendRecommendationNotification();
            assertFromAddress('"Example Site" <default@sendingdomain.com>');
        });

        it('[STAFF] sends new member notification emails from mail.from config variable', async function () {
            await sendFreeMemberSignupNotification();
            assertFromAddress('"Example Site" <default@sendingdomain.com>');
        });

        it('[STAFF] Prefers to use the mail:from sending name if set above the site name', async function () {
            configUtils.set('mail:from', '"Default Address" <default@sendingdomain.com>');

            await sendFreeMemberSignupNotification();
            assertFromAddress('"Default Address" <default@sendingdomain.com>');
        });

        it('[MEMBERS] send a comment reply notification from mail.from if support address is set to noreply', async function () {
            mockSetting('members_support_address', 'noreply');

            await sendCommentNotification();
            assertFromAddress('"Example Site" <default@sendingdomain.com>', 'noreply@blog.acme.com');
        });

        it('[MEMBERS] send a comment reply notification from mail.from if no support address is set, without a replyTo', async function () {
            mockSetting('members_support_address', '');

            await sendCommentNotification();
            assertFromAddress('"Example Site" <default@sendingdomain.com>');
        });

        it('[MEMBERS] send a comment reply notification from mail.from with member support address set as replyTo', async function () {
            mockSetting('members_support_address', 'hello@acme.com');

            await sendCommentNotification();
            assertFromAddress('"Example Site" <default@sendingdomain.com>', 'hello@acme.com');
        });

        it('[NEWSLETTER] Does not allow to send a newsletter from any email address (instead uses mail.from), but allow reply-to to be set', async function () {
            await configureNewsletter({
                sender_email: 'anything@possible.com',
                sender_name: 'Anything Possible',
                sender_reply_to: 'newsletter'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Anything Possible" <default@sendingdomain.com>', '"Anything Possible" <anything@possible.com>');
        });

        it('[NEWSLETTER] Does allow to set the replyTo address to any address', async function () {
            await configureNewsletter({
                sender_email: 'anything@possible.com',
                sender_name: 'Anything Possible',
                sender_reply_to: 'anything@possible.com'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Anything Possible" <default@sendingdomain.com>', 'anything@possible.com');
        });

        it('[NEWSLETTER] Can set the reply to to the support address', async function () {
            await configureNewsletter({
                sender_email: null,
                sender_name: 'Anything Possible',
                sender_reply_to: 'support'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Anything Possible" <default@sendingdomain.com>', 'support@address.com');
        });

        it('[NEWSLETTER] Uses site title as default sender name', async function () {
            await configureNewsletter({
                sender_email: null,
                sender_name: null,
                sender_reply_to: 'newsletter'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Example Site" <default@sendingdomain.com>');
        });
    });

    describe('Self-hosted', function () {
        beforeEach(async function () {
            configUtils.set('hostSettings:managedEmail:enabled', false);
            configUtils.set('hostSettings:managedEmail:sendingDomain', undefined);
            configUtils.set('mail:from', '"Default Address" <default@sendingdomain.com>');
        });

        it('[STAFF] sends recommendation emails from mail.from config variable', async function () {
            await sendRecommendationNotification();
            assertFromAddress('"Default Address" <default@sendingdomain.com>');
        });

        it('[STAFF] sends new member notification emails from mail.from config variable', async function () {
            await sendFreeMemberSignupNotification();
            assertFromAddress('"Default Address" <default@sendingdomain.com>');
        });

        it('[STAFF] Uses site title as email address name if no name set in mail:from', async function () {
            configUtils.set('mail:from', 'default@sendingdomain.com');
            await sendFreeMemberSignupNotification();
            assertFromAddress('"Example Site" <default@sendingdomain.com>');
        });

        it('[MEMBERS] send a comment reply notification with noreply support address', async function () {
            mockSetting('members_support_address', 'noreply');

            await sendCommentNotification();
            assertFromAddress('"Example Site" <noreply@blog.acme.com>');
        });

        it('[MEMBERS] send a comment reply notification without support address', async function () {
            mockSetting('members_support_address', '');

            await sendCommentNotification();

            // Use default
            assertFromAddress('"Default Address" <default@sendingdomain.com>');
        });

        it('[MEMBERS] send a comment reply notification from chosen support address', async function () {
            mockSetting('members_support_address', 'hello@acme.com');

            await sendCommentNotification();
            assertFromAddress('"Example Site" <hello@acme.com>');
        });

        it('[NEWSLETTER] Does allow to send a newsletter from any configured email address', async function () {
            await configureNewsletter({
                sender_email: 'anything@possible.com',
                sender_name: 'Anything Possible',
                sender_reply_to: 'newsletter'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Anything Possible" <anything@possible.com>', '"Anything Possible" <anything@possible.com>');
        });

        it('[NEWSLETTER] Does allow to set the replyTo address to any address', async function () {
            await configureNewsletter({
                sender_email: 'anything@possible.com',
                sender_name: 'Anything Possible',
                sender_reply_to: 'anything@noreply.com'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Anything Possible" <anything@possible.com>', 'anything@noreply.com');
        });

        it('[NEWSLETTER] Can set the reply to to the support address', async function () {
            await configureNewsletter({
                sender_email: null,
                sender_name: 'Anything Possible',
                sender_reply_to: 'support'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Anything Possible" <default@sendingdomain.com>', 'support@address.com');
        });

        it('[NEWSLETTER] Uses site title as default sender name', async function () {
            await configureNewsletter({
                sender_email: null,
                sender_name: null,
                sender_reply_to: 'newsletter'
            });
            await sendNewsletter();
            await assertFromAddressNewsletter('"Example Site" <default@sendingdomain.com>', '"Example Site" <default@sendingdomain.com>');
        });
    });
});
