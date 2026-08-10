import {type Tag, type TagsResponseType, useBrowseTags} from '@tryghost/admin-x-framework/api/tags';
import {type ValueSource} from '@tryghost/shade/patterns';
import {buildQuotedListFilter} from './utils';
import {createGhostBrowseValueSource} from './create-ghost-browse-value-source';
import {escapeNqlString} from '@/shared/filters/filter-normalization';
import {keepPreviousData} from '@tanstack/react-query';

/**
 * Tags for the posts/pages tag filter.
 *
 * The value is the **slug**, because that is what the `?tag=` URL param and
 * sidebar saved views carry — but the chip has to read as the tag's name. The
 * hydrate step covers the case that makes this necessary: opening a saved view
 * whose tag isn't in the first page of results, where the chip would otherwise
 * show a bare slug.
 *
 * Search matches Ember's `tags.name:~<term>` (`controllers/posts.js:131`).
 */
const TAG_PAGE_LIMIT = '100';

function toTagOption(tag: Tag) {
    return {
        value: tag.slug,
        label: tag.name,
        // The slug, and it does more than inform. Names are not unique — a site
        // can carry two tags called "broaf" — and Shade builds each row's
        // `cmdk` value from `label` plus `detail`. Without a detail the two
        // share one value, so `cmdk` treats them as a single row and highlights
        // both at once. The slug is also the thing that tells them apart, so it
        // is shown rather than only carried.
        detail: tag.slug,
        metadata: {id: tag.id}
    };
}

const usePostTagBrowseValueSource = createGhostBrowseValueSource<Tag, TagsResponseType>({
    id: 'posts.tags',
    buildBrowseSearchParams: query => ({
        limit: TAG_PAGE_LIMIT,
        order: 'name asc',
        ...(query ? {filter: `tags.name:~${escapeNqlString(query)}`} : {})
    }),
    buildHydrateFilter: selectedValues => buildQuotedListFilter('slug', selectedValues),
    buildHydrateSearchParams: selectedFilter => ({
        filter: selectedFilter,
        order: 'name asc'
    }),
    // Without this, a slug that resolves to nothing leaves the chip reading
    // "Select…" — the value vanishes from the UI while staying in the URL, so
    // the list looks empty for no visible reason. Ember shows "Unknown tag".
    getMissingSelectedOption: value => ({
        value,
        label: 'Unknown tag'
    }),
    selectItems: data => data?.tags,
    useQuery: ({enabled, searchParams}) => {
        // `useBrowseTags` builds its own comma-joined filter from the `filter`
        // object; passing an empty one and overriding via searchParams keeps
        // the NQL we want.
        return useBrowseTags({
            filter: {},
            enabled,
            placeholderData: keepPreviousData,
            searchParams
        });
    },
    toOption: toTagOption,
    debounceMs: 250
});

export function usePostTagValueSource(): ValueSource<string> {
    return usePostTagBrowseValueSource();
}
