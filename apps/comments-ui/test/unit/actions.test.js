import {Actions} from '../../src/actions';

describe('Actions', function () {
    describe('loadMoreComments', function () {
        it('appends comments from next cursor page', async function () {
            const state = {
                comments: [
                    {id: '1'},
                    {id: '2'},
                    {id: '3'}
                ],
                pagination: {
                    next: 'cursor_abc',
                    prev: null,
                    total: 6,
                    limit: 3
                }
            };
            const api = {
                comments: {
                    browse: () => Promise.resolve({
                        comments: [
                            {id: '4'},
                            {id: '5'},
                            {id: '6'}
                        ],
                        meta: {
                            pagination: {
                                next: null,
                                prev: 'cursor_abc',
                                total: 6,
                                limit: 3
                            }
                        }
                    })
                }
            };
            const newState = await Actions.loadMoreComments({state, api, options: {postId: '1'}, order: 'desc'});
            expect(newState.comments).toEqual([
                {id: '1'},
                {id: '2'},
                {id: '3'},
                {id: '4'},
                {id: '5'},
                {id: '6'}
            ]);
            expect(newState.pagination.next).toBeNull();
        });

        it('does not load more when next cursor is null', async function () {
            const browseSpy = vi.fn();
            const state = {
                comments: [{id: '1'}],
                pagination: {
                    next: null,
                    prev: null,
                    total: 1,
                    limit: 20
                }
            };
            const api = {
                comments: {
                    browse: browseSpy.mockResolvedValue({
                        comments: [],
                        meta: {pagination: {next: null, prev: null, total: 1, limit: 20}}
                    })
                }
            };
            await Actions.loadMoreComments({state, api, options: {postId: '1'}, order: 'desc'});
            // The after param should be undefined when next is null
            expect(browseSpy).toHaveBeenCalledWith(
                expect.objectContaining({after: undefined})
            );
        });
    });

    describe('loadMoreReplies', function () {
        it('replaces replies and stores cursor when no prior cursor exists', async function () {
            const comment = {
                id: 'comment-1',
                replies: [{id: 'reply-1'}, {id: 'reply-2'}, {id: 'reply-3'}],
                count: {replies: 10, likes: 0}
            };
            const state = {
                comments: [comment]
            };
            const api = {
                comments: {
                    replies: vi.fn().mockResolvedValue({
                        comments: [
                            {id: 'reply-1'}, {id: 'reply-2'}, {id: 'reply-3'},
                            {id: 'reply-4'}, {id: 'reply-5'}, {id: 'reply-6'}
                        ],
                        meta: {pagination: {next: 'cursor_xyz', prev: null, total: 10, limit: 100}}
                    })
                }
            };

            const newState = await Actions.loadMoreReplies({state, api, data: {comment}, isReply: false});
            const updatedComment = newState.comments.find(c => c.id === 'comment-1');

            // Should replace all replies (no prior cursor)
            expect(updatedComment.replies).toHaveLength(6);
            expect(updatedComment.replies[0].id).toBe('reply-1');
            expect(updatedComment.replies[5].id).toBe('reply-6');
            // Should store the cursor for next call
            expect(updatedComment.replies_cursor).toBe('cursor_xyz');
            // Should have fetched from the beginning (no cursor)
            expect(api.comments.replies).toHaveBeenCalledWith(
                expect.objectContaining({after: undefined})
            );
        });

        it('appends replies using stored cursor on subsequent calls', async function () {
            const comment = {
                id: 'comment-1',
                replies: [
                    {id: 'reply-1'}, {id: 'reply-2'}, {id: 'reply-3'},
                    {id: 'reply-4'}, {id: 'reply-5'}, {id: 'reply-6'}
                ],
                replies_cursor: 'cursor_xyz',
                count: {replies: 10, likes: 0}
            };
            const state = {
                comments: [comment]
            };
            const api = {
                comments: {
                    replies: vi.fn().mockResolvedValue({
                        comments: [
                            {id: 'reply-7'}, {id: 'reply-8'}, {id: 'reply-9'}, {id: 'reply-10'}
                        ],
                        meta: {pagination: {next: null, prev: 'cursor_xyz', total: 10, limit: 100}}
                    })
                }
            };

            const newState = await Actions.loadMoreReplies({state, api, data: {comment}, isReply: false});
            const updatedComment = newState.comments.find(c => c.id === 'comment-1');

            // Should append new replies to existing
            expect(updatedComment.replies).toHaveLength(10);
            expect(updatedComment.replies[0].id).toBe('reply-1');
            expect(updatedComment.replies[9].id).toBe('reply-10');
            // No more pages - cursor should be null
            expect(updatedComment.replies_cursor).toBeNull();
            // Should have used the stored cursor
            expect(api.comments.replies).toHaveBeenCalledWith(
                expect.objectContaining({after: 'cursor_xyz'})
            );
        });

        it('loads all replies from beginning when limit is "all" and no cursor', async function () {
            const comment = {
                id: 'comment-1',
                replies: [{id: 'reply-1'}],
                count: {replies: 3, likes: 0}
            };
            const state = {
                comments: [comment]
            };
            const api = {
                comments: {
                    replies: vi.fn()
                        .mockResolvedValueOnce({
                            comments: [{id: 'reply-1'}, {id: 'reply-2'}],
                            meta: {pagination: {next: 'cursor_page2', prev: null, total: 3, limit: 100}}
                        })
                        .mockResolvedValueOnce({
                            comments: [{id: 'reply-3'}],
                            meta: {pagination: {next: null, prev: 'cursor_page2', total: 3, limit: 100}}
                        })
                }
            };

            const newState = await Actions.loadMoreReplies({state, api, data: {comment, limit: 'all'}, isReply: true});
            const updatedComment = newState.comments.find(c => c.id === 'comment-1');

            // Should have all replies
            expect(updatedComment.replies).toHaveLength(3);
            // Cursor should be null (all loaded)
            expect(updatedComment.replies_cursor).toBeNull();
        });
    });
});
