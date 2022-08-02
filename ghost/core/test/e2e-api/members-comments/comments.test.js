const assert = require('assert');
const {agentProvider, mockManager, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyLocationFor, anyISODateTime, anyUuid, anyNumber, anyBoolean} = matchers;
const should = require('should');
const models = require('../../../core/server/models');
const moment = require('moment-timezone');
const settingsCache = require('../../../core/shared/settings-cache');
const sinon = require('sinon');

let membersAgent, membersAgent2, member, postId, postTitle, commentId;

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

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('Comments API', function () {
    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();
        membersAgent2 = await agentProvider.getMembersAPIAgent();

        await fixtureManager.init('posts', 'members', 'comments');

        postId = fixtureManager.get('posts', 0).id;
        postTitle = fixtureManager.get('posts', 0).title;
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    describe('when not authenticated but enabled', function () {
        beforeEach(function () {
            const getStub = sinon.stub(settingsCache, 'get');
            getStub.callsFake((key, options) => {
                if (key === 'comments_enabled') {
                    return 'all';
                }
                return getStub.wrappedMethod.call(settingsCache, key, options);
            });
        });

        after(async function () {
            sinon.restore();
        });

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

    describe('when not enabled', function () {
        beforeEach(async function () {
            await membersAgent.loginAs('member@example.com');
            const getStub = sinon.stub(settingsCache, 'get');
            getStub.callsFake((key, options) => {
                if (key === 'comments_enabled') {
                    return 'off';
                }
                return getStub.wrappedMethod.call(settingsCache, key, options);
            });
        });

        afterEach(async function () {
            sinon.restore();
        });

        it('Can comment on a post', async function () {
            const {body} = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    html: '<p>This is a <strong>message</strong></p><p>New line</p>'
                }]})
                .expectStatus(405);
        });
    });

    describe('when authenticated', function () {
        before(async function () {
            await membersAgent.loginAs('member@example.com');
            member = await models.Member.findOne({email: 'member@example.com'}, {require: true});
            await membersAgent2.loginAs('member2@example.com');
        });
        beforeEach(function () {
            const getStub = sinon.stub(settingsCache, 'get');
            getStub.callsFake((key, options) => {
                if (key === 'comments_enabled') {
                    return 'all';
                }
                return getStub.wrappedMethod.call(settingsCache, key, options);
            });
        });

        afterEach(async function () {
            sinon.restore();
        });

        it('Can comment on a post', async function () {
            await models.Member.edit({last_seen_at: null, last_commented_at: null}, {id: member.get('id')});

            const {body} = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    html: '<div></div><p></p><p>This is a <strong>message</strong></p><p></p><p></p><p>New line</p><p></p>'
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

            // Check if author got an email
            mockManager.assert.sentEmailCount(1);
            mockManager.assert.sentEmail({
                subject: '💬 New comment on your post: ' + postTitle,
                to: fixtureManager.get('users', 0).email,
                // Note that the <strong> tag is removed by the sanitizer
                html: new RegExp(escapeRegExp('<p>This is a message</p><p></p><p>New line</p>'))
            });

            // Wait for the dispatched events (because this happens async)
            await sleep(200);

            // Check last_updated_at changed?
            member = await models.Member.findOne({id: member.id});
            should.notEqual(member.get('last_seen_at'), null, 'The member should have a `last_seen_at` property after posting a comment.');

            // Check last_commented_at changed?
            should.notEqual(member.get('last_commented_at'), null, 'The member should have a `last_commented_at` property after posting a comment.');
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
            // Should not update last_seen_at or last_commented_at when both are already set to a value on the same day
            const timezone = settingsCache.get('timezone');
            const date = moment.utc(new Date()).tz(timezone).startOf('day').toDate();
            await models.Member.edit({last_seen_at: date, last_commented_at: date}, {id: member.get('id')});

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

            // Check only the author got an email (because we are the author of this parent comment)
            mockManager.assert.sentEmailCount(1);
            mockManager.assert.sentEmail({
                subject: '💬 New comment on your post: ' + postTitle,
                to: fixtureManager.get('users', 0).email
            });

            // Wait for the dispatched events (because this happens async)
            await sleep(200);

            // Check last updated_at is not changed?
            member = await models.Member.findOne({id: member.id});
            should.equal(member.get('last_seen_at').getTime(), date.getTime(), 'The member should not update `last_seen_at` if last seen at is same day');

            // Check last_commented_at changed?
            should.equal(member.get('last_commented_at').getTime(), date.getTime(), 'The member should not update `last_commented_at` f last seen at is same day');
        });

        it('Can reply to a comment', async function () {
            const date = new Date(0);
            await models.Member.edit({last_seen_at: date, last_commented_at: date}, {id: member.get('id')});

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

            mockManager.assert.sentEmailCount(2);
            mockManager.assert.sentEmail({
                subject: '💬 New comment on your post: ' + postTitle,
                to: fixtureManager.get('users', 0).email
            });

            mockManager.assert.sentEmail({
                subject: '↪️ New reply to your comment on Ghost',
                to: fixtureManager.get('members', 0).email
            });

            // Wait for the dispatched events (because this happens async)
            await sleep(250);

            // Check last_updated_at changed?
            member = await models.Member.findOne({id: member.id});
            should.notEqual(member.get('last_seen_at').getTime(), date.getTime(), 'Should update `last_seen_at` property after posting a comment.');

            // Check last_commented_at changed?
            should.notEqual(member.get('last_commented_at').getTime(), date.getTime(), 'Should update `last_commented_at` property after posting a comment.');
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
                to: fixtureManager.get('users', 0).email,
                html: new RegExp(escapeRegExp('<p>This is a message</p><p></p><p>New line</p>')),
                text: new RegExp(escapeRegExp('This is a message\n\nNew line'))
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

        it('Can edit a comment on a post', async function () {
            const {body} = await await membersAgent
                .put(`/api/comments/${commentId}`)
                .body({comments: [{
                    html: 'Updated comment'
                }]})
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    comments: [{
                        ...commentMatcherWithReply,
                        edited_at: anyISODateTime
                    }]
                });

            assert(body.comments[0].edited_at, 'The edited_at field should be populated');
        });

        it('Can not edit a comment post_id', async function () {
            const anotherPostId = fixtureManager.get('posts', 1).id;
            await membersAgent
                .put(`/api/comments/${commentId}`)
                .body({comments: [{
                    post_id: anotherPostId
                }]});

            const {body} = await membersAgent
                .get(`/api/comments/?filter=post_id:${anotherPostId}`);

            assert(!body.comments.find(comment => comment.id === commentId), 'The comment should not have moved post');
        });

        it('Can not edit a comment which does not belong to you', async function () {
            await membersAgent2
                .put(`/api/comments/${commentId}`)
                .body({comments: [{
                    html: 'Illegal comment update'
                }]})
                .expectStatus(403)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        type: 'NoPermissionError',
                        id: anyUuid
                    }]
                });
        });

        it('Can not edit a comment as a member who is not you', async function () {
            const memberId = fixtureManager.get('members', 1).id;
            await membersAgent
                .put(`/api/comments/${commentId}`)
                .body({comments: [{
                    html: 'Illegal comment update',
                    member_id: memberId
                }]});

            const {
                body: {
                    comments: [
                        comment
                    ]
                }
            } = await membersAgent.get(`/api/comments/${commentId}`)
                .expectStatus(200)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    comments: [{
                        ...commentMatcherWithReply,
                        edited_at: anyISODateTime
                    }]
                });

            assert(comment.member.id !== memberId);
        });

        it('Can not reply to a reply', async function () {
            const {
                body: {
                    comments: [{
                        id: parentId
                    }]
                }
            } = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    html: 'Parent'
                }]});

            const {
                body: {
                    comments: [{
                        id: replyId
                    }]
                }
            } = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    parent_id: parentId,
                    html: 'Reply'
                }]});

            await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    parent_id: replyId,
                    html: 'Reply to a reply!'
                }]})
                .expectStatus(400)
                .matchHeaderSnapshot({
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    errors: [{
                        type: 'BadRequestError',
                        id: anyUuid
                    }]
                });
        });

        it('Can not edit a replies parent', async function () {
            const {
                body: {
                    comments: [{
                        id: parentId
                    }]
                }
            } = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    html: 'Parent'
                }]});

            const {
                body: {
                    comments: [{
                        id: newParentId
                    }]
                }
            } = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    html: 'New Parent'
                }]});

            const {
                body: {
                    comments: [{
                        id: replyId
                    }]
                }
            } = await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    parent_id: parentId,
                    html: 'Reply'
                }]});

            // Attempt to edit the parent
            await membersAgent
                .put(`/api/comments/${replyId}/`)
                .body({comments: [{
                    parent_id: newParentId,
                    html: 'Changed parent'
                }]});

            const {body: {comments: [comment]}} = await membersAgent.get(`api/comments/${newParentId}`);

            assert(comment.replies.length === 0, 'The parent comment should not have changed');
        });
    });
});
