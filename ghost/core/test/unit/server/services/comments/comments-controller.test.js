const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const CommentsController = require('../../../../../core/server/services/comments/comments-controller');

describe('Comments Service: CommentsController', function () {
    function createFrame(overrides = {}) {
        return {
            options: {
                id: 'comment-id',
                context: {
                    member: {
                        id: 'member-id'
                    }
                },
                ...overrides.options
            },
            data: overrides.data || {},
            setHeader: sinon.stub()
        };
    }

    function createController({comment = {post_id: 'post-id', parent_id: 'parent-id'}} = {}) {
        const commentModel = comment && {
            id: 'comment-id',
            get: key => comment[key]
        };
        const service = {
            getComments: sinon.stub().resolves({data: []}),
            getAdminAllComments: sinon.stub().resolves({data: []}),
            getReplies: sinon.stub().resolves({data: []}),
            getAdminReplies: sinon.stub().resolves({data: []}),
            likeComment: sinon.stub().resolves({id: 'like-id'}),
            unlikeComment: sinon.stub().resolves(),
            dislikeComment: sinon.stub().resolves({id: 'dislike-id'}),
            undislikeComment: sinon.stub().resolves(),
            getCommentByID: sinon.stub().resolves(commentModel),
            getCommentDislikes: sinon.stub().resolves({data: []}),
            getMemberIdByUUID: sinon.stub().resolves('impersonated-member-id')
        };
        const stats = {};

        return {
            controller: new CommentsController(service, stats),
            service
        };
    }

    it('rejects member reaction actions without a member context', async function () {
        const {controller, service} = createController();
        const frame = createFrame({options: {context: {}}});

        await assert.rejects(
            () => controller.dislike(frame),
            errors.UnauthorizedError
        );

        sinon.assert.notCalled(service.dislikeComment);
    });

    it('sets cache invalidation headers after adding a dislike', async function () {
        const {controller, service} = createController();
        const frame = createFrame();

        const result = await controller.dislike(frame);

        assert.deepEqual(result, {id: 'dislike-id'});
        sinon.assert.calledWith(
            service.dislikeComment,
            'comment-id',
            {id: 'member-id'},
            frame.options
        );
        sinon.assert.calledWith(
            frame.setHeader,
            'X-Cache-Invalidate',
            '/api/members/comments/post/post-id/, /api/members/comments/parent-id/replies/, /api/members/comments/comment-id/'
        );
    });

    it('sets cache invalidation headers after removing a dislike', async function () {
        const {controller, service} = createController();
        const frame = createFrame();

        await controller.undislike(frame);

        sinon.assert.calledWith(
            service.undislikeComment,
            'comment-id',
            {id: 'member-id'},
            frame.options
        );
        sinon.assert.calledWith(
            frame.setHeader,
            'X-Cache-Invalidate',
            '/api/members/comments/post/post-id/, /api/members/comments/parent-id/replies/, /api/members/comments/comment-id/'
        );
    });

    it('invalidates the single-comment read path for top-level comments', function () {
        const {controller} = createController();
        const frame = createFrame();
        const model = {
            id: 'comment-id',
            get: key => ({post_id: 'post-id', parent_id: null})[key]
        };

        controller.setCacheInvalidationHeaders(model, frame);

        sinon.assert.calledWith(
            frame.setHeader,
            'X-Cache-Invalidate',
            '/api/members/comments/post/post-id/, /api/members/comments/comment-id/'
        );
    });

    it('passes pagination to the comment dislikes list', async function () {
        const {controller, service} = createController();
        const frame = createFrame({
            options: {
                page: 3,
                limit: 15
            }
        });

        await controller.getCommentDislikes(frame);

        sinon.assert.calledWith(service.getCommentDislikes, 'comment-id', {
            page: 3,
            limit: 15
        });
    });

    it('composes post scoping with existing mongo transformers', async function () {
        const {controller, service} = createController();
        const frame = createFrame({
            options: {
                post_id: 'post-id',
                filter: 'status:published',
                mongoTransformer: query => ({existing: query})
            }
        });

        await controller.browse(frame);

        const options = service.getComments.firstCall.args[0];
        assert.deepEqual(options.mongoTransformer({status: 'published'}), {
            $and: [
                {
                    post_id: 'post-id'
                },
                {
                    existing: {
                        status: 'published'
                    }
                }
            ]
        });
    });

    it('uses one service method for admin reply visibility', async function () {
        const {controller, service} = createController();
        const frame = createFrame();

        await controller.adminReplies(frame);

        sinon.assert.notCalled(service.getReplies);
        sinon.assert.calledWith(service.getAdminReplies, 'comment-id', sinon.match({
            order: 'created_at asc'
        }));
    });

    it('uses explicit admin read options without mutating frame options', async function () {
        const {controller, service} = createController();
        const frame = createFrame({
            options: {
                impersonate_member_uuid: 'member-uuid'
            },
            data: {
                id: 'comment-id'
            }
        });

        await controller.adminRead(frame);

        assert.equal(frame.options.isAdmin, undefined);
        sinon.assert.calledWith(service.getCommentByID, 'comment-id', sinon.match({
            isAdmin: true,
            context: {
                member: {
                    id: 'impersonated-member-id'
                }
            }
        }));
    });

    it('rejects unsupported count.reports filters instead of widening the query', async function () {
        const {controller, service} = createController();
        const frame = createFrame({
            options: {
                filter: 'count.reports:\'many\''
            }
        });

        await assert.rejects(
            () => controller.adminBrowseAll(frame),
            errors.BadRequestError
        );
        sinon.assert.notCalled(service.getAdminAllComments);
    });
});
