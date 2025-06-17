const should = require('should');
const {agentProvider, fixtureManager} = require('../../utils/e2e-framework');

describe('Admin API: Comments Add', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts', 'members');
        await agent.loginAsOwner();
    });

    it('Can add a comment as a member via Admin API', async function () {
        // Get a valid post ID from fixtures
        const postsResponse = await agent.get('posts/').expectStatus(200);
        const postId = postsResponse.body.posts[0].id;

        // Get a valid member ID from fixtures
        const membersResponse = await agent.get('members/').expectStatus(200);
        const memberId = membersResponse.body.members[0].id;

        const commentData = {
            post_id: postId,
            member_id: memberId,
            html: '<p>This is a test comment via Admin API</p>'
        };

        const response = await agent
            .post('comments/')
            .body({comments: [commentData]})
            .expectStatus(201);

        // Validate response structure
        should.exist(response.body.comments);
        response.body.comments.should.be.an.Array().with.lengthOf(1);
        
        const comment = response.body.comments[0];
        comment.should.have.property('id').which.is.a.String();
        comment.should.have.property('post_id', postId);
        comment.should.have.property('html', '<p>This is a test comment via Admin API</p>');
        comment.should.have.property('status', 'published');
        comment.should.have.property('member');
        comment.member.should.have.property('id', memberId);
    });

    it('Cannot add a comment without Admin API authentication', async function () {
        // Create an unauthenticated admin API agent
        const unauthenticatedAgent = await agentProvider.getAdminAPIAgent();
        // Don't login - this makes it unauthenticated
        
        const commentData = {
            post_id: 'some-post-id',
            member_id: 'some-member-id',
            html: '<p>Test comment</p>'
        };

        await unauthenticatedAgent
            .post('comments/')
            .body({comments: [commentData]})
            .expectStatus(401);
    });

    it('Returns validation error for missing required fields', async function () {
        const commentData = {
            // Missing post_id, member_id, and html
        };

        await agent
            .post('comments/')
            .body({comments: [commentData]})
            .expectStatus(422);
    });

    it('Returns error for non-existent post', async function () {
        // Get a valid member ID from fixtures
        const membersResponse = await agent.get('members/').expectStatus(200);
        const memberId = membersResponse.body.members[0].id;

        const commentData = {
            post_id: '000000000000000000000000', // Valid ObjectId format but non-existent
            member_id: memberId,
            html: '<p>Test comment</p>'
        };

        await agent
            .post('comments/')
            .body({comments: [commentData]})
            .expectStatus(404);
    });

    it('Returns error for non-existent member', async function () {
        // Get a valid post ID from fixtures
        const postsResponse = await agent.get('posts/').expectStatus(200);
        const postId = postsResponse.body.posts[0].id;

        const commentData = {
            post_id: postId,
            member_id: '000000000000000000000000', // Valid ObjectId format but non-existent
            html: '<p>Test comment</p>'
        };

        await agent
            .post('comments/')
            .body({comments: [commentData]})
            .expectStatus(404);
    });
}); 