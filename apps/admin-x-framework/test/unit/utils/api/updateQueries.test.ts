import {deleteFromQueryCache, insertToQueryCache, updateQueryCache} from '../../../../src/utils/api/updateQueries';

describe('cache update functions', function () {
    describe('insertToQueryCache', function () {
        it('appends records from the new data', function () {
            const newData = {
                posts: [{id: '2'}]
            };

            const currentData = {
                posts: [{id: '1'}]
            };

            const result = insertToQueryCache('posts')(newData, currentData);

            expect(result).toEqual({
                posts: [{id: '1'}, {id: '2'}]
            });
        });

        it('appends to the last page for paginated queries', function () {
            const newData = {
                posts: [{id: '3'}]
            };

            const currentData = {
                pages: [{posts: [{id: '1'}]}, {posts: [{id: '2'}]}]
            };

            const result = insertToQueryCache('posts')(newData, currentData);

            expect(result).toEqual({
                pages: [{posts: [{id: '1'}]}, {posts: [{id: '2'}, {id: '3'}]}]
            });
        });
    });

    describe('updateQueryCache', function () {
        it('updates based on the ID', function () {
            const newData = {
                posts: [{id: '2', title: 'New Title'}]
            };

            const currentData = {
                posts: [{id: '1'}, {id: '2', title: 'Old Title'}]
            };

            const result = updateQueryCache('posts')(newData, currentData);

            expect(result).toEqual({
                posts: [{id: '1'}, {id: '2', title: 'New Title'}]
            });
        });

        it('updates nested records in paginated queries', function () {
            const newData = {
                posts: [{id: '2', title: 'New Title'}]
            };

            const currentData = {
                pages: [{posts: [{id: '1'}]}, {posts: [{id: '2', title: 'Old Title'}]}]
            };

            const result = updateQueryCache('posts')(newData, currentData);

            expect(result).toEqual({
                pages: [{posts: [{id: '1'}]}, {posts: [{id: '2', title: 'New Title'}]}]
            });
        });
    });

    describe('deleteFromQueryCache', function () {
        it('deletes based on the ID', function () {
            const currentData = {
                posts: [{id: '1'}, {id: '2'}]
            };

            const result = deleteFromQueryCache('posts')(null, currentData, '2');

            expect(result).toEqual({
                posts: [{id: '1'}]
            });
        });

        it('deletes nested records in paginated queries', function () {
            const currentData = {
                pages: [{posts: [{id: '1'}]}, {posts: [{id: '2'}]}]
            };

            const result = deleteFromQueryCache('posts')(null, currentData, '2');

            expect(result).toEqual({
                pages: [{posts: [{id: '1'}]}, {posts: []}]
            });
        });
    });
});
