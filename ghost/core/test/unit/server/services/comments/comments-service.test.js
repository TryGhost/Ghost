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

    function buildCommentModel(attributes) {
        return {
            id: attributes.id,
            get: sinon.stub().callsFake(key => attributes[key])
        };
    }

    function createClassInstance({labs = {}, commentsEnabled = 'all', commentStatus = 'published'} = {}) {
        let lastCommentColumns;
        const commentFetchModels = [];
        const memberModel = {
            id: 'member-id',
            get: sinon.stub().withArgs('status').returns('paid'),
            toJSON: sinon.stub().returns({status: 'paid'})
        };
        const postModel = {
            id: 'post-id',
            toJSON: sinon.stub().returns({id: 'post-id'})
        };
        const commentModel = {
            id: 'comment-id',
            get: sinon.stub().callsFake((key) => {
                const values = {
                    id: 'comment-id',
                    post_id: 'post-id',
                    parent_id: null,
                    member_id: 'member-id',
                    html: '<p>Comment</p>',
                    created_at: new Date('2026-01-01T00:00:00.000Z'),
                    status: commentStatus
                };

                if (lastCommentColumns && !lastCommentColumns.includes(key)) {
                    return key === 'status' ? 'published' : undefined;
                }

                return values[key];
            })
        };
        const commentLikeQuery = {
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis()
        };
        const commentLikeCollection = {
            query: sinon.stub().callsFake((callback) => {
                callback(commentLikeQuery);
            }),
            fetchAll: sinon.stub().resolves({models: []})
        };
        const createCommentFetchModel = () => {
            const filters = {};
            const commentFetchQuery = {
                where: sinon.stub().callsFake((column, value) => {
                    filters[column] = value;
                    return commentFetchQuery;
                }),
                whereIn: sinon.stub().callsFake((column, value) => {
                    filters[column] = value;
                    return commentFetchQuery;
                }),
                forUpdate: sinon.stub().returnsThis()
            };
            const commentFetchModel = {
                filters,
                query: sinon.stub().callsFake((callback) => {
                    callback(commentFetchQuery);
                    return commentFetchModel;
                }),
                fetch: sinon.stub().callsFake(async (options = {}) => {
                    lastCommentColumns = options.columns;
                    const expectedId = filters['comments.id'];
                    const expectedStatus = filters['comments.status'];

                    if (expectedId && expectedId !== commentModel.id) {
                        return null;
                    }

                    if (Array.isArray(expectedStatus) && !expectedStatus.includes(commentStatus)) {
                        return null;
                    }

                    if (expectedStatus && !Array.isArray(expectedStatus) && expectedStatus !== commentStatus) {
                        return null;
                    }

                    return commentModel;
                })
            };
            commentFetchModels.push(commentFetchModel);
            return commentFetchModel;
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
                findOne: sinon.stub().callsFake(async (data, options = {}) => {
                    lastCommentColumns = options.columns;
                    if (data.id && data.id !== commentModel.id) {
                        return null;
                    }

                    // Readable reads constrain status in the query via an NQL filter
                    // (e.g. `status:[published,hidden]`); mirror that here so a
                    // non-readable status is excluded just like the real query.
                    if (options.filter && options.filter.includes('status:') && !options.filter.includes(commentStatus)) {
                        return null;
                    }

                    if (data.status && data.status !== commentStatus) {
                        return null;
                    }

                    return commentModel;
                }),
                forge: sinon.stub().callsFake(createCommentFetchModel),
                findPage: sinon.stub().resolves({data: [], meta: {}}),
                add: sinon.stub().resolves(commentModel),
                edit: sinon.stub().resolves(commentModel)
            },
            Post: {
                findOne: sinon.stub().resolves(postModel)
            },
            CommentLike: {
                forge: sinon.stub().returns(commentLikeCollection),
                add: sinon.stub().resolves({id: 'like-id'}),
                edit: sinon.stub().resolves({id: 'like-id'}),
                destroy: sinon.stub().resolves()
            },
            CommentReport: {
                findOne: sinon.stub().resolves(null),
                add: sinon.stub().resolves({id: 'report-id'})
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
            urlService: {facade: {getRequiredRelations: sinon.stub().returns([])}},
            urlUtils: {},
            contentGating: {
                BLOCK_ACCESS: 'block',
                checkPostAccess: sinon.stub().returns('allow')
            },
            labs: labsStub
        });
        instance.emails.notifyReport = sinon.stub().resolves();

        return {instance, models, memberModel, commentModel, commentFetchModels, commentLikeQuery, commentLikeCollection, labs: labsStub};
    }

    describe('likeComment', function () {
        it('adds a like score when there is no existing vote', async function () {
            const {instance, models, commentLikeQuery} = createClassInstance();

            await instance.likeComment('comment-id', {id: 'member-id'}, {context: {member: {id: 'member-id'}}});

            sinon.assert.calledWith(commentLikeQuery.where, 'comment_likes.comment_id', 'comment-id');
            sinon.assert.calledWith(commentLikeQuery.where, 'comment_likes.member_id', 'member-id');
            sinon.assert.calledWith(commentLikeQuery.orderBy, 'comment_likes.created_at', 'asc');
            sinon.assert.calledWith(models.CommentLike.add, {
                member_id: 'member-id',
                comment_id: 'comment-id',
                score: 1
            });
        });

        it('checks comment status with a lean lookup inside the vote transaction', async function () {
            const {instance, models, commentFetchModels} = createClassInstance();

            await instance.likeComment('comment-id', {id: 'member-id'}, {context: {member: {id: 'member-id'}}});

            sinon.assert.notCalled(models.Comment.findOne);
            assert.equal(commentFetchModels[0].filters['comments.id'], 'comment-id');
            assert.equal(commentFetchModels[0].filters['comments.status'], 'published');
            sinon.assert.calledWith(commentFetchModels[0].fetch, sinon.match({
                transacting: 'transaction',
                columns: ['id']
            }));
        });

        it('replaces duplicate existing votes with one like score', async function () {
            const {instance, models, commentLikeCollection} = createClassInstance();
            const votes = [
                voteModel({id: 'vote-1', score: -1}),
                voteModel({id: 'vote-2', score: -1}),
                voteModel({id: 'vote-3', score: 1})
            ];
            commentLikeCollection.fetchAll.resolves({models: votes});

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
            const {instance, models, commentLikeCollection} = createClassInstance();
            const vote = voteModel({id: 'vote-1', score: 1});
            commentLikeCollection.fetchAll.resolves({models: [vote]});

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
            const {instance, models, commentLikeCollection} = createClassInstance();
            const vote = voteModel({id: 'vote-id', score: 1});
            commentLikeCollection.fetchAll.resolves({models: [vote]});

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
            const {instance, commentLikeCollection, commentLikeQuery} = createClassInstance();
            const positiveVotes = [
                voteModel({id: 'vote-1', score: 1}),
                voteModel({id: 'vote-2', score: 1})
            ];
            commentLikeCollection.fetchAll.resolves({models: positiveVotes});

            await instance.unlikeComment('comment-id', {id: 'member-id'});

            sinon.assert.calledWith(commentLikeQuery.where, 'comment_likes.comment_id', 'comment-id');
            sinon.assert.calledWith(commentLikeQuery.where, 'comment_likes.member_id', 'member-id');
            sinon.assert.calledWith(commentLikeQuery.where, 'comment_likes.score', 1);
            positiveVotes.forEach((vote) => {
                sinon.assert.calledOnce(vote.destroy);
            });
        });
    });

    describe('undislikeComment', function () {
        it('removes every negative duplicate vote', async function () {
            const {instance, commentLikeCollection, commentLikeQuery} = createClassInstance();
            const negativeVotes = [
                voteModel({id: 'vote-2', score: -1}),
                voteModel({id: 'vote-3', score: -1})
            ];
            commentLikeCollection.fetchAll.resolves({models: negativeVotes});

            await instance.undislikeComment('comment-id', {id: 'member-id'});

            sinon.assert.calledWith(commentLikeQuery.where, 'comment_likes.score', -1);
            negativeVotes.forEach((vote) => {
                sinon.assert.calledOnce(vote.destroy);
            });
        });
    });

    describe('comment votes on non-public comments', function () {
        async function assertVoteActionRejects(status, run) {
            const {instance, models, commentLikeCollection} = createClassInstance({commentStatus: status});

            await assert.rejects(
                () => run(instance),
                errors.NotFoundError
            );

            sinon.assert.notCalled(commentLikeCollection.fetchAll);
            sinon.assert.notCalled(models.CommentLike.add);
        }

        it('does not add votes to hidden or deleted comments', async function () {
            for (const status of ['hidden', 'deleted']) {
                await assertVoteActionRejects(status, (instance) => {
                    return instance.likeComment('comment-id', {id: 'member-id'}, {
                        columns: ['id'],
                        context: {member: {id: 'member-id'}}
                    });
                });
            }
        });

        it('does not clear votes from hidden or deleted comments', async function () {
            for (const status of ['hidden', 'deleted']) {
                await assertVoteActionRejects(status, (instance) => {
                    return instance.unlikeComment('comment-id', {id: 'member-id'}, {
                        columns: ['id'],
                        context: {member: {id: 'member-id'}}
                    });
                });
            }
        });
    });

    describe('reportComment', function () {
        it('creates a report for a published comment', async function () {
            const {instance, models, commentModel} = createClassInstance();
            const reporter = {id: 'member-id'};
            instance.emails.notifyReport.callsFake((comment) => {
                assert.equal(comment.get('post_id'), 'post-id');
                assert.equal(comment.get('member_id'), 'member-id');
                assert.equal(comment.get('html'), '<p>Comment</p>');
                assert.deepEqual(comment.get('created_at'), new Date('2026-01-01T00:00:00.000Z'));
            });

            await instance.reportComment('comment-id', reporter, {columns: ['id'], context: {member: reporter}});

            sinon.assert.calledWith(models.CommentReport.findOne, {
                comment_id: 'comment-id',
                member_id: 'member-id'
            });
            sinon.assert.calledWith(models.CommentReport.add, {
                comment_id: 'comment-id',
                member_id: 'member-id'
            });
            sinon.assert.calledWith(instance.emails.notifyReport, commentModel, reporter);
        });

        it('does not report hidden or deleted comments', async function () {
            for (const status of ['hidden', 'deleted']) {
                const {instance, models} = createClassInstance({commentStatus: status});
                const reporter = {id: 'member-id'};

                await assert.rejects(
                    () => instance.reportComment('comment-id', reporter, {columns: ['id'], context: {member: reporter}}),
                    errors.NotFoundError
                );

                sinon.assert.notCalled(models.CommentReport.findOne);
                sinon.assert.notCalled(models.CommentReport.add);
                sinon.assert.notCalled(instance.emails.notifyReport);
            }
        });
    });

    describe('getCommentByID', function () {
        it('uses an exact comment lookup for member-facing direct reads', async function () {
            const {instance, models} = createClassInstance();
            const id = 'missing\',id:\'comment-id';

            await assert.rejects(
                () => instance.getCommentByID(id, {context: {member: {id: 'member-id'}}}),
                errors.NotFoundError
            );

            // The id is still matched via the data hash (not interpolated into the
            // status filter), so a crafted id stays inert: one keyed findOne, no findPage.
            sinon.assert.calledOnce(models.Comment.findOne);
            sinon.assert.calledWith(models.Comment.findOne, {
                id
            });
            sinon.assert.notCalled(models.Comment.findPage);
        });

        it('returns hidden comments to member-facing direct reads', async function () {
            const {instance, models, commentModel} = createClassInstance({commentStatus: 'hidden'});

            const result = await instance.getCommentByID('comment-id', {columns: ['id'], context: {member: {id: 'member-id'}}});

            assert.equal(result, commentModel);
            // A single row is fetched and its status checked in memory, rather than
            // one query per allowed status.
            sinon.assert.calledOnce(models.Comment.findOne);
            sinon.assert.calledWith(models.Comment.findOne, {
                id: 'comment-id'
            });
        });

        it('does not return deleted comments to member-facing direct reads', async function () {
            const {instance} = createClassInstance({commentStatus: 'deleted'});

            await assert.rejects(
                () => instance.getCommentByID('comment-id', {columns: ['id'], context: {member: {id: 'member-id'}}}),
                errors.NotFoundError
            );
        });
    });

    describe('replyToComment', function () {
        it('allows replies to hidden parent comments even when requested fields omit internal columns', async function () {
            const {instance, models} = createClassInstance({commentStatus: 'hidden'});

            await instance.replyToComment('comment-id', undefined, 'member-id', '<p>Reply</p>', {
                columns: ['id'],
                context: {
                    internal: true,
                    member: {id: 'member-id'}
                }
            });

            sinon.assert.calledWith(models.Comment.add, sinon.match({
                post_id: 'post-id',
                member_id: 'member-id',
                parent_id: 'comment-id',
                html: '<p>Reply</p>',
                status: 'published'
            }));
        });

        it('keeps hidden in_reply_to links so live descendants stay threaded', async function () {
            const {instance, models} = createClassInstance();
            const parentComment = buildCommentModel({
                id: 'parent-id',
                post_id: 'post-id',
                parent_id: null,
                status: 'published'
            });
            const hiddenReply = buildCommentModel({
                id: 'reply-id',
                post_id: 'post-id',
                parent_id: 'parent-id',
                status: 'hidden'
            });
            const commentsById = {'parent-id': parentComment, 'reply-id': hiddenReply};

            // Parent and in_reply_to are resolved through the lean lookup, which
            // applies the allowed statuses in the query — so the fake filters on the
            // captured `whereIn`/`where` values rather than returning blindly by id.
            models.Comment.forge.callsFake(() => {
                const filters = {};
                const query = {
                    where: sinon.stub().callsFake((column, value) => {
                        filters[column] = value;
                        return query;
                    }),
                    whereIn: sinon.stub().callsFake((column, value) => {
                        filters[column] = value;
                        return query;
                    }),
                    forUpdate: sinon.stub().returnsThis()
                };
                const model = {
                    query: sinon.stub().callsFake((callback) => {
                        callback(query);
                        return model;
                    }),
                    fetch: sinon.stub().callsFake(async () => {
                        const target = commentsById[filters['comments.id']];
                        if (!target) {
                            return null;
                        }

                        const statuses = filters['comments.status'];
                        if (Array.isArray(statuses) && !statuses.includes(target.get('status'))) {
                            return null;
                        }

                        return target;
                    })
                };
                return model;
            });

            await instance.replyToComment('parent-id', 'reply-id', 'member-id', '<p>Reply</p>', {
                columns: ['id'],
                context: {
                    internal: true,
                    member: {id: 'member-id'}
                }
            });

            sinon.assert.calledWith(models.Comment.add, sinon.match({
                post_id: 'post-id',
                member_id: 'member-id',
                parent_id: 'parent-id',
                in_reply_to_id: 'reply-id',
                html: '<p>Reply</p>',
                status: 'published'
            }));
        });

        it('drops the in_reply_to link instead of rejecting when the target does not exist', async function () {
            // The concession: a deleted/missing/cross-thread target is simply not a
            // valid anchor, so the reply still posts without the reference rather than
            // failing outright. (Deleted and missing now behave identically.)
            const {instance, models} = createClassInstance();

            await instance.replyToComment('comment-id', 'does-not-exist', 'member-id', '<p>Reply</p>', {
                context: {internal: true, member: {id: 'member-id'}}
            });

            sinon.assert.calledWith(models.Comment.add, sinon.match({
                parent_id: 'comment-id',
                in_reply_to_id: null,
                html: '<p>Reply</p>',
                status: 'published'
            }));
        });
    });

    describe('editCommentContent', function () {
        it('checks ownership before returning an unchanged comment', async function () {
            const {instance, commentModel} = createClassInstance();
            commentModel.get.withArgs('member_id').returns('owner-id');

            await assert.rejects(
                () => instance.editCommentContent('comment-id', 'member-id', undefined, {context: {member: {id: 'member-id'}}}),
                errors.NoPermissionError
            );
        });

        it('selects member_id before checking ownership when requested fields omit it', async function () {
            const {instance, models, commentModel} = createClassInstance();

            const result = await instance.editCommentContent('comment-id', 'member-id', undefined, {
                columns: ['id'],
                context: {member: {id: 'member-id'}}
            });

            assert.equal(result, commentModel);
            sinon.assert.notCalled(models.Comment.edit);
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
