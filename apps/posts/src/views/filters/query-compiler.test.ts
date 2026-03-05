import {describe, expect, it} from 'vitest';
import {compileSurfaceQuery} from '@src/views/filters/query-compiler';

describe('compileSurfaceQuery', () => {
    it('keeps members search separate from filter', () => {
        const query = compileSurfaceQuery({
            surface: 'members',
            filter: "status:paid+label:[vip,early]",
            search: 'alex'
        });

        expect(query).toEqual({
            filter: "status:paid+label:[vip,early]",
            search: 'alex'
        });
    });

    it('returns canonicalized filter output', () => {
        const query = compileSurfaceQuery({
            surface: 'members',
            filterClauses: [
                "status:paid",
                "name:~'alex'",
                "status:paid"
            ]
        });

        expect(query).toEqual({
            filter: "name:~'alex'+status:paid"
        });
    });

    it('ignores search on comments queries', () => {
        const query = compileSurfaceQuery({
            surface: 'comments',
            filter: 'status:published',
            search: 'alex'
        });

        expect(query).toEqual({
            filter: 'status:published'
        });
    });
});
