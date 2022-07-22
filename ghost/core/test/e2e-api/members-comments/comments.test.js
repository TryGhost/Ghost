const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyLocationFor, anyISODateTime, anyUuid, anyNumber, anyBoolean} = matchers;
const should = require('should');
const models = require('../../../core/server/models');

let membersAgent, member, postId, commentId;

const commentMatcherNoMember = {
    id: anyObjectId,
    created_at: anyISODateTime
};

const commentMatcher = {
    id: anyObjectId,
    created_at: anyISODateTime,
    member: {
        id: anyObjectId,
        uuid: anyUuid
    },
    likes_count: anyNumber,
    liked: anyBoolean
};

const commentMatcherWithReply = {
    id: anyObjectId,
    created_at: anyISODateTime,
    member: {
        id: anyObjectId,
        uuid: anyUuid
    },
    likes_count: anyNumber,
    liked: anyBoolean,
    replies: [commentMatcher]
};

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

describe('Comments API', function () {
    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();

        await fixtureManager.init('posts', 'members', 'comments');

        postId = fixtureManager.get('posts', 0).id;
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('when not authenticated', function () {
        it('Can browse all comments of a post', async function () {
            const {body} = await membersAgent
                .get(`/api/comments/?filter=post_id:${postId}`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    comments: [commentMatcherWithReply]
                });
        });

        it('cannot report a comment', async function () {
            commentId = fixtureManager.get('comments', 0).id;

            // Create a temporary comment
            await membersAgent
                .post(`/api/comments/${commentId}/report/`)
                .expectStatus(401)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyUuid
                    }]
                });
        });
    });

    describe('when authenticated', function () {
        before(async function () {
            await membersAgent.loginAs('member@example.com');
            member = await models.Member.findOne({email: 'member@example.com'}, {require: true});
        });

        it('Can comment on a post', async function () {
            const {body} = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    html: 'This is a message'
                }]})
                .expectStatus(201)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    location: anyLocationFor('comments')
                })
                .matchBodySnapshot({
                    comments: [commentMatcherNoMember]
                });
            // Save for other tests
            commentId = body.comments[0].id;

            // Wait for the emails (because this happens async)
            await sleep(100);
            
            // Check if author got an email
            mockManager.assert.sentEmailCount(1);
            mockManager.assert.sentEmail({
                subject: '💬 You have a new comment on one of your posts',
                to: fixtureManager.get('users', 0).email
            });
        });

        it('Can browse all comments of a post', async function () {
            const {body} = await membersAgent
                .get(`/api/comments/?filter=post_id:${postId}`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    comments: [commentMatcherWithReply, commentMatcher]
                });
        });

        it('Can reply to your own comment', async function () {
            const {body} = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    parent_id: commentId,
                    html: 'This is a reply'
                }]})
                .expectStatus(201)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    location: anyLocationFor('comments')
                })
                .matchBodySnapshot({
                    comments: [commentMatcherNoMember]
                });

            // Wait for the emails (because this happens async)
            await sleep(100);

            // Check only the author got an email (because we are the author of this parent comment)
            mockManager.assert.sentEmailCount(1);
            mockManager.assert.sentEmail({
                subject: '💬 You have a new comment on one of your posts',
                to: fixtureManager.get('users', 0).email
            });
        });

        it('Can reply to a comment', async function () {
            const {body} = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    parent_id: fixtureManager.get('comments', 0).id,
                    html: 'This is a reply'
                }]})
                .expectStatus(201)
                .matchHeaderSnapshot({
                    etag: anyEtag,
                    location: anyLocationFor('comments')
                })
                .matchBodySnapshot({
                    comments: [commentMatcherNoMember]
                });

            // Wait for the emails (because this happens async)
            await sleep(100);
            mockManager.assert.sentEmailCount(2);
            mockManager.assert.sentEmail({
                subject: '💬 You have a new comment on one of your posts',
                to: fixtureManager.get('users', 0).email
            });

            mockManager.assert.sentEmail({
                subject: '💬 You have a new reply on one of your comments',
                to: fixtureManager.get('members', 0).email
            });
        });

        it('Can like a comment', async function () {
            // Check not liked
            await membersAgent
                .get(`/api/comments/${commentId}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    comments: new Array(1).fill(commentMatcherWithReply)
                })
                .expect(({body}) => {
                    body.comments[0].liked.should.eql(false);
                });

            // Create a temporary comment
            await membersAgent
                .post(`/api/comments/${commentId}/like/`)
                .expectStatus(204)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .expectEmptyBody();

            // Check liked
            await membersAgent
                .get(`/api/comments/${commentId}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    comments: new Array(1).fill(commentMatcherWithReply)
                })
                .expect(({body}) => {
                    body.comments[0].liked.should.eql(true);
                });
        });

        it('Cannot like a comment multiple times', async function () {
            // Create a temporary comment
            await membersAgent
                .post(`/api/comments/${commentId}/like/`)
                .expectStatus(400)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        id: anyUuid
                    }]
                });
        });

        it('Can remove a like', async function () {
            // Create a temporary comment
            await membersAgent
                .delete(`/api/comments/${commentId}/like/`)
                .expectStatus(204)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .expectEmptyBody();

            // Check liked
            await membersAgent
                .get(`/api/comments/${commentId}/`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    comments: new Array(1).fill(commentMatcherWithReply)
                })
                .expect(({body}) => {
                    body.comments[0].liked.should.eql(false);
                });
        });

        it('Can report a comment', async function () {
            // Create a temporary comment
            await membersAgent
                .post(`/api/comments/${commentId}/report/`)
                .expectStatus(204)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .expectEmptyBody();

            // Check report
            const reports = await models.CommentReport.findAll({filter: 'comment_id:' + commentId});
            reports.models.length.should.eql(1);

            const report = reports.models[0];
            report.get('member_id').should.eql(member.id);

            mockManager.assert.sentEmail({
                subject: '🚩 A comment has been reported on your post',
                to: fixtureManager.get('users', 0).email
            });  
        });

        it('Cannot report a comment twice', async function () {
            // Create a temporary comment
            await membersAgent
                .post(`/api/comments/${commentId}/report/`)
                .expectStatus(204)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .expectEmptyBody();

            // Check report should be the same (no extra created)
            const reports = await models.CommentReport.findAll({filter: 'comment_id:' + commentId});
            reports.models.length.should.eql(1);

            const report = reports.models[0];
            report.get('member_id').should.eql(member.id);

            mockManager.assert.sentEmailCount(0);
        });
    });
});
