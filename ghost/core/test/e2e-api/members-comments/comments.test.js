const assert = require('assert/strict');
const {agentProvider, mockManager, fixtureManager, matchers, configUtils} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyLocationFor, anyISODateTime, anyErrorId, anyUuid, anyNumber, anyBoolean} = matchers;
const should = require('should');
const models = require('../../../core/server/models');
const moment = require('moment-timezone');
const settingsCache = require('../../../core/shared/settings-cache');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');

let membersAgent, membersAgent2, postId, postTitle, commentId;

async function getPaidProduct() {
    return await models.Product.findOne({type: 'paid'});
}

const commentMatcher = {
    id: anyObjectId,
    created_at: anyISODateTime,
    member: {
        id: anyObjectId,
        uuid: anyUuid
    },
    count: {
        likes: anyNumber
    },
    liked: anyBoolean
};

/**
 * @param {Object} [options]
 * @param {number} [options.replies]
 * @returns
 */
function commentMatcherWithReplies(options = {replies: 0}) {
    return {
        id: anyObjectId,
        created_at: anyISODateTime,
        member: {
            id: anyObjectId,
            uuid: anyUuid
        },
        replies: new Array(options?.replies ?? 0).fill(commentMatcher),
        count: {
            likes: anyNumber,
            replies: anyNumber
        },
        liked: anyBoolean
    };
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function testCanCommentOnPost(member) {
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
            comments: [commentMatcher]
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
    await DomainEvents.allSettled();

    // Check last_updated_at changed?
    member = await models.Member.findOne({id: member.id});
    should.notEqual(member.get('last_seen_at'), null, 'The member should have a `last_seen_at` property after posting a comment.');

    // Check last_commented_at changed?
    should.notEqual(member.get('last_commented_at'), null, 'The member should have a `last_commented_at` property after posting a comment.');
}

async function testCanReply(member, emailMatchers = {}) {
    const date = new Date(0);
    await models.Member.edit({last_seen_at: date, last_commented_at: date}, {id: member.get('id')});

    await membersAgent
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
            comments: [commentMatcher]
        });

    mockManager.assert.sentEmailCount(2);
    mockManager.assert.sentEmail({
        subject: '💬 New comment on your post: ' + postTitle,
        to: fixtureManager.get('users', 0).email
    });

    mockManager.assert.sentEmail({
        ...emailMatchers,
        subject: '↪️ New reply to your comment on Ghost',
        to: fixtureManager.get('members', 0).email
    });

    // Wait for the dispatched events (because this happens async)
    await DomainEvents.allSettled();

    // Check last_updated_at changed?
    member = await models.Member.findOne({id: member.id});
    should.notEqual(member.get('last_seen_at').getTime(), date.getTime(), 'Should update `last_seen_at` property after posting a comment.');

    // Check last_commented_at changed?
    should.notEqual(member.get('last_commented_at').getTime(), date.getTime(), 'Should update `last_commented_at` property after posting a comment.');
}

async function testCannotCommentOnPost(status = 403) {
    await membersAgent
        .post(`/api/comments/`)
        .body({comments: [{
            post_id: postId,
            html: '<div></div><p></p><p>This is a <strong>message</strong></p><p></p><p></p><p>New line</p><p></p>'
        }]})
        .expectStatus(status)
        .matchHeaderSnapshot({
            etag: anyEtag
        })
        .matchBodySnapshot({
            errors: [{
                id: anyErrorId
            }]
        });
}

async function testCannotReply(status = 403) {
    await membersAgent
        .post(`/api/comments/`)
        .body({comments: [{
            post_id: postId,
            parent_id: fixtureManager.get('comments', 0).id,
            html: 'This is a reply'
        }]})
        .expectStatus(status)
        .matchHeaderSnapshot({
            etag: anyEtag
        })
        .matchBodySnapshot({
            errors: [{
                id: anyErrorId
            }]
        });
}

describe('Comments API', function () {
    let member;

    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();
        membersAgent2 = membersAgent.duplicate();

        await fixtureManager.init('posts', 'members', 'comments');

        postId = fixtureManager.get('posts', 0).id;
        postTitle = fixtureManager.get('posts', 0).title;
    });

    beforeEach(function () {
        mockManager.mockMail();
    });

    afterEach(async function () {
        await configUtils.restore();
        mockManager.restore();
    });

    describe('when commenting enabled for all', function () {
        describe('when not authenticated', function () {
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

            it('Can browse all comments of a post', async function () {
                await membersAgent
                    .get(`/api/comments/?filter=post_id:${postId}`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        comments: [commentMatcherWithReplies({replies: 1})]
                    });
            });

            it('cannot comment on a post', async function () {
                await testCannotCommentOnPost(401);
            });

            it('cannot reply on a post', async function () {
                await testCannotReply(401);
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

            it('cannot like a comment', async function () {
                // Create a temporary comment
                await membersAgent
                    .post(`/api/comments/${commentId}/like/`)
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

            it('cannot unlike a comment', async function () {
                // Create a temporary comment
                await membersAgent
                    .delete(`/api/comments/${commentId}/like/`)
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
            let getStub;

            before(async function () {
                await membersAgent.loginAs('member@example.com');
                member = await models.Member.findOne({email: 'member@example.com'}, {require: true});
                await membersAgent2.loginAs('member2@example.com');
            });

            beforeEach(function () {
                getStub = sinon.stub(settingsCache, 'get');
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
                await testCanCommentOnPost(member);
            });

            it('Can browse all comments of a post', async function () {
                await membersAgent
                    .get(`/api/comments/?filter=post_id:${postId}`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        comments: [commentMatcherWithReplies({replies: 1}), commentMatcher]
                    });
            });

            it('Can reply to your own comment', async function () {
                // Should not update last_seen_at or last_commented_at when both are already set to a value on the same day
                const timezone = settingsCache.get('timezone');
                const date = moment.utc(new Date()).tz(timezone).startOf('day').toDate();
                await models.Member.edit({last_seen_at: date, last_commented_at: date}, {id: member.get('id')});

                await membersAgent
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
                        comments: [commentMatcher]
                    });

                // Check only the author got an email (because we are the author of this parent comment)
                mockManager.assert.sentEmailCount(1);
                mockManager.assert.sentEmail({
                    subject: '💬 New comment on your post: ' + postTitle,
                    to: fixtureManager.get('users', 0).email
                });

                // Wait for the dispatched events (because this happens async)
                await DomainEvents.allSettled();

                // Check last updated_at is not changed?
                member = await models.Member.findOne({id: member.id});
                should.equal(member.get('last_seen_at').getTime(), date.getTime(), 'The member should not update `last_seen_at` if last seen at is same day');

                // Check last_commented_at changed?
                should.equal(member.get('last_commented_at').getTime(), date.getTime(), 'The member should not update `last_commented_at` f last seen at is same day');
            });

            it('Can reply to a comment', async function () {
                await testCanReply(member);
            });

            let testReplyId;
            it('Limits returned replies to 3', async function () {
                const parentId = fixtureManager.get('comments', 0).id;

                // Check initial status: two replies before test
                await membersAgent
                    .get(`/api/comments/${parentId}/`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        comments: [commentMatcherWithReplies({replies: 2})]
                    })
                    .expect(({body}) => {
                        body.comments[0].count.replies.should.eql(2);
                    });

                // Add some replies
                for (let index = 0; index < 3; index++) {
                    const {body: reply} = await membersAgent
                        .post(`/api/comments/`)
                        .body({comments: [{
                            post_id: postId,
                            parent_id: parentId,
                            html: 'This is a reply ' + index
                        }]})
                        .expectStatus(201)
                        .matchHeaderSnapshot({
                            etag: anyEtag,
                            location: anyLocationFor('comments')
                        })
                        .matchBodySnapshot({
                            comments: [commentMatcher]
                        });
                    if (index === 0) {
                        testReplyId = reply.comments[0].id;
                    }
                }

                // Check if we have count.replies = 4, and replies.length == 3
                await membersAgent
                    .get(`/api/comments/${parentId}/`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        comments: [commentMatcherWithReplies({replies: 3})]
                    })
                    .expect(({body}) => {
                        body.comments[0].count.replies.should.eql(5);
                    });
            });

            it('Can reply to a comment with www domain', async function () {
                // Test that the www. is stripped from the default
                configUtils.set('url', 'http://www.domain.example/');
                await testCanReply(member, {from: 'noreply@domain.example'});
            });

            it('Can reply to a comment with custom support email', async function () {
                // Test that the www. is stripped from the default
                getStub.callsFake((key, options) => {
                    if (key === 'members_support_address') {
                        return 'support@example.com';
                    }
                    if (key === 'comments_enabled') {
                        return 'all';
                    }
                    return getStub.wrappedMethod.call(settingsCache, key, options);
                });
                await testCanReply(member, {from: 'support@example.com'});
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
                        comments: new Array(1).fill(commentMatcherWithReplies({replies: 1}))
                    })
                    .expect(({body}) => {
                        body.comments[0].liked.should.eql(false);
                        body.comments[0].count.likes.should.eql(0);
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
                        comments: new Array(1).fill(commentMatcherWithReplies({replies: 1}))
                    })
                    .expect(({body}) => {
                        body.comments[0].liked.should.eql(true);
                        body.comments[0].count.likes.should.eql(1);
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

            it('Can like a reply', async function () {
                // Check initial status: two replies before test
                await membersAgent
                    .post(`/api/comments/${testReplyId}/like/`)
                    .expectStatus(204)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .expectEmptyBody();

                // Check liked
                await membersAgent
                    .get(`/api/comments/${testReplyId}/`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        comments: new Array(1).fill(commentMatcherWithReplies({replies: 0}))
                    })
                    .expect(({body}) => {
                        body.comments[0].liked.should.eql(true);
                        body.comments[0].count.likes.should.eql(1);
                    });
            });

            it('Can return replies', async function () {
                const parentId = fixtureManager.get('comments', 0).id;

                // Check initial status: two replies before test
                await membersAgent
                    .get(`/api/comments/${parentId}/replies/`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        comments: new Array(7).fill(commentMatcher)
                    })
                    .expect(({body}) => {
                        should(body.comments[0].count.replies).be.undefined();
                        should(body.meta.pagination.total).eql(7);
                        should(body.meta.pagination.next).eql(null);

                        // Check liked + likes working for replies too
                        should(body.comments[2].id).eql(testReplyId);
                        should(body.comments[2].count.likes).eql(1);
                        should(body.comments[2].liked).eql(true);
                    });
            });

            it('Can request last page of replies', async function () {
                const parentId = fixtureManager.get('comments', 0).id;

                // Check initial status: two replies before test
                await membersAgent
                    .get(`/api/comments/${parentId}/replies/?page=3&limit=3`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        comments: new Array(1).fill(commentMatcher)
                    })
                    .expect(({body}) => {
                        should(body.comments[0].count.replies).be.undefined();
                        should(body.meta.pagination.total).eql(7);
                        should(body.meta.pagination.next).eql(null);
                    });
            });

            it('Can remove a like (unlike)', async function () {
                // Unlike
                await membersAgent
                    .delete(`/api/comments/${commentId}/like/`)
                    .expectStatus(204)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .expectEmptyBody();

                // Check not liked
                await membersAgent
                    .get(`/api/comments/${commentId}/`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        comments: new Array(1).fill(commentMatcherWithReplies({replies: 1}))
                    })
                    .expect(({body}) => {
                        body.comments[0].liked.should.eql(false);
                        body.comments[0].count.likes.should.eql(0);
                    });
            });

            it('Cannot unlike a comment if it has not been liked', async function () {
                // Remove like
                await membersAgent
                    .delete(`/api/comments/${commentId}/like/`)
                    //.expectStatus(404)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        errors: [{
                            id: anyErrorId
                        }]
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
                            ...commentMatcherWithReplies({replies: 1}),
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
                            ...commentMatcherWithReplies({replies: 1}),
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

            it('Can fetch counts', async function () {
                const ids = [
                    fixtureManager.get('posts', 0).id,
                    fixtureManager.get('posts', 1).id,
                    fixtureManager.get('posts', 2).id
                ];
                await membersAgent
                    .get(`api/comments/counts/?ids=${ids.join(',')}`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot();
            });

            it('Can delete a comment, and it is redacted from', async function () {
                const {
                    body: {
                        comments: [{
                            id: commentToDeleteId
                        }]
                    }
                } = await membersAgent
                    .post(`/api/comments/`)
                    .body({comments: [{
                        post_id: postId,
                        html: 'Comment to delete'
                    }]});

                const {
                    body: {
                        comments: [deletedComment]
                    }
                } = await membersAgent
                    .put(`/api/comments/${commentToDeleteId}`)
                    .body({comments: [{
                        status: 'deleted'
                    }]});

                assert(!deletedComment.html);
            });
        });
    });

    describe('when commenting disabled', function () {
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

        it('Can not comment on a post', async function () {
            await membersAgent
                .post(`/api/comments/`)
                .body({comments: [{
                    post_id: postId,
                    html: '<p>This is a <strong>message</strong></p><p>New line</p>'
                }]})
                .expectStatus(405);
        });
    });

    describe('when paid only commenting', function () {
        beforeEach(async function () {
            const getStub = sinon.stub(settingsCache, 'get');
            getStub.callsFake((key, options) => {
                if (key === 'comments_enabled') {
                    return 'paid';
                }
                return getStub.wrappedMethod.call(settingsCache, key, options);
            });
        });

        afterEach(async function () {
            sinon.restore();
        });

        describe('Members with access', function () {
            before(async function () {
                await membersAgent.loginAs('paid@example.com');
                member = await models.Member.findOne({email: 'paid@example.com'}, {require: true});

                const product = await getPaidProduct();

                // Attach comped subscription to this member
                await models.Member.edit({
                    status: 'comped',
                    products: [
                        {
                            id: product.id
                        }
                    ]
                }, {id: member.id});
            });

            it('Can comment on a post', async function () {
                await testCanCommentOnPost(member);
            });

            it('Can reply to a comment', async function () {
                await testCanReply(member);
            });
        });

        describe('Members without access', function () {
            before(async function () {
                await membersAgent.loginAs('free@example.com');
            });

            it('Can not comment on a post', async function () {
                await testCannotCommentOnPost();
            });

            it('Can not reply to a comment', async function () {
                await testCannotReply();
            });
        });
    });

    // Only allow members with access to a given post to comment on that post
    describe('Tier-only posts', function () {
        let post;
        let product;

        before(async function () {
            product = await getPaidProduct();

            // Limit post access
            post = await models.Post.findOne({id: postId}, {require: true});

            await models.Post.edit({
                visibility: 'tiers',
                tiers: [
                    {
                        id: product.id
                    }
                ]
            }, {id: post.id});
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

        describe('Members with access', function () {
            before(async function () {
                await membersAgent.loginAs('member-premium@example.com');
                member = await models.Member.findOne({email: 'member-premium@example.com'}, {require: true});

                // Attach comped subscription to this member
                await models.Member.edit({
                    status: 'comped',
                    products: [
                        {
                            id: product.id
                        }
                    ]
                }, {id: member.id});
            });

            it('Can comment on a post', async function () {
                await testCanCommentOnPost(member);
            });

            it('Can reply to a comment', async function () {
                await testCanReply(member);
            });
        });

        describe('Members without access', function () {
            before(async function () {
                await membersAgent.loginAs('member-not-premium@example.com');
            });

            it('Can not comment on a post', async function () {
                await testCannotCommentOnPost();
            });

            it('Can not reply to a comment', async function () {
                await testCannotReply();
            });
        });
    });
});
