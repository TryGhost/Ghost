import {
  deleteFromQueryCache,
  insertToQueryCache,
  updateQueryCache,
} from '../../../../src/utils/api/update-queries';

describe('cache update functions', () => {
  describe('insertToQueryCache', () => {
    it('appends records from the new data', () => {
      const newData = {
        posts: [{ id: '2' }],
      };

      const currentData = {
        posts: [{ id: '1' }],
      };

      const result = insertToQueryCache('posts')(newData, currentData);

      expect(result).toEqual({
        posts: [{ id: '1' }, { id: '2' }],
      });
    });

    it('appends to the last page for paginated queries', () => {
      const newData = {
        posts: [{ id: '3' }],
      };

      const currentData = {
        pages: [{ posts: [{ id: '1' }] }, { posts: [{ id: '2' }] }],
        pageParams: [undefined, 2],
      };

      const result = insertToQueryCache('posts')(newData, currentData);

      expect(result).toEqual({
        pages: [{ posts: [{ id: '1' }] }, { posts: [{ id: '2' }, { id: '3' }] }],
        pageParams: [undefined, 2],
      });
    });

    it('appends to a non-paginated pages response', () => {
      const newData = {
        pages: [{ id: '2' }],
      };

      const currentData = {
        pages: [{ id: '1' }],
        meta: { pagination: { total: 1 } },
      };

      const result = insertToQueryCache('pages')(newData, currentData);

      expect(result).toEqual({
        pages: [{ id: '1' }, { id: '2' }],
        meta: { pagination: { total: 1 } },
      });
    });
  });

  describe('updateQueryCache', () => {
    it('updates based on the ID', () => {
      const newData = {
        posts: [{ id: '2', title: 'New Title' }],
      };

      const currentData = {
        posts: [{ id: '1' }, { id: '2', title: 'Old Title' }],
      };

      const result = updateQueryCache('posts')(newData, currentData);

      expect(result).toEqual({
        posts: [{ id: '1' }, { id: '2', title: 'New Title' }],
      });
    });

    it('updates nested records in paginated queries', () => {
      const newData = {
        posts: [{ id: '2', title: 'New Title' }],
      };

      const currentData = {
        pages: [{ posts: [{ id: '1' }] }, { posts: [{ id: '2', title: 'Old Title' }] }],
        pageParams: [undefined, 2],
      };

      const result = updateQueryCache('posts')(newData, currentData);

      expect(result).toEqual({
        pages: [{ posts: [{ id: '1' }] }, { posts: [{ id: '2', title: 'New Title' }] }],
        pageParams: [undefined, 2],
      });
    });

    it('updates a non-paginated users response', () => {
      const newData = {
        users: [{ id: '2', name: 'New Name' }],
      };

      const currentData = {
        users: [
          { id: '1', name: 'Other' },
          { id: '2', name: 'Old Name' },
        ],
        meta: { pagination: { total: 2 } },
      };

      const result = updateQueryCache('users')(newData, currentData);

      expect(result).toEqual({
        users: [
          { id: '1', name: 'Other' },
          { id: '2', name: 'New Name' },
        ],
        meta: { pagination: { total: 2 } },
      });
    });

    it('updates a non-paginated pages response', () => {
      const newData = {
        pages: [{ id: '2', title: 'New Title' }],
      };

      const currentData = {
        pages: [
          { id: '1', title: 'About' },
          { id: '2', title: 'Old Title' },
        ],
        meta: { pagination: { total: 2 } },
      };

      const result = updateQueryCache('pages')(newData, currentData);

      expect(result).toEqual({
        pages: [
          { id: '1', title: 'About' },
          { id: '2', title: 'New Title' },
        ],
        meta: { pagination: { total: 2 } },
      });
    });

    it('updates nested records in paginated pages queries', () => {
      const newData = {
        pages: [{ id: '2', title: 'New Title' }],
      };

      const currentData = {
        pages: [
          { pages: [{ id: '1', title: 'About' }] },
          { pages: [{ id: '2', title: 'Old Title' }] },
        ],
        pageParams: [undefined, 2],
      };

      const result = updateQueryCache('pages')(newData, currentData);

      expect(result).toEqual({
        pages: [
          { pages: [{ id: '1', title: 'About' }] },
          { pages: [{ id: '2', title: 'New Title' }] },
        ],
        pageParams: [undefined, 2],
      });
    });
  });

  describe('deleteFromQueryCache', () => {
    it('deletes based on the ID', () => {
      const currentData = {
        posts: [{ id: '1' }, { id: '2' }],
      };

      const result = deleteFromQueryCache('posts')(null, currentData, '2');

      expect(result).toEqual({
        posts: [{ id: '1' }],
      });
    });

    it('deletes nested records in paginated queries', () => {
      const currentData = {
        pages: [{ posts: [{ id: '1' }] }, { posts: [{ id: '2' }] }],
        pageParams: [undefined, 2],
      };

      const result = deleteFromQueryCache('posts')(null, currentData, '2');

      expect(result).toEqual({
        pages: [{ posts: [{ id: '1' }] }, { posts: [] }],
        pageParams: [undefined, 2],
      });
    });

    it('deletes from a non-paginated users response', () => {
      const currentData = {
        users: [{ id: '1' }, { id: '2' }],
        meta: { pagination: { total: 2 } },
      };

      const result = deleteFromQueryCache('users')(null, currentData, '2');

      expect(result).toEqual({
        users: [{ id: '1' }],
        meta: { pagination: { total: 2 } },
      });
    });

    it('deletes from a non-paginated pages response', () => {
      const currentData = {
        pages: [
          { id: '1', title: 'About' },
          { id: '2', title: 'Contact' },
        ],
        meta: { pagination: { total: 2 } },
      };

      const result = deleteFromQueryCache('pages')(null, currentData, '2');

      expect(result).toEqual({
        pages: [{ id: '1', title: 'About' }],
        meta: { pagination: { total: 2 } },
      });
    });

    it('deletes nested records in paginated pages queries', () => {
      const currentData = {
        pages: [
          { pages: [{ id: '1', title: 'About' }] },
          { pages: [{ id: '2', title: 'Contact' }] },
        ],
        pageParams: [undefined, 2],
      };

      const result = deleteFromQueryCache('pages')(null, currentData, '2');

      expect(result).toEqual({
        pages: [{ pages: [{ id: '1', title: 'About' }] }, { pages: [] }],
        pageParams: [undefined, 2],
      });
    });
  });
});
