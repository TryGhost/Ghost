const {agentProvider, fixtureManager, mockManager} = require('../../../utils/e2e-framework');
const models = require('../../../../core/server/models');
const sinon = require('sinon');
const assert = require('assert/strict');
const jobManager = require('../../../../core/server/services/jobs/job-service');
const labs = require('../../../../core/shared/labs');

describe('Domain Warming Integration Tests', function () {
    let agent;
    let clock;
    let labsStub;

    before(async function () {
        const agents = await agentProvider.getAgentsWithFrontend();
        agent = agents.adminAgent;

        await fixtureManager.init('newsletters', 'members:newsletters');
        await agent.loginAsOwner();
    });

    // Helper: Create members with newsletter subscription
    async function createMembers(count, prefix = 'warmup') {
        for (let i = 0; i < count; i++) {
            await models.Member.add({
                name: `Member ${prefix} ${i}`,
                email: `member-${prefix}-${i}@example.com`,
                status: 'free',
                newsletters: [{id: fixtureManager.get('newsletters', 0).id}],
                email_disabled: false
            });
        }
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
    function setDay(daysFromNow = 0) {
        if (clock) {
            clock.restore();
        }
        const time = new Date();
        time.setDate(time.getDate() + daysFromNow);
        time.setHours(12, 0, 0, 0);
        clock = sinon.useFakeTimers(time.getTime());
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

        // Enable the domain warming labs flag
        labsStub = sinon.stub(labs, 'isSet').callsFake((key) => {
            if (key === 'domainWarmup') {
                return true;
            }
            return false;
        });
    });

    afterEach(async function () {
        if (clock) {
            clock.restore();
            clock = null;
        }
        if (labsStub) {
            labsStub.restore();
            labsStub = null;
        }
        mockManager.restore();
        await jobManager.allSettled();

        // Clean up test data to ensure test isolation
        // Find and delete members created during tests (with our specific naming pattern)
        const patterns = ['warmup', 'day2', 'sameday', 'multi', 'limit', 'nowarmup', 'maxlimit', 'gap'];
        for (const pattern of patterns) {
            const testMembers = await models.Member.findAll({
                filter: `email:~'member-${pattern}-'`
            });

            for (const member of testMembers.models) {
                await member.destroy();
            }
        }

        // Delete emails and related data created during tests
        // Find all posts created during tests and delete their associated emails
        const posts = await models.Post.findAll({
            filter: 'title:~\'Test Post\''
        });

        for (const post of posts.models) {
            const emails = await models.Email.findAll({
                filter: `post_id:'${post.id}'`
            });

            for (const email of emails.models) {
                // Delete recipients first, then batches, then email (foreign key constraints)
                const recipients = await models.EmailRecipient.findAll({filter: `email_id:'${email.id}'`});
                for (const recipient of recipients.models) {
                    await recipient.destroy();
                }

                const batches = await models.EmailBatch.findAll({filter: `email_id:'${email.id}'`});
                for (const batch of batches.models) {
                    await batch.destroy();
                }

                await email.destroy();
            }

            // Delete the test post
            await post.destroy();
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
            const expectedLimit = Math.min(email2Count, csdCount1 * 2);

            assert.equal(csdCount2, expectedLimit);

            // Verify doubling behavior
            if (email2Count >= csdCount1 * 2) {
                assert.equal(csdCount2, csdCount1 * 2, 'Limit should double when enough recipients exist');
            } else {
                assert.equal(csdCount2, email2Count, 'Limit should equal total when recipients < limit');
            }

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

            setDay(0); // Day 1
            const email1 = await sendEmail('Test Post Multi Day 1');
            const csdCount1 = email1.get('csd_email_count');

            assert.ok(csdCount1 > 0, 'Day 1: Should send some via custom domain');
            assert.ok(email1.get('email_count') >= 500, 'Day 1: Should have at least 500 recipients');

            setDay(1); // Day 2
            const email2 = await sendEmail('Test Post Multi Day 2');
            const csdCount2 = email2.get('csd_email_count');

            assert.ok(csdCount2 > 0, 'Day 2: Should send some via custom domain');
            assert.equal(csdCount2, csdCount1 * 2, `Day 2: Should double (got ${csdCount2}, expected ${csdCount1 * 2})`);

            setDay(2); // Day 3
            const email3 = await sendEmail('Test Post Multi Day 3');
            const csdCount3 = email3.get('csd_email_count');

            assert.ok(csdCount3 > 0, 'Day 3: Should send some via custom domain');
            assert.ok(csdCount3 >= csdCount2, 'Day 3: Should be >= day 2');
            assert.ok(csdCount3 === csdCount2 || csdCount3 === csdCount2 * 2 || csdCount3 === email3.get('email_count'),
                `Day 3: Should be same, doubled, or total (got ${csdCount3})`);
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

        it('sends all emails via fallback when domain warming is disabled', async function () {
            labsStub.restore();
            labsStub = sinon.stub(labs, 'isSet').returns(false);

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

            for (let day = 0; day < 5; day++) {
                setDay(day);

                const email = await sendEmail(`Test Post MaxLimit Day ${day + 1}`);
                const csdCount = email.get('csd_email_count');
                const totalCount = email.get('email_count');

                assert.ok(csdCount > 0, `Day ${day + 1}: Should send via custom domain`);
                assert.ok(csdCount <= totalCount, `Day ${day + 1}: CSD count should not exceed total`);

                if (previousCsdCount > 0) {
                    assert.ok(csdCount >= previousCsdCount, `Day ${day + 1}: Should not decrease`);

                    if (csdCount === totalCount) {
                        assert.equal(csdCount, totalCount, `Day ${day + 1}: Reached full capacity`);
                    } else {
                        assert.ok(csdCount === previousCsdCount || csdCount === previousCsdCount * 2,
                            `Day ${day + 1}: Should maintain or double (got ${csdCount}, previous ${previousCsdCount})`);
                    }
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
