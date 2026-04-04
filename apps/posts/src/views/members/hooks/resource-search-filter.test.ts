import {describe, expect, it} from 'vitest';

import {buildResourceFilter} from './resource-search-filter';

describe('resource-search-filter', () => {
    it('returns the base filter when there is no search query', () => {
        expect(buildResourceFilter('status:published', '')).toBe('status:published');
    });

    it('escapes trailing backslashes in search queries', () => {
        expect(buildResourceFilter('status:published', 'draft\\')).toBe('status:published+title:~\'draft\\\\\'');
    });
});
