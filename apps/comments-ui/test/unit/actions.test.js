import {Actions} from '../../src/actions';

describe('Actions', function () {
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
});
