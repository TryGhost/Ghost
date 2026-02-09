import {Actions} from '../../src/actions';
import {commentKeys, queryClient} from '../../src/utils/query';

describe('Actions', function () {
    describe('loadMoreComments', function () {
        beforeEach(() => {
            queryClient.clear();
        });

        it('deduplicates comments', async function () {
            const postId = '1';
            const order = 'desc';

            // Pre-populate cache with existing comments
            queryClient.setQueryData(commentKeys.list(postId, order), {
                comments: [
                    {id: '1'},
                    {id: '2'},
                    {id: '3'}
                ],
                pagination: {page: 1}
            });

            const state = {order};
            const api = {
                comments: {
                    browse: () => Promise.resolve({
                        comments: [
                            {id: '2'},
                            {id: '3'},
                            {id: '4'}
                        ],
                        meta: {
                            pagination: {page: 2}
                        }
                    })
                }
            };

            await Actions.loadMoreComments({state, api, options: {postId}, order});

            // Check the cache was updated correctly
            const cached = queryClient.getQueryData(commentKeys.list(postId, order));
            expect(cached.comments).toEqual([
                {id: '1'},
                {id: '2'},
                {id: '3'},
                {id: '4'}
            ]);
        });
    });
});
