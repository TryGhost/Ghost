import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useCommentFilterFields} from '@src/views/comments/use-comment-filter-fields';
import type {ValueSource} from '@tryghost/shade/patterns';

const emptyValueSource: ValueSource<string> = {
    id: 'empty',
    useOptions: () => ({
        options: [],
        isInitialLoad: false,
        isSearching: false,
        isLoadingMore: false,
        hasMore: false,
        loadMore: vi.fn()
    })
};

describe('useCommentFilterFields', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('sets date filter defaults in the site timezone', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-03-10T06:00:00.000Z'));

        const {result} = renderHook(() => useCommentFilterFields({
            memberValueSource: emptyValueSource,
            postValueSource: emptyValueSource,
            siteTimezone: 'America/Los_Angeles'
        }));

        expect(result.current.find(field => field.key === 'created_at')).toMatchObject({
            defaultValue: '2024-03-09'
        });
    });
});
