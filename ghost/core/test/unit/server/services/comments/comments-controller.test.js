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
            get: key => comment[key]
        };
        const service = {
            likeComment: sinon.stub().resolves({id: 'like-id'}),
            unlikeComment: sinon.stub().resolves(),
            dislikeComment: sinon.stub().resolves({id: 'dislike-id'}),
            undislikeComment: sinon.stub().resolves(),
            getCommentByID: sinon.stub().resolves(commentModel),
            getCommentDislikes: sinon.stub().resolves({data: []})
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
            '/api/members/comments/post/post-id/, /api/members/comments/parent-id/replies/'
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
            '/api/members/comments/post/post-id/, /api/members/comments/parent-id/replies/'
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
});
