import {Post} from '@tryghost/admin-x-framework/api/posts';
import {buildCalendarGrid, getDateKeyInTimezone, shiftCalendarMonth} from '@src/views/ContentCalendar/utils/calendar';

const createPost = (overrides: Partial<Post> = {}): Post => {
    return {
        id: 'post-id',
        url: 'https://example.com/post/',
        slug: 'post',
        title: 'Post title',
        uuid: 'post-uuid',
        ...overrides
    };
};

describe('content calendar utils', () => {
    it('builds date keys in a provided timezone', () => {
        const result = getDateKeyInTimezone('2026-02-01T01:30:00.000Z', 'America/Los_Angeles');

        expect(result).toBe('2026-01-31');
    });

    it('shifts months across year boundaries', () => {
        expect(shiftCalendarMonth({year: 2026, month: 1}, -1)).toEqual({year: 2025, month: 12});
        expect(shiftCalendarMonth({year: 2026, month: 12}, 1)).toEqual({year: 2027, month: 1});
    });

    it('returns a 6-week calendar grid and groups posts by day', () => {
        const grid = buildCalendarGrid({
            month: {year: 2026, month: 2},
            timeZone: 'UTC',
            posts: [
                createPost({id: 'late', published_at: '2026-02-15T15:00:00.000Z'}),
                createPost({id: 'early', published_at: '2026-02-15T10:00:00.000Z'}),
                createPost({id: 'next-month', published_at: '2026-03-01T08:00:00.000Z'})
            ]
        });

        const feb15 = grid.find(day => day.dateKey === '2026-02-15');
        const march01 = grid.find(day => day.dateKey === '2026-03-01');

        expect(grid).toHaveLength(42);
        expect(feb15?.posts.map(post => post.id)).toEqual(['early', 'late']);
        expect(march01?.posts.map(post => post.id)).toEqual(['next-month']);
    });

    it('ignores posts without published_at', () => {
        const grid = buildCalendarGrid({
            month: {year: 2026, month: 2},
            timeZone: 'UTC',
            posts: [
                createPost({id: 'with-date', published_at: '2026-02-10T12:00:00.000Z'}),
                createPost({id: 'without-date'})
            ]
        });

        const feb10 = grid.find(day => day.dateKey === '2026-02-10');
        const postsCount = grid.reduce((count, day) => count + day.posts.length, 0);

        expect(feb10?.posts.map(post => post.id)).toEqual(['with-date']);
        expect(postsCount).toBe(1);
    });
});
