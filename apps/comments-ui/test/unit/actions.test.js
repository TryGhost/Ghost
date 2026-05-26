import {Actions} from '../../src/actions';

describe('Actions', function () {
    function makeComment(overrides = {}) {
        return {
            id: 'comment-1',
            liked: false,
            disliked: false,
            replies: [],
            count: {
                likes: 2
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

    describe('deleteComment', function () {
        it('keeps a deleted reply as a tombstone when it has descendants', async function () {
            const state = {
                commentCount: 3,
                comments: [
                    makeComment({
                        id: 'root',
                        count: {
                            replies: 2,
                            direct_replies: 1,
                            likes: 0
                        },
                        replies: [
                            makeComment({
                                id: 'reply-1',
                                status: 'published',
                                html: '<p>Reply 1</p>',
                                in_reply_to_id: null
                            }),
                            makeComment({
                                id: 'reply-2',
                                status: 'published',
                                html: '<p>Reply 2</p>',
                                in_reply_to_id: 'reply-1'
                            })
                        ]
                    })
                ]
            };
            const api = {
                comments: {
                    edit: vi.fn(() => Promise.resolve())
                }
            };

            const newState = await Actions.deleteComment({state, api, data: {id: 'reply-1'}, dispatchAction: vi.fn()});

            expect(api.comments.edit).toHaveBeenCalledWith({
                comment: {
                    id: 'reply-1',
                    status: 'deleted'
                }
            });
            expect(newState.comments[0].replies).toMatchObject([
                {
                    id: 'reply-1',
                    status: 'deleted',
                    html: null
                },
                {
                    id: 'reply-2',
                    status: 'published',
                    in_reply_to_id: 'reply-1'
                }
            ]);
            expect(newState.comments[0].count).toMatchObject({
                replies: 1,
                direct_replies: 0
            });
        });

        it('removes a deleted reply when it has no descendants', async function () {
            const state = {
                commentCount: 2,
                comments: [
                    makeComment({
                        id: 'root',
                        count: {
                            replies: 1,
                            direct_replies: 1,
                            likes: 0
                        },
                        replies: [
                            makeComment({
                                id: 'reply-1',
                                status: 'published',
                                html: '<p>Reply 1</p>',
                                in_reply_to_id: null
                            })
                        ]
                    })
                ]
            };
            const api = {
                comments: {
                    edit: vi.fn(() => Promise.resolve())
                }
            };

            const newState = await Actions.deleteComment({state, api, data: {id: 'reply-1'}, dispatchAction: vi.fn()});

            expect(newState.comments[0].replies).toEqual([]);
            expect(newState.comments[0].count).toMatchObject({
                replies: 0,
                direct_replies: 0
            });
        });

        it('decrements direct_replies for direct replies that point to the top-level comment', async function () {
            const state = {
                commentCount: 2,
                comments: [
                    makeComment({
                        id: 'root',
                        count: {
                            replies: 1,
                            direct_replies: 1,
                            likes: 0
                        },
                        replies: [
                            makeComment({
                                id: 'reply-1',
                                status: 'published',
                                html: '<p>Reply 1</p>',
                                in_reply_to_id: 'root'
                            })
                        ]
                    })
                ]
            };
            const api = {
                comments: {
                    edit: vi.fn(() => Promise.resolve())
                }
            };

            const newState = await Actions.deleteComment({state, api, data: {id: 'reply-1'}, dispatchAction: vi.fn()});

            expect(newState.comments[0].replies).toEqual([]);
            expect(newState.comments[0].count).toMatchObject({
                replies: 0,
                direct_replies: 0
            });
        });

        it('removes ancestor tombstones that lose their visible descendants', async function () {
            const state = {
                commentCount: 2,
                comments: [
                    makeComment({
                        id: 'root',
                        count: {
                            replies: 1,
                            direct_replies: 0,
                            likes: 0
                        },
                        replies: [
                            makeComment({
                                id: 'reply-1',
                                status: 'deleted',
                                html: null,
                                in_reply_to_id: null
                            }),
                            makeComment({
                                id: 'reply-2',
                                status: 'published',
                                html: '<p>Reply 2</p>',
                                in_reply_to_id: 'reply-1'
                            })
                        ]
                    })
                ]
            };
            const api = {
                comments: {
                    edit: vi.fn(() => Promise.resolve())
                }
            };

            const newState = await Actions.deleteComment({state, api, data: {id: 'reply-2'}, dispatchAction: vi.fn()});

            expect(newState.comments[0].replies).toEqual([]);
            expect(newState.comments[0].count).toMatchObject({
                replies: 0,
                direct_replies: 0
            });
        });

        it('does not remove unrelated tombstones without loaded descendants', async function () {
            const state = {
                commentCount: 2,
                comments: [
                    makeComment({
                        id: 'root',
                        count: {
                            replies: 1,
                            direct_replies: 1,
                            likes: 0
                        },
                        replies: [
                            makeComment({
                                id: 'reply-1',
                                status: 'deleted',
                                html: null,
                                in_reply_to_id: null
                            }),
                            makeComment({
                                id: 'reply-2',
                                status: 'published',
                                html: '<p>Reply 2</p>',
                                in_reply_to_id: null
                            })
                        ]
                    })
                ]
            };
            const api = {
                comments: {
                    edit: vi.fn(() => Promise.resolve())
                }
            };

            const newState = await Actions.deleteComment({state, api, data: {id: 'reply-2'}, dispatchAction: vi.fn()});

            expect(newState.comments[0].replies).toMatchObject([
                {
                    id: 'reply-1',
                    status: 'deleted',
                    html: null
                }
            ]);
            expect(newState.comments[0].count).toMatchObject({
                replies: 0,
                direct_replies: 0
            });
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
                    likes: 3
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
                    likes: 2
                }
            });
        });

        it('skips a failed like rollback after a newer dislike action', async function () {
            const state = {
                comments: [
                    makeComment({
                        liked: false,
                        disliked: true,
                        count: {
                            likes: 1
                        }
                    })
                ]
            };

            const rolledBackState = await Actions.updateCommentLikeState({
                state,
                data: {id: 'comment-1', liked: false, restoreDisliked: false, expectedLiked: true}
            });

            expect(rolledBackState.comments[0]).toMatchObject({
                liked: false,
                disliked: true,
                count: {
                    likes: 1
                }
            });
        });

        it('skips a failed unlike rollback after a newer dislike action', async function () {
            const state = {
                comments: [
                    makeComment({
                        liked: false,
                        disliked: true,
                        count: {
                            likes: 1
                        }
                    })
                ]
            };

            const rolledBackState = await Actions.updateCommentLikeState({
                state,
                data: {id: 'comment-1', liked: true, expectedLiked: false, expectedDisliked: false}
            });

            expect(rolledBackState.comments[0]).toMatchObject({
                liked: false,
                disliked: true,
                count: {
                    likes: 1
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
                    likes: 1
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
                    likes: 2
                }
            });
        });

        it('skips a failed dislike rollback after a newer like action', async function () {
            const state = {
                comments: [
                    makeComment({
                        liked: true,
                        disliked: false,
                        count: {
                            likes: 3
                        }
                    })
                ]
            };

            const rolledBackState = await Actions.updateCommentDislikeState({
                state,
                data: {id: 'comment-1', disliked: false, restoreLiked: false, expectedDisliked: true}
            });

            expect(rolledBackState.comments[0]).toMatchObject({
                liked: true,
                disliked: false,
                count: {
                    likes: 3
                }
            });
        });

        it('skips a failed undislike rollback after a newer like action', async function () {
            const state = {
                comments: [
                    makeComment({
                        liked: true,
                        disliked: false,
                        count: {
                            likes: 3
                        }
                    })
                ]
            };

            const rolledBackState = await Actions.updateCommentDislikeState({
                state,
                data: {id: 'comment-1', disliked: true, expectedDisliked: false, expectedLiked: false}
            });

            expect(rolledBackState.comments[0]).toMatchObject({
                liked: true,
                disliked: false,
                count: {
                    likes: 3
                }
            });
        });
    });

    describe('vote actions', function () {
        it('does not start a like while another vote action is pending', async function () {
            const state = {
                comments: [
                    makeComment({votePending: true})
                ]
            };
            const api = {
                comments: {
                    like: vi.fn(() => Promise.resolve())
                }
            };
            const dispatchAction = vi.fn();

            await Actions.likeComment({state, api, data: {id: 'comment-1'}, dispatchAction});

            expect(api.comments.like).not.toHaveBeenCalled();
            expect(dispatchAction).not.toHaveBeenCalled();
        });

        it('does not start a dislike while another vote action is pending', async function () {
            const state = {
                comments: [
                    makeComment({votePending: true})
                ]
            };
            const api = {
                comments: {
                    dislike: vi.fn(() => Promise.resolve())
                }
            };
            const dispatchAction = vi.fn();

            await Actions.dislikeComment({state, api, data: {id: 'comment-1'}, dispatchAction});

            expect(api.comments.dislike).not.toHaveBeenCalled();
            expect(dispatchAction).not.toHaveBeenCalled();
        });
    });
});
