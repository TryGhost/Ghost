import {act, renderHook} from '@testing-library/react';
import {useSearchLinks} from '../../../src/hooks/useSearchLinks';
import {vi} from 'vitest';

describe('useSearchLinks', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('keeps the entered URL selectable when an older search finishes', async () => {
        vi.useFakeTimers();
        let finishSearch;
        const searchLinks = vi.fn((term) => {
            if (!term) {
                return Promise.resolve([]);
            }
            return new Promise(resolve => finishSearch = resolve);
        });
        const {result, rerender} = renderHook(({query}) => useSearchLinks(query, searchLinks), {
            initialProps: {query: 'old search'}
        });

        await act(async () => vi.advanceTimersByTimeAsync(100));
        rerender({query: 'https://example.com'});
        await act(async () => finishSearch([{
            label: 'Posts',
            items: [{title: 'Older result', url: 'https://example.com/old'}]
        }]));

        expect(result.current.listOptions[0].items[0].value).toBe('https://example.com');
        expect(result.current.isSearching).toBe(false);
    });

    it('discards results from a query replaced during the debounce interval', async () => {
        vi.useFakeTimers();
        let finishSearch;
        const searchLinks = vi.fn(term => term ? new Promise(resolve => finishSearch = resolve) : Promise.resolve([]));
        const {result, rerender} = renderHook(({query}) => useSearchLinks(query, searchLinks), {
            initialProps: {query: 'old search'}
        });

        await act(async () => vi.advanceTimersByTimeAsync(100));
        rerender({query: 'new search'});
        await act(async () => finishSearch([{
            label: 'Posts',
            items: [{title: 'Older result', url: 'https://example.com/old'}]
        }]));

        expect(result.current.listOptions).toEqual([]);
    });
});
