const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const sinon = require('sinon');
const assert = require('assert/strict');
const jobManager = require('../../../../core/server/services/jobs/job-service');
const configUtils = require('../../../utils/config-utils');
const ObjectId = require('bson-objectid').default;
const crypto = require('crypto');
const db = require('../../../../core/server/data/db');

describe('Domain Warming Integration Tests', function () {
    let agent;
    let clock;

    before(async function () {
        const agents = await agentProvider.getAgentsWithFrontend();
        agent = agents.adminAgent;

        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    // Helper: Create members with newsletter subscription using bulk insert for performance
    async function createMembers(count, prefix = 'warmup') {
        const newsletterId = fixtureManager.get('newsletters', 0).id;
        const now = new Date();

        // Prepare member data for bulk insert
        const memberRows = [];
        const newsletterRows = [];

        for (let i = 0; i < count; i++) {
            const memberId = ObjectId().toHexString();
            memberRows.push({
                id: memberId,
                uuid: crypto.randomUUID(),
                transient_id: crypto.randomUUID(),
                email: `member-${prefix}-${i}@example.com`,
                name: `Member ${prefix} ${i}`,
                status: 'free',
                email_disabled: false,
                enable_comment_notifications: true,
                email_count: 0,
                email_opened_count: 0,
                created_at: now,
                updated_at: now
            });
            newsletterRows.push({
                id: ObjectId().toHexString(),
                member_id: memberId,
                newsletter_id: newsletterId
            });
        }

        // Bulk insert members and newsletter subscriptions
        await db.knex.batchInsert('members', memberRows, 500);
        await db.knex.batchInsert('members_newsletters', newsletterRows, 500);
    }

    // Helper: Send a post as email and return the email model
    async function sendEmail(title) {
        const res = await agent.post('posts/')
            .body({posts: [{title, status: 'draft'}]})
            .expectStatus(201);

        const postId = res.body.posts[0].id;
        const newsletterSlug = fixtureManager.get('newsletters', 0).slug;
        const completedPromise = jobManager.awaitCompletion('batch-sending-service-job');

        await agent.put(`posts/${postId}/?newsletter=${newsletterSlug}`)
            .body({posts: [{status: 'published', updated_at: res.body.posts[0].updated_at}]})
            .expectStatus(200);

        await completedPromise;
        return await models.Email.findOne({post_id: postId});
    }

    // Helper: Set fake time to specific day
    // Uses a fixed base date to ensure consistent day progression
    const baseDate = new Date();
    baseDate.setHours(12, 0, 0, 0);

    function setDay(daysFromNow = 0) {
        if (clock) {
            clock.restore();
        }
        const time = new Date(baseDate.getTime());
        time.setDate(time.getDate() + daysFromNow);
        clock = sinon.useFakeTimers({
            now: time.getTime(),
            shouldAdvanceTime: true
        });
    }

    // Helper: Count recipients by domain type
    async function countRecipientsByDomain(emailId) {
        const batches = await models.EmailBatch.findAll({filter: `email_id:'${emailId}'`});
        let customDomainCount = 0;
        let fallbackDomainCount = 0;

        for (const batch of batches.models) {
            const recipients = await models.EmailRecipient.findAll({
                filter: `batch_id:'${batch.id}'`
            });

            if (batch.get('fallback_sending_domain') === false) {
                customDomainCount += recipients.models.length;
            } else {
                fallbackDomainCount += recipients.models.length;
            }
        }

        return {customDomainCount, fallbackDomainCount};
    }

    beforeEach(function () {
        mockManager.mockMail();
        mockManager.mockMailgun();
        mockManager.mockStripe();

        // Set required config values for domain warming
        configUtils.set('hostSettings:managedEmail:fallbackDomain', 'fallback.example.com');
        configUtils.set('hostSettings:managedEmail:fallbackAddress', 'noreply@fallback.example.com');
    });

    afterEach(async function () {
        if (clock) {
            clock.restore();
            clock = null;
        }

        mockManager.restore();
        await configUtils.restore();

        await jobManager.allSettled();

        // Clean up test data using bulk deletes for performance
        const patterns = ['warmup', 'day2', 'sameday', 'multi', 'limit', 'nowarmup', 'maxlimit', 'gap'];

        // Get member IDs first (needed for cascade delete of newsletter subscriptions)
        const memberIds = await db.knex('members')
            .where(function () {
                patterns.forEach((pattern, i) => {
                    const emailPattern = `member-${pattern}-%`;
                    if (i === 0) {
                        this.where('email', 'like', emailPattern);
                    } else {
                        this.orWhere('email', 'like', emailPattern);
                    }
                });
            })
            .pluck('id');

        if (memberIds.length > 0) {
            // Delete newsletter subscriptions first (foreign key)
            await db.knex('members_newsletters').whereIn('member_id', memberIds).del();
            // Delete members
            await db.knex('members').whereIn('id', memberIds).del();
        }

        // Delete emails and related data created during tests
        const postIds = await db.knex('posts')
            .where('title', 'like', 'Test Post%')
            .pluck('id');

        if (postIds.length > 0) {
            // Get email IDs for these posts
            const emailIds = await db.knex('emails')
                .whereIn('post_id', postIds)
                .pluck('id');

            if (emailIds.length > 0) {
                // Delete in correct order for foreign key constraints
                await db.knex('email_recipients').whereIn('email_id', emailIds).del();
                await db.knex('email_batches').whereIn('email_id', emailIds).del();
                await db.knex('emails').whereIn('id', emailIds).del();
            }

            // Delete posts (need to handle related tables)
            await db.knex('posts_authors').whereIn('post_id', postIds).del();
            await db.knex('posts_tags').whereIn('post_id', postIds).del();
            await db.knex('posts_meta').whereIn('post_id', postIds).del();
            await db.knex('mobiledoc_revisions').whereIn('post_id', postIds).del();
            await db.knex('post_revisions').whereIn('post_id', postIds).del();
            await db.knex('posts').whereIn('id', postIds).del();
        }
    });

    describe('Domain warming progression', function () {
        it('sends first email with warmup limit of 200 from custom domain', async function () {
            await createMembers(100);

            const email = await sendEmail('Test Post Day 1');
            const totalCount = email.get('email_count');
            const csdCount = email.get('csd_email_count');

            assert.ok(email);
            assert.equal(email.get('status'), 'submitted');
            assert.equal(totalCount, 104); // 100 new + 4 fixture members
            assert.equal(csdCount, totalCount); // All should use custom domain (104 < 200)

            const {customDomainCount, fallbackDomainCount} = await countRecipientsByDomain(email.id);
            assert.equal(customDomainCount, totalCount, 'All emails should use custom domain when total < warmup limit');
            assert.equal(fallbackDomainCount, 0, 'No emails should use fallback domain when total < warmup limit');

            assert.ok(mockManager.getMailgunCreateMessageStub().called);
        });

        it('increases custom domain limit on subsequent day', async function () {
            await createMembers(100, 'day2');

            const email1 = await sendEmail('Test Post Day 1 Second');
            const csdCount1 = email1.get('csd_email_count');
            assert.equal(csdCount1, email1.get('email_count')); // All emails use custom domain

            setDay(1); // Move to next day

            const email2 = await sendEmail('Test Post Day 2');
            const email2Count = email2.get('email_count');
            const csdCount2 = email2.get('csd_email_count');

            // Time-based warmup: limit = start * (end/start)^(day/(totalDays-1))
            // Day 1: 200 * (200000/200)^(1/41) ≈ 237
            const expectedLimit = Math.min(email2Count, 237);

            assert.equal(csdCount2, expectedLimit, 'Day 2 should use time-based warmup limit');

            const {customDomainCount} = await countRecipientsByDomain(email2.id);
            assert.equal(customDomainCount, expectedLimit, `Should send ${expectedLimit} emails from custom domain on day 2`);
        });

        it('does not increase limit when sending multiple emails on same day', async function () {
            await createMembers(100, 'sameday');

            const email1 = await sendEmail('Test Post Same Day 1');
            const csdCount1 = email1.get('csd_email_count');
            assert.ok(csdCount1 > 0, 'First email should send some via custom domain');

            const email2 = await sendEmail('Test Post Same Day 2');
            assert.equal(email2.get('csd_email_count'), csdCount1, 'CSD count should not increase on same day');
        });

        it('handles progression through multiple days correctly', async function () {
            await createMembers(500, 'multi');

            // Time-based warmup formula: start * (end/start)^(day/(totalDays-1))
            // With start=200, end=200000, totalDays=42

            // Day 0: Base limit of 200
            setDay(0);
            const email1 = await sendEmail('Test Post Multi Day 1');
            const csdCount1 = email1.get('csd_email_count');

            assert.ok(email1.get('email_count') >= 500, 'Day 0: Should have at least 500 recipients');
            assert.equal(csdCount1, 200, 'Day 0: Should use base limit of 200');

            // Day 1: 200 * (1000)^(1/41) ≈ 237
            setDay(1);
            const email2 = await sendEmail('Test Post Multi Day 2');
            const csdCount2 = email2.get('csd_email_count');

            assert.equal(csdCount2, 237, 'Day 1: Should scale to 237');

            // Day 2: 200 * (1000)^(2/41) ≈ 280
            setDay(2);
            const email3 = await sendEmail('Test Post Multi Day 3');
            const csdCount3 = email3.get('csd_email_count');

            assert.equal(csdCount3, 280, 'Day 2: Should scale to 280');
        });

        it('respects total email count when it is less than warmup limit', async function () {
            await createMembers(50, 'limit');

            const email = await sendEmail('Test Post Verify Limit');
            const totalCount = email.get('email_count');
            const csdCount = email.get('csd_email_count');

            assert.ok(totalCount > 0, 'Should have sent to some members');
            assert.ok(csdCount > 0, 'Should have sent some via custom domain');
            assert.ok(csdCount <= totalCount, `CSD count should be <= total count`);

            if (totalCount <= 200) {
                assert.equal(csdCount, totalCount, 'All emails should use custom domain when total < initial limit');
            }
        });

        it('does not warm up when fallback domain and address are not set', async function () {
            configUtils.set('hostSettings:managedEmail:fallbackDomain', null);
            configUtils.set('hostSettings:managedEmail:fallbackAddress', null);

            await createMembers(50, 'nowarmup');

            const email = await sendEmail('Test Post No Warmup');
            const totalCount = email.get('email_count');
            const csdCount = email.get('csd_email_count');

            assert.ok(totalCount > 0, 'Should have sent to some members');
            assert.ok(csdCount === null, `CSD count should be null`);

            const batches = await models.EmailBatch.findAll({filter: `email_id:'${email.id}'`});
            const fallbackValues = batches.models.map(b => b.get('fallback_sending_domain'));
            const uniqueValues = [...new Set(fallbackValues)];

            assert.equal(uniqueValues.length, 1, 'All batches should use same domain when warmup disabled');
            assert.equal(uniqueValues[0], false, 'All batches should use primary domain when warmup disabled');
        });

        it('handles maximum limit scenarios', async function () {
            if (process.env.NODE_ENV !== 'testing-mysql') {
                // This test fails on SQLite because of its small parameter limit
                return this.skip();
            }

            await createMembers(800, 'maxlimit');

            let previousCsdCount = 0;

            // Time-based warmup: limit = start * (end/start)^(day/(totalDays-1))
            // With start=200, end=200000, totalDays=42
            const getExpectedLimit = (day) => {
                const start = 200;
                const end = 200000;
                const totalDays = 42;
                return Math.round(start * Math.pow(end / start, day / (totalDays - 1)));
            };

            for (let day = 0; day < 5; day++) {
                setDay(day);

                const email = await sendEmail(`Test Post MaxLimit Day ${day + 1}`);
                const csdCount = email.get('csd_email_count');
                const totalCount = email.get('email_count');

                assert.ok(csdCount > 0, `Day ${day}: Should send via custom domain`);
                assert.ok(csdCount <= totalCount, `Day ${day}: CSD count should not exceed total`);

                const expectedLimit = Math.min(totalCount, getExpectedLimit(day));
                assert.equal(csdCount, expectedLimit, `Day ${day}: Should match time-based warmup limit`);

                if (previousCsdCount > 0) {
                    assert.ok(csdCount >= previousCsdCount, `Day ${day}: Should not decrease from previous day`);
                }

                previousCsdCount = csdCount;
            }
        });

        it('handles gaps in sending schedule', async function () {
            await createMembers(300, 'gap');

            setDay(0); // Day 1
            const email1 = await sendEmail('Test Post Gap Day 1');
            const csdCount1 = email1.get('csd_email_count');

            assert.ok(csdCount1 > 0, 'Day 1: Should send via custom domain');

            setDay(7); // Skip to day 8
            const email2 = await sendEmail('Test Post Gap Day 8');
            const csdCount2 = email2.get('csd_email_count');

            assert.ok(csdCount2 > 0, 'Day 8: Should send via custom domain');
            assert.ok(csdCount2 >= csdCount1, 'Warmup limit should not decrease after gap in sending');
        });
    });
});
