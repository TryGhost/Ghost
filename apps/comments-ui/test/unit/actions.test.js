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
});
