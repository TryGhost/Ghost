const {assertMatchSnapshot} = require('../../utils/assertions');
const {agentProvider, fixtureManager, mockManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, stringMatching} = matchers;
const models = require('../../../core/server/models');
const escapeRegExp = require('lodash/escapeRegExp');

function testCleanedSnapshot(text, ignoreReplacements) {
    for (const {match, replacement} of ignoreReplacements) {
        if (match instanceof RegExp) {
            text = text.replace(match, replacement);
        } else {
            text = text.replace(new RegExp(escapeRegExp(match), 'g'), replacement);
        }
    }
    assertMatchSnapshot({text});
}

const csvReplacements = [
    {
        match: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z/g,
        replacement: '2050-01-01T00:00:00.000Z'
    },
    {
        // Normalize ObjectIds (24-char hex) at the start of each CSV row
        match: /^[a-f0-9]{24},/gm,
        replacement: '000000000000000000000000,'
    }
];

const matchExportHeaders = {
    'content-version': anyContentVersion,
    etag: anyEtag,
    'content-disposition': stringMatching(/^Attachment; filename="post-analytics.\d{4}-\d{2}-\d{2}.csv"$/)
};

describe('Post Analytics Export', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        // Load fixtures: posts, newsletters, members (with stripe), emails, redirects, clicks, feedback
        await fixtureManager.init('posts', 'newsletters', 'members:newsletters', 'members:emails', 'redirects', 'clicks', 'feedback');
        await agent.loginAsOwner();

        // --- Enrich fixture data for comprehensive export coverage ---

        // 1. Enable feedback on the first newsletter
        const newsletters = await models.Newsletter.findAll();
        const firstNewsletter = newsletters.models[0];
        const secondNewsletter = newsletters.models[1];
        await models.Newsletter.edit({feedback_enabled: true}, {id: firstNewsletter.id});

        // 2. Update existing email fixtures to have rich analytics data
        // Email[0] is linked to posts[0] (HTML Ipsum), Email[1] is linked to posts[1] (Ghostly Kitchen Sink)
        const emails = await models.Email.findAll();
        if (emails.models.length >= 1) {
            await models.Email.edit({
                email_count: 256,
                delivered_count: 240,
                opened_count: 180,
                track_opens: true,
                track_clicks: true,
                feedback_enabled: true,
                newsletter_id: firstNewsletter.id,
                status: 'submitted',
                recipient_filter: 'all'
            }, {id: emails.models[0].id});
        }
        if (emails.models.length >= 2) {
            await models.Email.edit({
                email_count: 128,
                delivered_count: 120,
                opened_count: 90,
                track_opens: true,
                track_clicks: true,
                feedback_enabled: true,
                newsletter_id: secondNewsletter.id,
                status: 'submitted',
                recipient_filter: 'status:-free'
            }, {id: emails.models[1].id});
        }

        // 3. Create a members-only post
        // Use explicit published_at dates far in the future to ensure deterministic
        // ordering relative to fixture posts (which use now + index seconds)
        await models.Post.add({
            title: 'Members Only Post',
            status: 'published',
            visibility: 'members',
            published_at: new Date('2099-01-03T00:00:00.000Z'),
            lexical: JSON.stringify({root: {children: [{children: [{detail: 0, format: 0, mode: 'normal', style: '', text: 'Members only content', type: 'text', version: 1}], direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1}], direction: 'ltr', format: '', indent: 0, type: 'root', version: 1}})
        }, {context: {internal: true}});

        // 4. Create a tiers-specific post
        const allProducts = await models.Product.findAll();
        const paidTier = allProducts.models.find(p => p.get('type') === 'paid');
        const tiersPost = await models.Post.add({
            title: 'Premium Tier Post',
            status: 'published',
            visibility: 'tiers',
            published_at: new Date('2099-01-02T00:00:00.000Z'),
            lexical: JSON.stringify({root: {children: [{children: [{detail: 0, format: 0, mode: 'normal', style: '', text: 'Premium content', type: 'text', version: 1}], direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1}], direction: 'ltr', format: '', indent: 0, type: 'root', version: 1}})
        }, {context: {internal: true}});
        if (paidTier) {
            // Attach tier to the post
            await models.Base.knex.raw(
                'INSERT INTO posts_products (id, post_id, product_id, sort_order) VALUES (?, ?, ?, ?)',
                [require('bson-objectid').default().toHexString(), tiersPost.id, paidTier.id, 0]
            );
        }

        // 5. Create a sent-only (email-only) post with an email
        const sentPost = await models.Post.add({
            title: 'Email Only Post',
            status: 'sent',
            visibility: 'public',
            published_at: new Date('2099-01-01T00:00:00.000Z'),
            lexical: JSON.stringify({root: {children: [{children: [{detail: 0, format: 0, mode: 'normal', style: '', text: 'Email only content', type: 'text', version: 1}], direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1}], direction: 'ltr', format: '', indent: 0, type: 'root', version: 1}})
        }, {context: {internal: true}});

        await models.Email.add({
            post_id: sentPost.id,
            uuid: require('crypto').randomUUID(),
            status: 'submitted',
            email_count: 64,
            delivered_count: 60,
            opened_count: 45,
            track_opens: true,
            track_clicks: true,
            feedback_enabled: true,
            newsletter_id: firstNewsletter.id,
            recipient_filter: 'status:free',
            subject: 'Email Only Post',
            html: '<p>Email only content</p>',
            plaintext: 'Email only content',
            submitted_at: new Date()
        }, {context: {internal: true}});

        // 6. Create member signup attribution events for existing posts
        const members = await models.Member.findAll({limit: 5});
        const post0 = fixtureManager.get('posts', 0);
        const post1 = fixtureManager.get('posts', 1);

        // Add extra signups attributed to post[0] and post[1]
        for (let i = 0; i < 3; i++) {
            if (members.models[i]) {
                await models.MemberCreatedEvent.add({
                    member_id: members.models[i].id,
                    source: 'member',
                    attribution_type: 'post',
                    attribution_id: post0.id,
                    attribution_url: '/' + post0.slug,
                    created_at: new Date()
                }, {context: {internal: true}});
            }
        }

        // 7. Add paid conversion events attributed to post[1]
        // Find a subscription to reference
        const subscriptions = await models.Base.knex('members_stripe_customers_subscriptions').select('id', 'customer_id').limit(2);
        if (subscriptions.length > 0) {
            await models.SubscriptionCreatedEvent.add({
                member_id: members.models[0].id,
                subscription_id: subscriptions[0].id,
                attribution_type: 'post',
                attribution_id: post1.id,
                attribution_url: '/' + post1.slug,
                created_at: new Date()
            }, {context: {internal: true}});
        }
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('Default settings (all features enabled)', function () {
        it('Exports CSV with full analytics data', async function () {
            const {text} = await agent.get('posts/export')
                .expectStatus(200)
                .matchHeaderSnapshot(matchExportHeaders);

            testCleanedSnapshot(text, csvReplacements);
        });
    });

    describe('Settings variations', function () {
        afterEach(function () {
            mockManager.restore();
        });

        it('Hides email columns when members disabled', async function () {
            mockManager.mockSetting('members_signup_access', 'none');

            const {text} = await agent.get('posts/export')
                .expectStatus(200)
                .matchHeaderSnapshot(matchExportHeaders);

            testCleanedSnapshot(text, csvReplacements);
        });

        it('Hides clicks column when email_track_clicks disabled', async function () {
            mockManager.mockSetting('email_track_clicks', false);

            const {text} = await agent.get('posts/export')
                .expectStatus(200)
                .matchHeaderSnapshot(matchExportHeaders);

            testCleanedSnapshot(text, csvReplacements);
        });

        it('Hides opens column when email_track_opens disabled', async function () {
            mockManager.mockSetting('email_track_opens', false);

            const {text} = await agent.get('posts/export')
                .expectStatus(200)
                .matchHeaderSnapshot(matchExportHeaders);

            testCleanedSnapshot(text, csvReplacements);
        });

        it('Hides feedback columns when no newsletter has feedback enabled', async function () {
            // Disable feedback on all newsletters
            const newsletters = await models.Newsletter.findAll();
            const originalFeedbackStates = [];
            for (const newsletter of newsletters.models) {
                originalFeedbackStates.push({
                    id: newsletter.id,
                    feedback_enabled: newsletter.get('feedback_enabled')
                });
                await models.Newsletter.edit({feedback_enabled: false}, {id: newsletter.id});
            }

            try {
                const {text} = await agent.get('posts/export')
                    .expectStatus(200)
                    .matchHeaderSnapshot(matchExportHeaders);

                testCleanedSnapshot(text, csvReplacements);
            } finally {
                // Restore feedback states
                for (const state of originalFeedbackStates) {
                    await models.Newsletter.edit({feedback_enabled: state.feedback_enabled}, {id: state.id});
                }
            }
        });

        it('Hides paid_conversions when paid members disabled', async function () {
            // Disable Stripe by clearing connect keys
            mockManager.mockSetting('stripe_connect_secret_key', null);
            mockManager.mockSetting('stripe_connect_publishable_key', null);
            mockManager.mockSetting('stripe_secret_key', null);
            mockManager.mockSetting('stripe_publishable_key', null);

            const {text} = await agent.get('posts/export')
                .expectStatus(200)
                .matchHeaderSnapshot(matchExportHeaders);

            testCleanedSnapshot(text, csvReplacements);
        });

        it('Hides signups and paid_conversions when members_track_sources disabled', async function () {
            mockManager.mockSetting('members_track_sources', false);

            const {text} = await agent.get('posts/export')
                .expectStatus(200)
                .matchHeaderSnapshot(matchExportHeaders);

            testCleanedSnapshot(text, csvReplacements);
        });
    });
});
