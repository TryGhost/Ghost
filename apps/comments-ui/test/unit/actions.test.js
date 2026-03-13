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
            const publicApi = {
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
            };
            const newState = await Actions.loadMoreComments({state, publicApi, options: {postId: '1'}, order: 'desc'});
            expect(newState.comments).toEqual([
                {id: '1'},
                {id: '2'},
                {id: '3'},
                {id: '4'}
            ]);
        });
    });
});
