import {Actions} from '../../src/actions';

describe('Actions', function () {
    function makeComment(overrides = {}) {
        return {
            id: 'comment-1',
            liked: false,
            disliked: false,
            replies: [],
            count: {
                likes: 2,
                dislikes: 1
            },
            ...overrides
        };
    }

    describe('loadMoreComments', function () {
        it('deduplicates comments', async function () {
            const state = {
                comments: [
                    {id: '1'},
                    {id: '2'},
                    {id: '3'}
                ]
            };
            const api = {
                comments: {
                    browse: () => Promise.resolve({
                        comments: [
                            {id: '2'},
                            {id: '3'},
                            {id: '4'}
                        ],
                        meta: {
                            pagination: {}
                        }
                    })
                }
            };
            const newState = await Actions.loadMoreComments({state, api, options: {postId: '1'}, order: 'desc'});
            expect(newState.comments).toEqual([
                {id: '1'},
                {id: '2'},
                {id: '3'},
                {id: '4'}
            ]);
        });
    });

    describe('pinComment', function () {
        it('pins via admin API and refetches the current order', async function () {
            const state = {
                adminApi: {
                    pinComment: vi.fn(() => Promise.resolve())
                },
                order: 'created_at desc'
            };
            const dispatchAction = vi.fn();

            await Actions.pinComment({state, data: {id: '1'}, dispatchAction});

            expect(state.adminApi.pinComment).toHaveBeenCalledWith({id: '1'});
            expect(dispatchAction).toHaveBeenCalledWith('setOrder', {order: 'created_at desc'});
        });
    });

    describe('unpinComment', function () {
        it('unpins via admin API and refetches the current order', async function () {
            const state = {
                adminApi: {
                    unpinComment: vi.fn(() => Promise.resolve())
                },
                order: 'created_at asc'
            };
            const dispatchAction = vi.fn();

            await Actions.unpinComment({state, data: {id: '1'}, dispatchAction});

            expect(state.adminApi.unpinComment).toHaveBeenCalledWith({id: '1'});
            expect(dispatchAction).toHaveBeenCalledWith('setOrder', {order: 'created_at asc'});
        });
    });

    describe('updateCommentLikeState', function () {
        it('restores a previous dislike when a like swap is rolled back', async function () {
            const state = {
                comments: [
                    makeComment({disliked: true})
                ]
            };

            const optimisticState = await Actions.updateCommentLikeState({
                state,
                data: {id: 'comment-1', liked: true, wasDisliked: true}
            });

            expect(optimisticState.comments[0]).toMatchObject({
                liked: true,
                disliked: false,
                count: {
                    likes: 3,
                    dislikes: 0
                }
            });

            const rolledBackState = await Actions.updateCommentLikeState({
                state: {...state, comments: optimisticState.comments},
                data: {id: 'comment-1', liked: false, restoreDisliked: true}
            });

            expect(rolledBackState.comments[0]).toMatchObject({
                liked: false,
                disliked: true,
                count: {
                    likes: 2,
                    dislikes: 1
                }
            });
        });
    });

    describe('updateCommentDislikeState', function () {
        it('restores a previous like when a dislike swap is rolled back', async function () {
            const state = {
                comments: [
                    makeComment({liked: true})
                ]
            };

            const optimisticState = await Actions.updateCommentDislikeState({
                state,
                data: {id: 'comment-1', disliked: true, wasLiked: true}
            });

            expect(optimisticState.comments[0]).toMatchObject({
                liked: false,
                disliked: true,
                count: {
                    likes: 1,
                    dislikes: 2
                }
            });

            const rolledBackState = await Actions.updateCommentDislikeState({
                state: {...state, comments: optimisticState.comments},
                data: {id: 'comment-1', disliked: false, restoreLiked: true}
            });

            expect(rolledBackState.comments[0]).toMatchObject({
                liked: true,
                disliked: false,
                count: {
                    likes: 2,
                    dislikes: 1
                }
            });
        });
    });
});
