import {Post} from '@tryghost/admin-x-framework/api/posts';
import {buildCalendarGrid, formatPostTime, getDateKeyInTimezone, shiftCalendarMonth} from '@src/views/ContentCalendar/utils/calendar';

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

    it('throws a RangeError for invalid date key inputs', () => {
        expect(() => getDateKeyInTimezone('invalid-date', 'UTC')).toThrow(new RangeError('Invalid dateInput passed to getDateKeyInTimezone'));
    });

    it('throws a RangeError for invalid post time inputs', () => {
        expect(() => formatPostTime('invalid-date', 'UTC')).toThrow(new RangeError('Invalid dateInput passed to formatPostTime'));
    });

    it('shifts months across year boundaries', () => {
        expect(shiftCalendarMonth({year: 2026, month: 1}, -1)).toEqual({year: 2025, month: 12});
        expect(shiftCalendarMonth({year: 2026, month: 12}, 1)).toEqual({year: 2027, month: 1});
    });

    it('returns a 6-week calendar grid and groups published, scheduled, and draft posts by day', () => {
        const grid = buildCalendarGrid({
            month: {year: 2026, month: 2},
            timeZone: 'UTC',
            posts: [
                createPost({id: 'scheduled-late', status: 'scheduled', published_at: '2026-02-15T15:00:00.000Z'}),
                createPost({id: 'published-early', status: 'published', published_at: '2026-02-15T10:00:00.000Z'}),
                createPost({id: 'draft-early', status: 'draft', updated_at: '2026-02-15T08:00:00.000Z'}),
                createPost({id: 'next-month', status: 'published', published_at: '2026-03-01T08:00:00.000Z'})
            ]
        });

        const feb15 = grid.find(day => day.dateKey === '2026-02-15');
        const march01 = grid.find(day => day.dateKey === '2026-03-01');

        expect(grid).toHaveLength(42);
        expect(feb15?.posts.map(post => post.id)).toEqual(['scheduled-late', 'published-early', 'draft-early']);
        expect(feb15?.posts.map(post => post.status)).toEqual(['scheduled', 'published', 'draft']);
        expect(march01?.posts.map(post => post.id)).toEqual(['next-month']);
    });

    it('supports ordering by published_at ascending', () => {
        const grid = buildCalendarGrid({
            month: {year: 2026, month: 2},
            timeZone: 'UTC',
            order: 'published_at asc',
            posts: [
                createPost({id: 'late', status: 'scheduled', published_at: '2026-02-15T15:00:00.000Z'}),
                createPost({id: 'early', status: 'published', published_at: '2026-02-15T10:00:00.000Z'})
            ]
        });

        const feb15 = grid.find(day => day.dateKey === '2026-02-15');

        expect(feb15?.posts.map(post => post.id)).toEqual(['early', 'late']);
    });

    it('uses created_at fallback for draft posts', () => {
        const grid = buildCalendarGrid({
            month: {year: 2026, month: 2},
            timeZone: 'UTC',
            posts: [
                createPost({id: 'draft-with-created', status: 'draft', created_at: '2026-02-10T12:00:00.000Z'})
            ]
        });

        const feb10 = grid.find(day => day.dateKey === '2026-02-10');

        expect(feb10?.posts.map(post => post.id)).toEqual(['draft-with-created']);
    });

    it('prefers updated_at over created_at for draft posts', () => {
        const grid = buildCalendarGrid({
            month: {year: 2026, month: 2},
            timeZone: 'UTC',
            posts: [
                createPost({
                    id: 'draft-with-both-dates',
                    status: 'draft',
                    updated_at: '2026-02-12T12:00:00.000Z',
                    created_at: '2026-02-10T12:00:00.000Z'
                })
            ]
        });

        const feb12 = grid.find(day => day.dateKey === '2026-02-12');

        expect(feb12?.posts.map(post => post.id)).toEqual(['draft-with-both-dates']);
    });

    it('ignores posts that do not have any usable date fields', () => {
        const grid = buildCalendarGrid({
            month: {year: 2026, month: 2},
            timeZone: 'UTC',
            posts: [
                createPost({id: 'draft-without-date', status: 'draft'}),
                createPost({id: 'published-without-date', status: 'published'})
            ]
        });

        const postsCount = grid.reduce((count, day) => count + day.posts.length, 0);

        expect(postsCount).toBe(0);
    });
});
