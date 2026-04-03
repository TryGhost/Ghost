import {Label, LabelsResponseType, useBrowseLabelsInfinite} from '@tryghost/admin-x-framework/api/labels';
import {RemoteProbeState, ValueSourceHookOptions} from './create-remote-value-source';
import {ValueSource, ValueSourceParams, ValueSourceState} from '@tryghost/shade/patterns';
import {buildQuotedListFilter, filterOptionsByQuery, mergeFilterOptions} from './utils';
import {createGhostBrowseValueSource} from './create-ghost-browse-value-source';
import {createHybridValueSource} from './create-hybrid-value-source';
import {escapeNqlString} from '@src/views/filters/filter-normalization';

const LABEL_PAGE_LIMIT = '100';

function toLabelOption(label: Label) {
    return {
        value: label.slug,
        label: label.name,
        metadata: {
            id: label.id
        }
    };
}

function useLocalLabelValueSource(
    probe: RemoteProbeState<Label, string>,
    options: ValueSourceHookOptions
): ValueSource<string> {
    const {enabled = true} = options;

    const useOptions = ({query, selectedValues}: ValueSourceParams<string>): ValueSourceState<string> => {
        const allOptions = (probe.items || []).map(toLabelOption);
        const selectedOptions = selectedValues.map((value) => {
            const matchedLabel = probe.items?.find(label => label.slug === value);

            if (matchedLabel) {
                return toLabelOption(matchedLabel);
            }

            return {
                value,
                label: value
            };
        });

        if (!enabled) {
            return {
                options: [],
                isInitialLoad: false,
                isSearching: false,
                isLoadingMore: false,
                hasMore: false,
                loadMore: () => {}
            };
        }

        return {
            options: mergeFilterOptions(selectedOptions, filterOptionsByQuery(allOptions, query)),
            isInitialLoad: probe.isLoading && allOptions.length === 0,
            isSearching: false,
            isLoadingMore: false,
            hasMore: false,
            loadMore: () => {}
        };
    };

    return {
        id: 'posts.labels.local',
        useOptions
    };
}

const useRemoteLabelValueSource = createGhostBrowseValueSource<Label, LabelsResponseType>({
    id: 'posts.labels.remote',
    buildBrowseSearchParams: query => ({
        limit: LABEL_PAGE_LIMIT,
        order: 'name asc',
        ...(query ? {filter: `name:~${escapeNqlString(query)}`} : {})
    }),
    buildHydrateFilter: selectedValues => buildQuotedListFilter('slug', selectedValues),
    buildHydrateSearchParams: selectedFilter => ({
        filter: selectedFilter,
        order: 'name asc'
    }),
    selectItems: data => data?.labels,
    useQuery: ({enabled, searchParams}) => {
        return useBrowseLabelsInfinite({
            enabled,
            keepPreviousData: true,
            searchParams
        });
    },
    toOption: toLabelOption,
    debounceMs: 250
});

const useHybridLabelValueSource = createHybridValueSource<Label, string>({
    id: 'posts.labels.hybrid',
    pageLimit: Number(LABEL_PAGE_LIMIT),
    useLocalSource: useLocalLabelValueSource,
    useRemoteSource: useRemoteLabelValueSource
});

export function useLabelValueSource(): ValueSource<string> {
    return useHybridLabelValueSource();
}
