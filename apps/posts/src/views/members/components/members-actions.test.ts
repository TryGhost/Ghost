import {describe, expect, it} from 'vitest';
import {buildMembersExportPath} from './members-actions';

describe('buildMembersExportPath', () => {
    it('includes search-only state in member exports', () => {
        expect(buildMembersExportPath({search: 'alex'})).toBe('/members/upload/?limit=all&search=alex');
    });
});
