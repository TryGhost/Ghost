import {describe, expect, it} from 'vitest';
import {buildPostFilterFields} from './use-post-filter-fields';
import type {ValueSource} from '@tryghost/shade/patterns';

const stubSource = {id: 'stub', useOptions: () => ({
    options: [], isInitialLoad: false, isSearching: false, isLoadingMore: false, hasMore: false, loadMore: () => {}
})} as ValueSource<string>;

function build(overrides: Parameters<typeof buildPostFilterFields>[0] extends infer T
    ? Partial<T> : never = {}) {
    return buildPostFilterFields({
        resource: 'posts',
        authorValueSource: stubSource,
        tagValueSource: stubSource,
        ...overrides
    });
}

const keysOf = (fields: ReturnType<typeof buildPostFilterFields>) => fields.map(field => field.key);

describe('buildPostFilterFields', () => {
    it('offers the four filterable params, in Ember order', () => {
        expect(keysOf(build())).toEqual(['type', 'visibility', 'author', 'tag']);
    });

    // Sorting is not a filter — it has no operator and belongs in its own
    // control, so it must never appear as a chip.
    it('never offers order as a filter', () => {
        expect(keysOf(build())).not.toContain('order');
    });

    it('labels the type field for the resource', () => {
        expect(build().find(field => field.key === 'type')?.label).toBe('Post type');
        expect(build({resource: 'pages'}).find(field => field.key === 'type')?.label).toBe('Page type');
    });

    it('drops "email only" from the type options on pages', () => {
        const values = (fields: ReturnType<typeof buildPostFilterFields>) =>
            fields.find(field => field.key === 'type')?.options?.map(option => option.value);

        expect(values(build())).toContain('sent');
        expect(values(build({resource: 'pages'}))).not.toContain('sent');
    });

    // Ember hides visibility, author and tag for contributors, and author for
    // authors too — they only ever see their own posts.
    it('hides visibility, author and tag from contributors', () => {
        expect(keysOf(build({isContributor: true}))).toEqual(['type']);
    });

    it('hides the author filter from authors', () => {
        expect(keysOf(build({isAuthorOrContributor: true}))).toEqual(['type', 'visibility', 'tag']);
    });

    it('uses single-select equality throughout', () => {
        build().forEach((field) => {
            expect(field.operators?.map(operator => operator.value)).toEqual(['is']);
        });
    });

    it('gives author and tag async value sources rather than fixed options', () => {
        const author = build().find(field => field.key === 'author');
        const tag = build().find(field => field.key === 'tag');

        expect(author?.valueSource).toBe(stubSource);
        expect(tag?.valueSource).toBe(stubSource);
        expect(author?.options).toBeUndefined();
    });

    it('carries the paid+tiers visibility value as one opaque option', () => {
        expect(build().find(field => field.key === 'visibility')?.options?.map(option => option.value))
            .toEqual(['public', 'members', '[paid,tiers]']);
    });
});
