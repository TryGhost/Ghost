import {describe, expect, it} from 'vitest';
import {ORDER_OPTIONS, VISIBILITY_OPTIONS, getOrderLabel, getTypeOptions} from './post-filter-fields';
import {getStatusesForType} from './post-query-params';

describe('getTypeOptions', () => {
    it('offers posts the five Ember types', () => {
        expect(getTypeOptions('posts').map(option => option.value))
            .toEqual(['draft', 'published', 'sent', 'scheduled', 'featured']);
    });

    // Pages are never emailed.
    it('drops "email only" for pages', () => {
        expect(getTypeOptions('pages').map(option => option.value))
            .toEqual(['draft', 'published', 'scheduled', 'featured']);
    });

    it('labels the options for the resource', () => {
        expect(getTypeOptions('posts')[0].label).toBe('Draft posts');
        expect(getTypeOptions('pages')[0].label).toBe('Draft pages');
    });

    // If these drift apart, a filter the UI offers would resolve to the wrong
    // statuses - or to all of them, silently.
    it('only offers types the query layer understands', () => {
        const known = ['draft', 'published', 'sent', 'scheduled'];

        getTypeOptions('posts').forEach((option) => {
            if (option.value === 'featured') {
                expect(getStatusesForType(option.value)).toHaveLength(4);
                return;
            }

            expect(known).toContain(option.value);
            expect(getStatusesForType(option.value)).toEqual([option.value]);
        });
    });
});

describe('VISIBILITY_OPTIONS', () => {
    it('carries the paid+tiers value as a single opaque string', () => {
        expect(VISIBILITY_OPTIONS.map(option => option.value))
            .toEqual(['public', 'members', '[paid,tiers]']);
    });
});

describe('getOrderLabel', () => {
    // "Newest first" is the absence of an order param, not a value.
    it('names the default when no order is set', () => {
        expect(getOrderLabel(null)).toBe('Newest first');
        expect(getOrderLabel(undefined)).toBe('Newest first');
    });

    it('names the known orders', () => {
        expect(getOrderLabel('published_at asc')).toBe('Oldest first');
        expect(getOrderLabel('updated_at desc')).toBe('Recently updated');
    });

    it('shows an unrecognised order rather than hiding it', () => {
        expect(getOrderLabel('title asc')).toBe('title asc');
    });

    it('has an entry for every non-default order', () => {
        expect(ORDER_OPTIONS).toHaveLength(2);
    });
});
