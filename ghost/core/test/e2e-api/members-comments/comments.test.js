const assert = require('assert/strict');
const {agentProvider, mockManager, fixtureManager, matchers, configUtils, dbUtils} = require('../../utils/e2e-framework');
const {anyEtag, anyObjectId, anyLocationFor, anyISODateTime, anyErrorId, anyUuid, anyNumber, anyBoolean} = matchers;
const should = require('should');
const models = require('../../../core/server/models');
const moment = require('moment-timezone');
const settingsCache = require('../../../core/shared/settings-cache');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');

let membersAgent, membersAgent2, postId, postAuthorEmail, postTitle;

async function getPaidProduct() {
    return await models.Product.findOne({type: 'paid'});
}

const dbFns = {
    /**
     * @typedef {Object} AddCommentData
     * @property {string} [post_id=postId]
     * @property {string} member_id
     * @property {string} [parent_id]
     * @property {string} [html='This is a comment']
     */
    /**
     * @typedef {Object} AddCommentReplyData
     * @property {string} member_id
     * @property {string} [html='This is a reply']
     */
    /**
     * @typedef {AddCommentData & {replies: AddCommentReplyData[]}} AddCommentWithRepliesData
     */

    /**
     * @param {AddCommentData} data
     * @returns {Promise<any>}
     */
    addComment: async (data) => {
        return await models.Comment.add({
            post_id: data.post_id || postId,
            member_id: data.member_id,
            parent_id: data.parent_id,
            html: data.html || '<p>This is a comment</p>'
        });
    },
    /**
     * @param {AddCommentWithRepliesData}  data
     * @returns {Promise<any>}
     */
    addCommentWithReplies: async (data) => {
        const {replies, ...commentData} = data;

        const parent = await dbFns.addComment(commentData);
        const createdReplies = [];

        for (const reply of replies) {
            const createdReply = await dbFns.addComment({
                post_id: parent.get('post_id'),
                member_id: reply.member_id,
                parent_id: parent.get('id'),
                html: reply.html || '<p>This is a reply</p>'
            });
            createdReplies.push(createdReply);
        }

        return {parent, replies: createdReplies};
    },
    /**
     * @param {Object} data
     * @param {string} data.comment_id
     * @param {string} data.member_id
     * @returns {Promise<any>}
     */
    addLike: async (data) => {
        return await models.CommentLike.add({
            comment_id: data.comment_id,
            member_id: data.member_id
        });
    },
    /**
     * @param {Object} data
     * @param {string} data.comment_id
     * @param {string} data.member_id
     * @returns {Promise<any>}
     */
    addReport: async (data) => {
        return await models.CommentReport.add({
            comment_id: data.comment_id,
            member_id: data.member_id
        });
    }
};

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

/**
 * @param {string} method
 * @param {string} url
 * @param {number} status
 * @param {Array} [errors]
 * @returns {any} ExpectRequest
 */
function testBasicErrorResponse(method, url, status, errors) {
    if (!errors) {
        errors = [{id: anyUuid}];
    }

    return membersAgent[method](url)
        .expectStatus(status)
        .matchHeaderSnapshot({etag: anyEtag})
        .matchBodySnapshot({errors});
}

/**
 * @param {string} method
 * @param {string} url
 * @param {number} status
 * @returns {any} ExpectRequest
 */
function testBasicEmptyResponse(method, url, status) {
    return membersAgent[method](url)
        .expectStatus(status)
        .matchHeaderSnapshot({etag: anyEtag})
        .expectEmptyBody();
}

/**
 * @param {string} url
 * @param {Object} commentsMatcher
 */
function testGetComments(url, commentsMatcher) {
    return membersAgent
        .get(url)
        .expectStatus(200)
        .matchHeaderSnapshot({
            etag: anyEtag
        })
        .matchBodySnapshot({
            comments: commentsMatcher
        });
}

/**
 * @param {Object} data
 * @param {string} data.post_id
 * @param {string} data.html
 * @param {string} [data.parent_id]
 * @param {Object} [options]
 * @param {number} [options.status = 201]
 * @param {Object} [options.matchHeaderSnapshot]
 * @param {Object} [options.matchBodySnapshot]
 * @returns {any} ExpectRequest
 */
function testPostComment({post_id, html, parent_id}, {status = 201, matchHeaderSnapshot = {}, matchBodySnapshot} = {}) {
    return membersAgent
        .post(`/api/comments/`)
        .body({comments: [{
            post_id,
            parent_id,
            html
        }]})
        .expectStatus(status)
        .matchHeaderSnapshot({
            etag: anyEtag,
            location: anyLocationFor('comments'),
            ...matchHeaderSnapshot
        })
        .matchBodySnapshot({
            comments: [commentMatcher],
            ...matchBodySnapshot
        });
}

function assertAuthorEmailSent(email, title, extraAssertions = {}) {
    mockManager.assert.sentEmail({
        subject: '💬 New comment on your post: ' + title,
        to: email,
        ...extraAssertions
    });
}

async function testCanCommentOnPost(member) {
    await models.Member.edit({last_seen_at: null, last_commented_at: null}, {id: member.get('id')});

    await testPostComment({
        post_id: postId,
        html: '<div></div><p></p><p>This is a <strong>message</strong></p><p></p><p></p><p>New line</p><p></p>'
    });

    // Check if author got an email
    mockManager.assert.sentEmailCount(1);
    assertAuthorEmailSent(postAuthorEmail, postTitle, {
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
    const parentComment = await dbFns.addComment({
        member_id: fixtureManager.get('members', 2).id
    });

    const date = new Date(0);
    await models.Member.edit({last_seen_at: date, last_commented_at: date}, {id: member.get('id')});

    await testPostComment({
        post_id: postId,
        parent_id: parentComment.get('id'),
        html: 'This is a reply'
    }, {
        matchHeaderSnapshot: {
            'x-cache-invalidate': matchers.stringMatching(
                new RegExp('/api/members/comments/post/[0-9a-f]{24}/, /api/members/comments/[0-9a-f]{24}/replies/')
            )
        }
    });

    mockManager.assert.sentEmailCount(2);
    assertAuthorEmailSent(postAuthorEmail, postTitle);

    mockManager.assert.sentEmail({
        ...emailMatchers,
        subject: '↪️ New reply to your comment on Ghost',
        to: fixtureManager.get('members', 2).email
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

async function testCannotReply(parentId, status = 403) {
    await membersAgent
        .post(`/api/comments/`)
        .body({comments: [{
            post_id: postId,
            parent_id: parentId,
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
    let loggedInMember;

    before(async function () {
        membersAgent = await agentProvider.getMembersAPIAgent();
        membersAgent2 = membersAgent.duplicate();

        await fixtureManager.init('posts', 'members');

        postId = fixtureManager.get('posts', 0).id;
        postTitle = fixtureManager.get('posts', 0).title;
        postAuthorEmail = fixtureManager.get('users', 0).email;
    });

    beforeEach(async function () {
        mockManager.mockMail();

        // ensure we don't have data dependencies across tests
        await dbUtils.truncate('comments');
        await dbUtils.truncate('comment_likes');
        await dbUtils.truncate('comment_reports');
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

            async function setupBrowseCommentsData() {
                await dbFns.addCommentWithReplies({
                    member_id: fixtureManager.get('members', 0).id,
                    replies: [{
                        member_id: fixtureManager.get('members', 1).id
                    }]
                });
            }

            it('Can browse all comments of a post (legacy)', async function () {
                await setupBrowseCommentsData();
                await testGetComments(`/api/comments/?filter=post_id:'${postId}'`, [
                    commentMatcherWithReplies({replies: 1})
                ]);
            });

            it('Can browse all comments of a post', async function () {
                await setupBrowseCommentsData();
                await testGetComments(`/api/comments/post/${postId}/`, [
                    commentMatcherWithReplies({replies: 1})
                ]);
            });

            it('cannot comment on a post', async function () {
                await testCannotCommentOnPost(401);
            });

            it('cannot reply on a post', async function () {
                const comment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 0).id
                });
                await testCannotReply(comment.get('id'), 401);
            });

            it('cannot report a comment', async function () {
                const comment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id
                });

                await membersAgent
                    .post(`/api/comments/${comment.get('id')}/report/`)
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
                const comment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id
                });

                await testBasicErrorResponse('post', `/api/comments/${comment.get('id')}/like/`, 401);
            });

            it('cannot unlike a comment', async function () {
                const comment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id
                });
                await dbFns.addLike({
                    comment_id: comment.get('id'),
                    member_id: fixtureManager.get('members', 0).id
                });

                await testBasicErrorResponse('delete', `/api/comments/${comment.get('id')}/like/`, 401);
            });
        });

        describe('when authenticated', function () {
            let getStub;

            before(async function () {
                await membersAgent.loginAs('member@example.com');
                loggedInMember = await models.Member.findOne({email: 'member@example.com'}, {require: true});
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
                await testCanCommentOnPost(loggedInMember);
            });

            async function setupBrowseCommentsData() {
                await dbFns.addCommentWithReplies({
                    member_id: fixtureManager.get('members', 0).id,
                    replies: [{
                        member_id: fixtureManager.get('members', 1).id
                    }]
                });
                await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id
                });
            }

            it('Can browse all comments of a post (legacy)', async function () {
                await setupBrowseCommentsData();
                // uses explicit order to match db ordering
                await testGetComments(`/api/comments/?filter=post_id:'${postId}'&order=id%20ASC`, [
                    commentMatcherWithReplies({replies: 1}),
                    commentMatcher
                ]);
            });

            it('Can browse all comments of a post', async function () {
                await setupBrowseCommentsData();
                // uses explicit order to match db ordering
                await testGetComments(`/api/comments/post/${postId}/?order=id%20ASC`, [
                    commentMatcherWithReplies({replies: 1}),
                    commentMatcher
                ]);
            });

            it('Can browse all comments of a post with default order', async function () {
                await setupBrowseCommentsData();
                await testGetComments(`/api/comments/post/${postId}/`, [
                    commentMatcher,
                    commentMatcherWithReplies({replies: 1})
                ]);
            });

            it('Can reply to your own comment', async function () {
                // Should not update last_seen_at or last_commented_at when both are already set to a value on the same day
                const timezone = settingsCache.get('timezone');
                const date = moment.utc(new Date()).tz(timezone).startOf('day').toDate();
                await models.Member.edit({last_seen_at: date, last_commented_at: date}, {id: loggedInMember.get('id')});

                const parentComment = await dbFns.addComment({
                    member_id: loggedInMember.id
                });

                await testPostComment({
                    post_id: postId,
                    parent_id: parentComment.id,
                    html: 'This is a reply'
                }, {
                    matchHeaderSnapshot: {
                        'x-cache-invalidate': matchers.stringMatching(
                            new RegExp('/api/members/comments/post/[0-9a-f]{24}/, /api/members/comments/[0-9a-f]{24}/replies/')
                        )
                    }
                });

                // Check only the author got an email (because we are the author of this parent comment)
                mockManager.assert.sentEmailCount(1);
                assertAuthorEmailSent(postAuthorEmail, postTitle);

                // Wait for the dispatched events (because this happens async)
                await DomainEvents.allSettled();

                // Check last updated_at is not changed?
                loggedInMember = await models.Member.findOne({id: loggedInMember.id});
                should.equal(loggedInMember.get('last_seen_at').getTime(), date.getTime(), 'The member should not update `last_seen_at` if last seen at is same day');

                // Check last_commented_at changed?
                should.equal(loggedInMember.get('last_commented_at').getTime(), date.getTime(), 'The member should not update `last_commented_at` f last seen at is same day');
            });

            it('Can reply to a comment', async function () {
                await testCanReply(loggedInMember);
            });

            it('Limits returned replies to 3', async function () {
                const {parent} = await dbFns.addCommentWithReplies({
                    member_id: fixtureManager.get('members', 0).id,
                    replies: new Array(5).fill({
                        member_id: fixtureManager.get('members', 1).id
                    })
                });

                // Check if we have count.replies = 4, and replies.length == 3
                await testGetComments(`/api/comments/${parent.get('id')}/`, [commentMatcherWithReplies({replies: 3})])
                    .expect(({body}) => {
                        body.comments[0].count.replies.should.eql(5);
                    });
            });

            it('Can reply to a comment with www domain', async function () {
                // Test that the www. is stripped from the default
                configUtils.set('url', 'http://www.domain.example/');
                await testCanReply(loggedInMember, {from: '"Ghost" <noreply@domain.example>'});
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
                await testCanReply(loggedInMember, {from: '"Ghost" <support@example.com>'});
            });

            it('Can like a comment', async function () {
                const comment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id
                });

                // Like the comment
                await membersAgent
                    .post(`/api/comments/${comment.get('id')}/like/`)
                    .expectStatus(204)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .expectEmptyBody();

                // Check liked
                await testGetComments(`/api/comments/${comment.get('id')}/`, [commentMatcher])
                    .expect(({body}) => {
                        body.comments[0].liked.should.eql(true);
                        body.comments[0].count.likes.should.eql(1);
                    });
            });

            it('Cannot like a comment multiple times', async function () {
                const comment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id
                });
                await dbFns.addLike({
                    comment_id: comment.get('id'),
                    member_id: loggedInMember.id
                });

                // Comment was already liked above
                await testBasicErrorResponse('post', `/api/comments/${comment.get('id')}/like/`, 400);
            });

            it('Can like a reply', async function () {
                const comment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id
                });
                const reply = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 1).id,
                    parent_id: comment.get('id')
                });

                // Like the reply
                await membersAgent
                    .post(`/api/comments/${reply.get('id')}/like/`)
                    .expectStatus(204)
                    .matchHeaderSnapshot({
                        etag: anyEtag,
                        'x-cache-invalidate': matchers.stringMatching(
                            new RegExp('/api/members/comments/post/[0-9a-f]{24}/, /api/members/comments/[0-9a-f]{24}/replies/')
                        )
                    })
                    .expectEmptyBody();

                // Check liked
                await testGetComments(`/api/comments/${reply.id}/`, [commentMatcher])
                    .expect(({body}) => {
                        body.comments[0].liked.should.eql(true);
                        body.comments[0].count.likes.should.eql(1);
                    });
            });

            it('Can return replies', async function () {
                const {parent, replies} = await dbFns.addCommentWithReplies({
                    member_id: fixtureManager.get('members', 0).id,
                    replies: new Array(7).fill({
                        member_id: fixtureManager.get('members', 1).id
                    })
                });
                await dbFns.addLike({
                    comment_id: replies[2].get('id'),
                    member_id: loggedInMember.id
                });

                await testGetComments(`/api/comments/${parent.get('id')}/replies/`, new Array(7).fill(commentMatcher))
                    .expect(({body}) => {
                        should(body.comments[0].count.replies).be.undefined();
                        should(body.meta.pagination.total).eql(7);
                        should(body.meta.pagination.next).eql(null);

                        // Check liked + likes working for replies too
                        should(body.comments[2].id).eql(replies[2].get('id'));
                        should(body.comments[2].count.likes).eql(1);
                        should(body.comments[2].liked).eql(true);
                    });
            });

            it('Can request last page of replies', async function () {
                const {parent} = await dbFns.addCommentWithReplies({
                    member_id: fixtureManager.get('members', 0).id,
                    replies: new Array(7).fill({
                        member_id: fixtureManager.get('members', 1).id
                    })
                });

                await testGetComments(`/api/comments/${parent.get('id')}/replies/?page=3&limit=3`, [commentMatcher])
                    .expect(({body}) => {
                        should(body.comments[0].count.replies).be.undefined();
                        should(body.meta.pagination.total).eql(7);
                        should(body.meta.pagination.next).eql(null);
                    });
            });

            it('Can remove a like (unlike)', async function () {
                const comment = await dbFns.addComment({
                    member_id: loggedInMember.id
                });
                await dbFns.addLike({
                    comment_id: comment.get('id'),
                    member_id: loggedInMember.id
                });

                // Unlike
                await testBasicEmptyResponse('delete', `/api/comments/${comment.get('id')}/like/`, 204);

                // Check not liked
                await testGetComments(`/api/comments/${comment.get('id')}/`, [commentMatcher])
                    .expect(({body}) => {
                        body.comments[0].liked.should.eql(false);
                        body.comments[0].count.likes.should.eql(0);
                    });
            });

            it('Cannot unlike a comment if it has not been liked', async function () {
                const comment = await dbFns.addComment({
                    member_id: loggedInMember.id
                });

                await testBasicErrorResponse('delete', `/api/comments/${comment.get('id')}/like/`, 404);
            });

            it('Can report a comment', async function () {
                const comment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id,
                    html: '<p>This is a message</p><p></p><p>New line</p>'
                });

                await testBasicEmptyResponse('post', `/api/comments/${comment.get('id')}/report/`, 204);

                // Check report
                const reports = await models.CommentReport.findAll({filter: 'comment_id:\'' + comment.get('id') + '\''});
                reports.models.length.should.eql(1);

                const report = reports.models[0];
                report.get('member_id').should.eql(loggedInMember.id);

                mockManager.assert.sentEmail({
                    subject: '🚩 A comment has been reported on your post',
                    to: postAuthorEmail,
                    html: new RegExp(escapeRegExp('<p>This is a message</p><p></p><p>New line</p>')),
                    text: new RegExp(escapeRegExp('This is a message\n\nNew line'))
                });
            });

            it('Cannot report a comment twice', async function () {
                const comment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id
                });
                await dbFns.addReport({
                    comment_id: comment.get('id'),
                    member_id: loggedInMember.id
                });

                await testBasicEmptyResponse('post', `/api/comments/${comment.get('id')}/report/`, 204);

                // Check report should be the same (no extra created)
                const reports = await models.CommentReport.findAll({filter: 'comment_id:\'' + comment.get('id') + '\''});
                reports.models.length.should.eql(1);

                const report = reports.models[0];
                report.get('member_id').should.eql(loggedInMember.id);

                mockManager.assert.sentEmailCount(0);
            });

            it('Can edit a comment on a post', async function () {
                const comment = await dbFns.addComment({
                    member_id: loggedInMember.id
                });

                const {body} = await membersAgent
                    .put(`/api/comments/${comment.get('id')}`)
                    .body({comments: [{
                        html: 'Updated comment'
                    }]})
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot({
                        comments: [{
                            ...commentMatcher,
                            edited_at: anyISODateTime
                        }]
                    });

                assert(body.comments[0].edited_at, 'The edited_at field should be populated');
            });

            it('Can not edit a comment post_id', async function () {
                const comment = await dbFns.addComment({
                    member_id: loggedInMember.id
                });

                const anotherPostId = fixtureManager.get('posts', 1).id;

                await membersAgent
                    .put(`/api/comments/${comment.get('id')}`)
                    .body({comments: [{
                        post_id: anotherPostId
                    }]});

                const {body} = await membersAgent
                    .get(`/api/comments/?filter=post_id:'${anotherPostId}'`);

                assert(!body.comments.find(c => c.id === comment.get('id')), 'The comment should not have moved post');
            });

            it('Can not edit a comment which does not belong to you', async function () {
                const comment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id
                });

                await membersAgent2
                    .put(`/api/comments/${comment.get('id')}`)
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
                const comment = await dbFns.addComment({
                    member_id: loggedInMember.id
                });
                const memberId = fixtureManager.get('members', 1).id;
                await membersAgent
                    .put(`/api/comments/${comment.get('id')}`)
                    .body({comments: [{
                        html: 'Illegal comment update',
                        member_id: memberId
                    }]});

                const {
                    body: {
                        comments: [
                            fetchedComment
                        ]
                    }
                } = await testGetComments(`/api/comments/${comment.get('id')}`, [{
                    ...commentMatcher,
                    edited_at: anyISODateTime
                }]);

                assert(fetchedComment.member.id !== memberId);
            });

            it('Can not reply to a reply', async function () {
                const {replies} = await dbFns.addCommentWithReplies({
                    member_id: fixtureManager.get('members', 1).id,
                    html: 'Parent',
                    replies: [{
                        member_id: fixtureManager.get('members', 3).id,
                        html: 'Reply'
                    }]
                });

                await membersAgent
                    .post(`/api/comments/`)
                    .body({comments: [{
                        post_id: postId,
                        parent_id: replies[0].get('id'),
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
                const parentId = (await dbFns.addComment({
                    member_id: loggedInMember.id,
                    html: 'Parent'
                })).get('id');

                const newParentId = (await dbFns.addComment({
                    member_id: loggedInMember.id,
                    html: 'New Parent'
                })).get('id');

                const replyId = (await dbFns.addComment({
                    member_id: loggedInMember.id,
                    parent_id: parentId,
                    html: 'Reply'
                })).get('id');

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

                for (const i of ids.keys()) {
                    // add i+1 comments so we have a different count for each post
                    for (let j = 0; j < i + 1; j++) {
                        await dbFns.addComment({
                            post_id: ids[i],
                            member_id: loggedInMember.id
                        });
                    }
                }

                await membersAgent
                    .get(`api/comments/counts/?ids=${ids.join(',')}`)
                    .expectStatus(200)
                    .matchHeaderSnapshot({
                        etag: anyEtag
                    })
                    .matchBodySnapshot();
            });

            it('Can delete a comment, and it is redacted from', async function () {
                const commentToDeleteId = (await dbFns.addComment({
                    member_id: loggedInMember.id,
                    html: 'Comment to delete'
                })).get('id');

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
                loggedInMember = await models.Member.findOne({email: 'paid@example.com'}, {require: true});

                const product = await getPaidProduct();

                // Attach comped subscription to this member
                await models.Member.edit({
                    status: 'comped',
                    products: [
                        {
                            id: product.id
                        }
                    ]
                }, {id: loggedInMember.id});
            });

            it('Can comment on a post', async function () {
                await testCanCommentOnPost(loggedInMember);
            });

            it('Can reply to a comment', async function () {
                await testCanReply(loggedInMember);
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
                loggedInMember = await models.Member.findOne({email: 'member-premium@example.com'}, {require: true});

                // Attach comped subscription to this member
                await models.Member.edit({
                    status: 'comped',
                    products: [
                        {
                            id: product.id
                        }
                    ]
                }, {id: loggedInMember.id});
            });

            it('Can comment on a post', async function () {
                await testCanCommentOnPost(loggedInMember);
            });

            it('Can reply to a comment', async function () {
                await testCanReply(loggedInMember);
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
