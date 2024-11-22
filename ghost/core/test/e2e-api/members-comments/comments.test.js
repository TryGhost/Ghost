const assert = require('assert/strict');
const {agentProvider, mockManager, fixtureManager, matchers, configUtils, dbUtils} = require('../../utils/e2e-framework');
const {nullable, anyEtag, anyObjectId, anyLocationFor, anyISODateTime, anyErrorId, anyUuid, anyNumber, anyBoolean} = matchers;
const should = require('should');
const models = require('../../../core/server/models');
const moment = require('moment-timezone');
const settingsCache = require('../../../core/shared/settings-cache');
const sinon = require('sinon');
const DomainEvents = require('@tryghost/domain-events');
const {mockLabsEnabled, mockLabsDisabled} = require('../../utils/e2e-framework-mock-manager');

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
     * @property {string} [in_reply_to_id]
     * @property {string} [html='This is a comment']
     * @property {string} [status]
     * @property {Date} [created_at]
     */
    /**
     * @typedef {Object} AddCommentReplyData
     * @property {string} member_id
     * @property {string} [html='This is a reply']
     * @property {Date} [created_at]
     * @property {string} [status]
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
            html: data.html || '<p>This is a comment</p>',
            created_at: data.created_at,
            in_reply_to_id: data.in_reply_to_id,
            status: data.status || 'published'
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
                html: reply.html || '<p>This is a reply</p>',
                status: reply.status
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

const labsCommentMatcher = {
    ...commentMatcher,
    in_reply_to_id: nullable(anyObjectId)
};

/**
 * @param {Object} [options]
 * @param {number} [options.replies]
 * @param {object} [options.commentMatcher]
 * @returns
 */
function commentMatcherWithReplies(options) {
    const defaultOptions = {replies: 0, commentMatcher};
    options = {...defaultOptions, ...options};

    return {
        ...options.commentMatcher,
        replies: new Array(options.replies).fill(options.commentMatcher),
        count: {
            likes: anyNumber,
            replies: anyNumber
        }
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
 * @param {string} [data.in_reply_to_id]
 * @param {Object} [options]
 * @param {number} [options.status = 201]
 * @param {Object} [options.matchHeaderSnapshot]
 * @param {Object} [options.matchBodySnapshot]
 * @returns {any} ExpectRequest
 */
function testPostComment({post_id, html, parent_id, in_reply_to_id}, {status = 201, matchHeaderSnapshot = {}, matchBodySnapshot} = {}) {
    return membersAgent
        .post(`/api/comments/`)
        .body({comments: [{
            post_id,
            parent_id,
            in_reply_to_id,
            html
        }]})
        .expectStatus(status)
        .matchHeaderSnapshot({
            etag: anyEtag,
            location: anyLocationFor('comments'),
            'x-cache-invalidate': matchers.stringMatching(
                parent_id
                    ? new RegExp('/api/members/comments/post/[0-9a-f]{24}/, /api/members/comments/[0-9a-f]{24}/replies/')
                    : new RegExp('/api/members/comments/post/[0-9a-f]{24}/')

            ),
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

        mockLabsDisabled('commentImprovements');

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

            describe('when commentImprovements flag is enabled', function () {
                beforeEach(function () {
                    mockLabsEnabled('commentImprovements');
                });

                it('excludes hidden comments', async function () {
                    const hiddenComment = await dbFns.addComment({
                        post_id: postId,
                        member_id: fixtureManager.get('members', 2).id,
                        html: 'This is a hidden comment',
                        status: 'hidden'
                    });

                    const data2 = await membersAgent
                        .get(`/api/comments/post/${postId}/`)
                        .expectStatus(200);

                    // check that hiddenComment.id is not in the response
                    should(data2.body.comments.map(c => c.id)).not.containEql(hiddenComment.id);
                    should(data2.body.comments.length).eql(0);
                });

                it('excludes deleted comments', async function () {
                    // await mockManager.mockLabsEnabled('commentImprovements');
                    await dbFns.addComment({
                        post_id: postId,
                        member_id: fixtureManager.get('members', 2).id,
                        html: 'This is a deleted comment',
                        status: 'deleted'
                    });

                    const data2 = await membersAgent
                        .get(`/api/comments/post/${postId}/`)
                        .expectStatus(200);

                    // go through all comments and check if the deleted comment is not there
                    data2.body.comments.forEach((comment) => {
                        should(comment.html).not.eql('This is a deleted comment');
                    });

                    data2.body.comments.length.should.eql(0);
                });
            });

            it('shows hidden and deleted comment where there is a reply', async function () {
                await mockManager.mockLabsEnabled('commentImprovements');
                await setupBrowseCommentsData();
                const hiddenComment = await dbFns.addComment({
                    post_id: postId,
                    member_id: fixtureManager.get('members', 2).id,
                    html: 'This is a hidden comment',
                    status: 'hidden'
                });

                const deletedComment = await dbFns.addComment({
                    post_id: postId,
                    member_id: fixtureManager.get('members', 2).id,
                    html: 'This is a deleted comment',
                    status: 'deleted'
                });

                await dbFns.addComment({
                    post_id: postId,
                    member_id: fixtureManager.get('members', 2).id,
                    parent_id: hiddenComment.get('id'),
                    html: 'This is a reply to a hidden comment'
                });

                await dbFns.addComment({
                    post_id: postId,
                    member_id: fixtureManager.get('members', 2).id,
                    parent_id: deletedComment.get('id'),
                    html: 'This is a reply to a deleted comment'
                });

                const data2 = await membersAgent
                    .get(`/api/comments/post/${postId}`)
                    .expectStatus(200);

                // check if hidden and deleted comments have their html removed
                data2.body.comments.forEach((comment) => {
                    should.notEqual(comment.html, 'This is a hidden comment');
                    should.notEqual(comment.html, 'This is a deleted comment');
                });

                // check if hiddenComment.id and deletedComment.id are in the response
                should(data2.body.comments.map(c => c.id)).containEql(hiddenComment.id);
                should(data2.body.comments.map(c => c.id)).containEql(deletedComment.id);

                // check if the replies to hidden and deleted comments are in the response
                data2.body.comments.forEach((comment) => {
                    if (comment.id === hiddenComment.id) {
                        should(comment.replies.length).eql(1);
                        should(comment.replies[0].html).eql('This is a reply to a hidden comment');
                    } else if (comment.id === deletedComment.id) {
                        should(comment.replies.length).eql(1);
                        should(comment.replies[0].html).eql('This is a reply to a deleted comment');
                    }
                });
            });

            it('Returns nothing if both parent and reply are hidden', async function () {
                await mockManager.mockLabsEnabled('commentImprovements');
                const hiddenComment = await dbFns.addComment({
                    post_id: postId,
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'This is a hidden comment',
                    status: 'hidden'
                });

                await dbFns.addComment({
                    post_id: postId,
                    member_id: fixtureManager.get('members', 1).id,
                    parent_id: hiddenComment.get('id'),
                    html: 'This is a reply to a hidden comment',
                    status: 'hidden'
                });

                const data2 = await membersAgent
                    .get(`/api/comments/post/${postId}`)
                    .expectStatus(200);

                should(data2.body.comments.length).eql(0);
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

            it('Browsing comments does not return the member unsubscribe_url', async function () {
                await setupBrowseCommentsData();
                const response = await testGetComments(`/api/comments/post/${postId}/`, [
                    commentMatcher,
                    commentMatcherWithReplies({replies: 1})
                ]);
                should.not.exist(response.body.comments[0].unsubscribe_url);
            });

            it('can show most liked comment first when order param = best followed by most recent', async function () {
                await setupBrowseCommentsData();
                await dbFns.addComment({
                    html: 'This is the newest comment',
                    member_id: fixtureManager.get('members', 2).id,
                    created_at: new Date('2024-08-18')
                });

                const secondBest = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 0).id,
                    html: 'This will be the second best comment',
                    created_at: new Date('2022-01-01')
                });

                await dbFns.addComment({
                    member_id: fixtureManager.get('members', 1).id,
                    created_at: new Date('2023-01-01')
                });

                const bestComment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 2).id,
                    html: 'This will be the best comment',
                    created_at: new Date('2021-01-01')
                });

                const oldestComment = await dbFns.addComment({
                    member_id: fixtureManager.get('members', 1).id,
                    html: 'ancient comment',
                    created_at: new Date('2019-01-01')
                });

                await dbFns.addLike({
                    comment_id: secondBest.id,
                    member_id: loggedInMember.id
                });

                await dbFns.addLike({
                    comment_id: bestComment.id,
                    member_id: loggedInMember.id
                });

                await dbFns.addLike({
                    comment_id: bestComment.id,
                    member_id: fixtureManager.get('members', 0).id
                });

                await dbFns.addLike({
                    comment_id: bestComment.id,
                    member_id: fixtureManager.get('members', 1).id
                });

                const data2 = await membersAgent
                    .get(`/api/comments/post/${postId}/?page=1&order=count__likes%20desc%2C%20created_at%20desc`)
                    .expectStatus(200);

                // get the LAST comment from data2
                let lastComment = data2.body.comments[data2.body.comments.length - 1];

                should(lastComment.id).eql(oldestComment.id);
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

            it('hidden replies are not included in the count', async function () {
                await mockManager.mockLabsEnabled('commentImprovements');
                const {parent} = await dbFns.addCommentWithReplies({
                    member_id: fixtureManager.get('members', 0).id,
                    replies: new Array(5).fill({
                        member_id: fixtureManager.get('members', 1).id,
                        status: 'hidden'
                    })
                });

                const res = await membersAgent.get(`/api/comments/${parent.get('id')}/`);

                res.body.comments[0].count.replies.should.eql(0);
            });

            it('deleted replies are not included in the count', async function () {
                await mockManager.mockLabsEnabled('commentImprovements');
                const {parent} = await dbFns.addCommentWithReplies({
                    member_id: fixtureManager.get('members', 0).id,
                    replies: new Array(5).fill({
                        member_id: fixtureManager.get('members', 1).id,
                        status: 'deleted'
                    })
                });

                const res = await membersAgent.get(`/api/comments/${parent.get('id')}/`);

                res.body.comments[0].count.replies.should.eql(0);
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

            describe('replies to replies', function () {
                beforeEach(function () {
                    mockLabsEnabled('commentImprovements');
                });

                it('can browse comments with replies to replies', async function () {
                    const {replies: [reply]} = await dbFns.addCommentWithReplies({
                        member_id: fixtureManager.get('members', 1).id,
                        replies: [{
                            member_id: fixtureManager.get('members', 2).id,
                            html: '<p>This is what was replied to</p>'
                        }]
                    });

                    await dbFns.addComment({
                        member_id: fixtureManager.get('members', 1).id,
                        parent_id: reply.get('parent_id'),
                        in_reply_to_id: reply.get('id'),
                        html: '<p>This is a reply to a reply</p>'
                    });

                    await testGetComments(`/api/comments/post/${postId}/`, [commentMatcherWithReplies({replies: 2, commentMatcher: labsCommentMatcher})]);
                });

                it('can set in_reply_to_id when creating a reply', async function () {
                    const {replies: [reply]} = await dbFns.addCommentWithReplies({
                        member_id: fixtureManager.get('members', 1).id,
                        replies: [{
                            member_id: fixtureManager.get('members', 2).id
                        }]
                    });

                    const {body: {comments: [newComment]}} = await testPostComment({
                        post_id: postId,
                        parent_id: reply.get('parent_id'),
                        in_reply_to_id: reply.get('id'),
                        html: '<p>This is a reply to a reply</p>'
                    }, {
                        matchBodySnapshot: {
                            comments: [labsCommentMatcher]
                        }
                    });

                    // in_reply_to is set
                    newComment.in_reply_to_id.should.eql(reply.get('id'));
                    newComment.in_reply_to_snippet.should.eql('This is a reply');

                    // replied-to comment author is notified
                    // parent comment author is notified
                    mockManager.assert.sentEmailCount(3);
                    assertAuthorEmailSent(postAuthorEmail, postTitle);
                    mockManager.assert.sentEmail({
                        subject: '↪️ New reply to your comment on Ghost',
                        to: fixtureManager.get('members', 1).email
                    });
                    mockManager.assert.sentEmail({
                        subject: '↪️ New reply to your comment on Ghost',
                        to: fixtureManager.get('members', 2).email
                    });
                });

                ['deleted', 'hidden'].forEach((status) => {
                    it(`cannot set in_reply_to_id to a ${status} comment`, async function () {
                        const {replies: [reply]} = await dbFns.addCommentWithReplies({
                            member_id: fixtureManager.get('members', 1).id,
                            replies: [{
                                member_id: fixtureManager.get('members', 2).id,
                                status
                            }]
                        });

                        const {body: {comments: [newComment]}} = await testPostComment({
                            post_id: postId,
                            parent_id: reply.get('parent_id'),
                            in_reply_to_id: reply.get('id'),
                            html: '<p>This is a reply to a reply</p>'
                        });

                        // in_reply_to is not set
                        should.not.exist(newComment.in_reply_to_id);
                        should.not.exist(newComment.in_reply_to_snippet);

                        // only author and parent email sent
                        mockManager.assert.sentEmailCount(2);
                    });
                });

                it('in_reply_to_id is ignored when no parent specified', async function () {
                    const {replies: [reply]} = await dbFns.addCommentWithReplies({
                        member_id: fixtureManager.get('members', 1).id,
                        replies: [{
                            member_id: fixtureManager.get('members', 2).id
                        }]
                    });

                    const {body: {comments: [newComment]}} = await testPostComment({
                        post_id: postId,
                        in_reply_to_id: reply.get('id'),
                        html: '<p>This is a reply to a reply</p>'
                    });

                    // in_reply_to is not set
                    should.not.exist(newComment.in_reply_to_id);
                    should.not.exist(newComment.in_reply_to_snippet);

                    should.not.exist(newComment.parent_id);

                    // only author email sent
                    mockManager.assert.sentEmailCount(1);
                });

                it('in_reply_to_id is ignored id in_reply_to_id has a different parent', async function () {
                    const {replies: [reply]} = await dbFns.addCommentWithReplies({
                        member_id: fixtureManager.get('members', 1).id,
                        replies: [{
                            member_id: fixtureManager.get('members', 2).id
                        }]
                    });

                    const diffParentComment = await dbFns.addComment({
                        member_id: fixtureManager.get('members', 1).id
                    });

                    const {body: {comments: [newComment]}} = await testPostComment({
                        post_id: postId,
                        parent_id: diffParentComment.get('id'),
                        in_reply_to_id: reply.get('id'),
                        html: '<p>This is a reply to a reply</p>'
                    }, {
                        matchBodySnapshot: {
                            comments: [labsCommentMatcher]
                        }
                    });

                    // in_reply_to is not set
                    should.not.exist(newComment.in_reply_to_id);
                    should.not.exist(newComment.in_reply_to_snippet);
                });

                it('includes in_reply_to_snippet in response', async function () {
                    const {replies: [reply]} = await dbFns.addCommentWithReplies({
                        member_id: fixtureManager.get('members', 1).id,
                        replies: [{
                            member_id: fixtureManager.get('members', 2).id,
                            html: '<p><b>This is what was replied to</b></p>'
                        }]
                    });

                    const {body: {comments: [newComment]}} = await testPostComment({
                        post_id: postId,
                        parent_id: reply.get('parent_id'),
                        in_reply_to_id: reply.get('id'),
                        html: '<p>This is a reply to a reply</p>'
                    }, {
                        matchBodySnapshot: {
                            comments: [labsCommentMatcher]
                        }
                    });

                    const {body: {comments: [comment]}} = await testGetComments(`/api/comments/${newComment.id}`, [labsCommentMatcher]);

                    // in_reply_to_snippet is included
                    comment.in_reply_to_snippet.should.eql('This is what was replied to');
                });

                ['deleted', 'hidden'].forEach((status) => {
                    it(`does not include in_reply_to_snippet for ${status} comments`, async function () {
                        const {replies: [reply]} = await dbFns.addCommentWithReplies({
                            member_id: fixtureManager.get('members', 1).id,
                            replies: [{
                                member_id: fixtureManager.get('members', 2).id,
                                html: `<p>This is a ${status} reply</p>`,
                                status
                            }]
                        });

                        const newComment = await dbFns.addComment({
                            member_id: loggedInMember.id,
                            parent_id: reply.get('parent_id'),
                            in_reply_to_id: reply.get('id')
                        });

                        const {body: {comments: [comment]}} = await testGetComments(`/api/comments/${newComment.id}`, [labsCommentMatcher]);

                        should.not.exist(comment.in_reply_to_snippet);
                    });
                });
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
