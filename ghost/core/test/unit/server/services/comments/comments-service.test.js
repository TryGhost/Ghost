const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');
const CommentsService = require('../../../../../core/server/services/comments/comments-service');

describe('Comments Service: CommentsService', function () {
    function voteModel({id, score}) {
        return {
            id,
            get: sinon.stub().withArgs('score').returns(score),
            destroy: sinon.stub().resolves()
        };
    }

    function createClassInstance({labs = {}, commentsEnabled = 'all'} = {}) {
        const memberModel = {
            id: 'member-id',
            get: sinon.stub().withArgs('status').returns('paid')
        };
        const models = {
            Base: {
                transaction: sinon.stub().callsFake(async (callback) => {
                    return await callback('transaction');
                })
            },
            Member: {
                findOne: sinon.stub().resolves(memberModel)
            },
            Comment: {
                findPage: sinon.stub().resolves({data: [], meta: {}})
            },
            CommentLike: {
                findAll: sinon.stub().resolves({models: []}),
                add: sinon.stub().resolves({id: 'like-id'}),
                edit: sinon.stub().resolves({id: 'like-id'}),
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
        it('adds a like score when there is no existing vote', async function () {
            const {instance, models} = createClassInstance();

            await instance.likeComment('comment-id', {id: 'member-id'}, {context: {member: {id: 'member-id'}}});

            sinon.assert.calledWith(models.CommentLike.findAll, sinon.match({
                filter: 'comment_id:\'comment-id\'+member_id:\'member-id\''
            }));
            sinon.assert.calledWith(models.CommentLike.add, {
                member_id: 'member-id',
                comment_id: 'comment-id',
                score: 1
            });
        });

        it('replaces duplicate existing votes with one like score', async function () {
            const {instance, models} = createClassInstance();
            const votes = [
                voteModel({id: 'vote-1', score: -1}),
                voteModel({id: 'vote-2', score: -1}),
                voteModel({id: 'vote-3', score: 1})
            ];
            models.CommentLike.findAll.resolves({models: votes});

            await instance.likeComment('comment-id', {id: 'member-id'}, {context: {member: {id: 'member-id'}}});

            votes.forEach((vote) => {
                sinon.assert.calledOnce(vote.destroy);
                sinon.assert.calledWith(vote.destroy, sinon.match({
                    transacting: 'transaction'
                }));
            });
            sinon.assert.calledWith(models.CommentLike.add, {
                member_id: 'member-id',
                comment_id: 'comment-id',
                score: 1
            });
        });

        it('rejects one existing like without rewriting the row', async function () {
            const {instance, models} = createClassInstance();
            const vote = voteModel({id: 'vote-1', score: 1});
            models.CommentLike.findAll.resolves({models: [vote]});

            await assert.rejects(
                () => instance.likeComment('comment-id', {id: 'member-id'}, {context: {member: {id: 'member-id'}}}),
                errors.BadRequestError
            );

            sinon.assert.notCalled(vote.destroy);
            sinon.assert.notCalled(models.CommentLike.add);
        });
    });

    describe('dislikeComment', function () {
        it('replaces an existing like score with a dislike score', async function () {
            const {instance, models} = createClassInstance();
            const vote = voteModel({id: 'vote-id', score: 1});
            models.CommentLike.findAll.resolves({models: [vote]});

            await instance.dislikeComment('comment-id', {id: 'member-id'}, {context: {member: {id: 'member-id'}}});

            sinon.assert.calledOnce(vote.destroy);
            sinon.assert.calledWith(models.CommentLike.add, {
                member_id: 'member-id',
                comment_id: 'comment-id',
                score: -1
            });
        });

        it('does not depend on a labs flag', async function () {
            const {instance, models} = createClassInstance();

            await instance.dislikeComment('comment-id', {id: 'member-id'});

            sinon.assert.calledOnce(models.Member.findOne);
            sinon.assert.calledWith(models.CommentLike.add, {
                member_id: 'member-id',
                comment_id: 'comment-id',
                score: -1
            });
        });
    });

    describe('unlikeComment', function () {
        it('removes every positive duplicate vote', async function () {
            const {instance, models} = createClassInstance();
            const positiveVotes = [
                voteModel({id: 'vote-1', score: 1}),
                voteModel({id: 'vote-2', score: 1})
            ];
            const negativeVote = voteModel({id: 'vote-3', score: -1});
            models.CommentLike.findAll.resolves({models: [...positiveVotes, negativeVote]});

            await instance.unlikeComment('comment-id', {id: 'member-id'});

            positiveVotes.forEach((vote) => {
                sinon.assert.calledOnce(vote.destroy);
            });
            sinon.assert.notCalled(negativeVote.destroy);
        });
    });

    describe('undislikeComment', function () {
        it('removes every negative duplicate vote', async function () {
            const {instance, models} = createClassInstance();
            const positiveVote = voteModel({id: 'vote-1', score: 1});
            const negativeVotes = [
                voteModel({id: 'vote-2', score: -1}),
                voteModel({id: 'vote-3', score: -1})
            ];
            models.CommentLike.findAll.resolves({models: [positiveVote, ...negativeVotes]});

            await instance.undislikeComment('comment-id', {id: 'member-id'});

            sinon.assert.notCalled(positiveVote.destroy);
            negativeVotes.forEach((vote) => {
                sinon.assert.calledOnce(vote.destroy);
            });
        });
    });

    describe('getComments', function () {
        it('preserves net score ordering without a labs flag', async function () {
            const {instance, models} = createClassInstance();

            await instance.getComments({order: 'count__net_score desc, created_at desc'});

            sinon.assert.calledWith(models.Comment.findPage, sinon.match({
                order: 'count__net_score desc, created_at desc'
            }));
        });
    });

    describe('getAdminAllComments', function () {
        it('loads dislike counts for admin moderation', async function () {
            const {instance, models} = createClassInstance();

            await instance.getAdminAllComments({
                includeNested: true,
                order: 'created_at desc'
            });

            sinon.assert.calledWith(models.Comment.findPage, sinon.match({
                withRelated: sinon.match(value => value.includes('count.dislikes') && value.includes('count.net_score'))
            }));
        });
    });
});
