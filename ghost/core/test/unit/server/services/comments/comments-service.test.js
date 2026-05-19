const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const CommentsService = require('../../../../../core/server/services/comments/comments-service');

describe('Comments Service: CommentsService', function () {
    function createClassInstance({labs = {commentDislikes: true}, commentsEnabled = 'all'} = {}) {
        const memberModel = {
            id: 'member-id',
            get: sinon.stub().withArgs('status').returns('paid')
        };
        const models = {
            Member: {
                findOne: sinon.stub().resolves(memberModel)
            },
            CommentLike: {
                findOne: sinon.stub().resolves(null),
                add: sinon.stub().resolves({id: 'like-id'}),
                destroy: sinon.stub().resolves()
            },
            CommentDislike: {
                findOne: sinon.stub().resolves(null),
                add: sinon.stub().resolves({id: 'dislike-id'}),
                destroy: sinon.stub().resolves()
            }
        };

        const labsStub = {
            isSet: sinon.stub().callsFake(flag => labs[flag] || false)
        };

        const instance = new CommentsService({
            config: {},
            logging: {},
            models,
            mailer: {},
            settingsCache: {
                get: sinon.stub().withArgs('comments_enabled').returns(commentsEnabled)
            },
            settingsHelpers: {},
            urlService: {},
            urlUtils: {},
            contentGating: {},
            labs: labsStub
        });

        return {instance, models, memberModel, labs: labsStub};
    }

    describe('likeComment', function () {
        it('removes an existing dislike before adding a like', async function () {
            const {instance, models} = createClassInstance();
            models.CommentDislike.findOne.resolves({id: 'dislike-id'});

            await instance.likeComment('comment-id', {id: 'member-id'}, {context: {member: {id: 'member-id'}}});

            sinon.assert.calledWith(models.CommentDislike.findOne, {
                member_id: 'member-id',
                comment_id: 'comment-id'
            });
            sinon.assert.calledWith(models.CommentDislike.destroy, sinon.match({
                destroyBy: {
                    member_id: 'member-id',
                    comment_id: 'comment-id'
                }
            }));
            sinon.assert.calledWith(models.CommentLike.add, {
                member_id: 'member-id',
                comment_id: 'comment-id'
            });
        });
    });

    describe('dislikeComment', function () {
        it('removes an existing like before adding a dislike', async function () {
            const {instance, models} = createClassInstance();
            models.CommentLike.findOne.resolves({id: 'like-id'});

            await instance.dislikeComment('comment-id', {id: 'member-id'}, {context: {member: {id: 'member-id'}}});

            sinon.assert.calledWith(models.CommentLike.findOne, {
                member_id: 'member-id',
                comment_id: 'comment-id'
            });
            sinon.assert.calledWith(models.CommentLike.destroy, sinon.match({
                destroyBy: {
                    member_id: 'member-id',
                    comment_id: 'comment-id'
                }
            }));
            sinon.assert.calledWith(models.CommentDislike.add, {
                member_id: 'member-id',
                comment_id: 'comment-id'
            });
        });

        it('returns not found when the commentDislikes flag is off', async function () {
            const {instance, models} = createClassInstance({labs: {commentDislikes: false}});

            await assert.rejects(
                () => instance.dislikeComment('comment-id', {id: 'member-id'}),
                errors.NotFoundError
            );

            sinon.assert.notCalled(models.Member.findOne);
            sinon.assert.notCalled(models.CommentDislike.add);
        });
    });

    describe('normalizeDislikeFlaggedOptions', function () {
        it('rewrites net score ordering to likes ordering when the flag is off', function () {
            const {instance} = createClassInstance({labs: {commentDislikes: false}});

            assert.deepEqual(
                instance.normalizeDislikeFlaggedOptions({order: 'count__net_score desc, created_at desc'}),
                {order: 'count__likes desc, created_at desc'}
            );
        });

        it('preserves net score ordering when the flag is on', function () {
            const {instance} = createClassInstance();
            const options = {order: 'count__net_score desc, created_at desc'};

            assert.equal(instance.normalizeDislikeFlaggedOptions(options), options);
        });
    });
});
