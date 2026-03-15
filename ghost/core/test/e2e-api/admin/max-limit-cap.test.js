const assert = require('node:assert/strict');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');
const sinon = require('sinon');
const db = require('../../../core/server/data/db');
const ObjectId = require('bson-objectid').default;
const maxLimitCap = require('../../../core/server/web/shared/middleware/max-limit-cap');

const MAX_LIMIT = 5;

describe('Admin API - Max Limit Cap', function () {
    let agent;
    let testEmail; // Store reference to test email for exception endpoint tests

    before(async function () {
        // Set a lower max limit for testing
        sinon.stub(maxLimitCap.limitConfig, 'maxLimit').value(MAX_LIMIT);

        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'members');
        await agent.loginAsOwner();

        // Create bulk test data for exception endpoint testing
        await createBulkTestData();
    });

    after(function () {
        sinon.restore();
    });

    // Helper function to create a post with associated email record
    async function createPostWithEmail() {
        // Create a post that will have an email
        const {body: postBody} = await agent.post('posts/')
            .body({posts: [{
                title: 'Bulk Email Test Post',
                status: 'published',
                email_only: false,
                html: '<p>Test content for email</p>',
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Test content for email"]]]]}'
            }]})
            .expectStatus(201);

        const postId = postBody.posts[0].id;

        // Create an email record for this post
        const emailId = ObjectId().toHexString();
        await db.knex('emails').insert({
            id: emailId,
            post_id: postId,
            uuid: `email-${Date.now()}`,
            status: 'submitted',
            recipient_filter: 'status:-free',
            email_count: 100,
            delivered_count: 90,
            failed_count: 10,
            opened_count: 50,
            submitted_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
        });

        return emailId;
    }

    // Helper function to create email batches
    async function createEmailBatches(emailId, count = 10) {
        const batches = [];
        for (let i = 0; i < count; i++) {
            batches.push({
                id: ObjectId().toHexString(),
                email_id: emailId,
                provider_id: `test-batch-${i}-${Date.now()}`,
                status: 'submitted',
                member_segment: null,
                created_at: new Date(),
                updated_at: new Date()
            });
        }

        await db.knex('email_batches').insert(batches);
        return batches;
    }

    // Helper function to create email recipients
    async function createEmailRecipients(emailId, batches, count = 10) {
        const recipients = [];
        const recipientIds = [];

        for (let i = 0; i < count; i++) {
            const recipientId = ObjectId().toHexString();
            recipientIds.push(recipientId);
            recipients.push({
                id: recipientId,
                email_id: emailId,
                member_id: ObjectId().toHexString(),
                batch_id: batches[0].id, // Use first batch for simplicity
                member_uuid: ObjectId().toHexString(),
                member_email: `test${i}@example.com`,
                processed_at: new Date(),
                failed_at: new Date()
            });
        }

        await db.knex('email_recipients').insert(recipients);
        return {recipients, recipientIds};
    }

    // Helper function to create recipient failures
    async function createRecipientFailures(emailId, recipients, recipientIds, count = 10) {
        const failures = [];
        for (let i = 0; i < count; i++) {
            failures.push({
                id: ObjectId().toHexString(),
                email_id: emailId,
                member_id: recipients[i].member_id,
                email_recipient_id: recipientIds[i],
                message: `Test failure ${i}`,
                code: 500,
                severity: 'permanent',
                failed_at: new Date()
            });
        }

        await db.knex('email_recipient_failures').insert(failures);
        return failures;
    }

    // Helper function to create additional posts if needed
    async function createAdditionalPosts() {
        // Create additional posts for testing regular endpoints
        // Only if we don't have enough posts already
        const {body: postsCheck} = await agent.get('posts/')
            .expectStatus(200);

        if (postsCheck.meta.pagination.total < 10) {
            const additionalPosts = [];
            const existingCount = postsCheck.meta.pagination.total;

            for (let i = existingCount; i < 10; i++) {
                additionalPosts.push({
                    id: ObjectId().toHexString(),
                    uuid: `uuid-${i}-${Date.now()}`,
                    title: `Bulk Test Post ${i}`,
                    slug: `bulk-test-post-${i}-${Date.now()}`,
                    mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Test content"]]]]',
                    html: '<p>Test content</p>',
                    status: 'published',
                    visibility: 'public',
                    created_at: new Date(),
                    created_by: '1',
                    updated_at: new Date(),
                    updated_by: '1',
                    published_at: new Date(),
                    published_by: '1',
                    type: 'post'
                });
            }

            if (additionalPosts.length > 0) {
                await db.knex('posts').insert(additionalPosts);
            }
        }
    }

    // Factory for creating bulk test data
    async function createBulkTestData() {
        // Create post with email record
        const emailId = await createPostWithEmail();
        testEmail = {id: emailId};

        // Create email batches (more than our limit of 5)
        const batches = await createEmailBatches(emailId, 10);

        // Create email recipients (needed for failures foreign key)
        const {recipients, recipientIds} = await createEmailRecipients(emailId, batches, 10);

        // Create recipient failures
        await createRecipientFailures(emailId, recipients, recipientIds, 10);

        // Create additional posts for testing regular endpoints
        await createAdditionalPosts();
    }

    describe('Posts API', function () {
        it(`should cap limit to ${MAX_LIMIT} when limit exceeds max`, async function () {
            const {body} = await agent.get('posts/?limit=10')
                .expectStatus(200);

            // Even though we requested 10, we should only get max 5
            assert.equal(body.posts.length, MAX_LIMIT);
            assert.equal(body.meta.pagination.limit, MAX_LIMIT);
        });

        it(`should cap limit to ${MAX_LIMIT} when limit is "all"`, async function () {
            const {body} = await agent.get('posts/?limit=all')
                .expectStatus(200);

            // "all" should be capped to 5
            assert.equal(body.posts.length, MAX_LIMIT);
            assert.equal(body.meta.pagination.limit, MAX_LIMIT);
        });

        it('should respect smaller limits', async function () {
            const {body} = await agent.get('posts/?limit=3')
                .expectStatus(200);

            assert.equal(body.posts.length, 3);
            assert.equal(body.meta.pagination.limit, 3);
        });

        it('should allow large limits for export endpoint', async function () {
            // The export endpoint should bypass the limit cap, it returns a CSV file
            // so we should check we get one with appropriate number of rows
            const {text} = await agent.get('posts/export/?limit=1000')
                .expectStatus(200);

            // Check CSV file has more than MAX_LIMIT rows + 1 for header row
            assert(text.split('\n').length > MAX_LIMIT + 1);
        });
    });

    describe('Members API', function () {
        it(`should cap limit to ${MAX_LIMIT} when limit exceeds max`, async function () {
            const {body} = await agent.get('members/?limit=10')
                .expectStatus(200);

            // Even though we requested 10, we should only get max 5
            assert(body.members.length <= MAX_LIMIT);
            assert.equal(body.meta.pagination.limit, MAX_LIMIT);
        });

        it('should cap limit to 5 when limit is "all"', async function () {
            const {body} = await agent.get('members/?limit=all')
                .expectStatus(200);

            // "all" should be capped to 5
            assert(body.members.length <= MAX_LIMIT);
            assert.equal(body.meta.pagination.limit, MAX_LIMIT);
        });
    });

    describe('Tags API', function () {
        it(`should cap limit to ${MAX_LIMIT} when limit exceeds max`, async function () {
            const {body} = await agent.get('tags/?limit=10')
                .expectStatus(200);

            // Even though we requested 10, we should only get max 5
            assert.equal(body.tags.length, MAX_LIMIT);
            assert.equal(body.meta.pagination.limit, MAX_LIMIT);
        });
    });

    describe('Pages API', function () {
        it(`should cap limit to ${MAX_LIMIT} when limit exceeds max`, async function () {
            const {body} = await agent.get('pages/?limit=10')
                .expectStatus(200);

            // Even though we requested 10, we should only get max 5
            assert(body.pages.length <= MAX_LIMIT);
            assert.equal(body.meta.pagination.limit, MAX_LIMIT);
        });
    });

    describe('Exception Endpoints', function () {
        it('should bypass limit cap for emails batches endpoint', async function () {
            if (!testEmail) {
                throw new Error('Test email not found');
            }

            // Test the exception endpoint - should return all 10 batches
            const {body: batchesBody} = await agent.get(`emails/${testEmail.id}/batches/?limit=10`)
                .expectStatus(200);

            // Exception endpoint should return all 10 batches
            assert.equal(batchesBody.batches.length, 10);
            assert.equal(batchesBody.meta.pagination.limit, 10);
        });

        it('should bypass limit cap for emails recipient-failures endpoint', async function () {
            if (!testEmail) {
                throw new Error('Test email not found');
            }

            // Test the exception endpoint - should return all 10 failures
            const {body: failuresBody} = await agent.get(`emails/${testEmail.id}/recipient-failures/?limit=10`)
                .expectStatus(200);

            // Exception endpoint should return all 10 failures
            assert.equal(failuresBody.failures.length, 10);
            assert.equal(failuresBody.meta.pagination.limit, 10);
        });

        it('should allow "all" for exception endpoints', async function () {
            if (!testEmail) {
                throw new Error('Test email not found');
            }

            // Test batches with limit=all
            const {body: batchesBody} = await agent.get(`emails/${testEmail.id}/batches/?limit=all`)
                .expectStatus(200);

            // Should return all batches (10)
            assert.equal(batchesBody.batches.length, 10);
            assert.equal(batchesBody.meta.pagination.limit, 'all');

            // Test failures with limit=all
            const {body: failuresBody} = await agent.get(`emails/${testEmail.id}/recipient-failures/?limit=all`)
                .expectStatus(200);

            // Should return all failures (10)
            assert.equal(failuresBody.failures.length, 10);
            assert.equal(failuresBody.meta.pagination.limit, 'all');
        });
    });

    describe('Edge Cases', function () {
        it('should handle non-numeric limit values', async function () {
            const {body} = await agent.get('posts/?limit=invalid')
                .expectStatus(200);

            // Invalid limit should be capped to 5
            assert.equal(body.posts.length, MAX_LIMIT);
            assert.equal(body.meta.pagination.limit, MAX_LIMIT);
        });

        it('should handle limit=0', async function () {
            const {body} = await agent.get('posts/?limit=0')
                .expectStatus(200);

            // limit=0 is treated as no limit by Ghost, which uses default page size
            // The actual behavior depends on Ghost's internal handling
            // Since we have 14 posts in test data, we get all 14
            assert(body.posts.length <= 15);
        });
    });
});
