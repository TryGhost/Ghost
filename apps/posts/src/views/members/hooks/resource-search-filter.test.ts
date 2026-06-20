import {describe, expect, it} from 'vitest';

import {buildResourceFilter} from './resource-search-filter';

describe('resource-search-filter', () => {
    it('returns the base filter when there is no search query', () => {
        expect(buildResourceFilter('status:published', '')).toBe('status:published');
    });

    it('keeps trailing backslashes literal in search queries', () => {
        // NQL has no \\ escape - a lone backslash is a literal character
        expect(buildResourceFilter('status:published', 'draft\\')).toBe(String.raw`status:published+title:~'draft\'`);
    });
});
