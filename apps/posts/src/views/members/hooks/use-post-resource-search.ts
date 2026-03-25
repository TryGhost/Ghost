import {escapeNqlString} from '../../filters/filter-normalization';
import {getPage} from '@tryghost/admin-x-framework/api/pages';
import {getPost} from '@tryghost/admin-x-framework/api/posts';
import {useBrowsePagesInfinite} from '@tryghost/admin-x-framework/api/pages';
import {useBrowsePostsInfinite} from '@tryghost/admin-x-framework/api/posts';
import {useCallback, useMemo} from 'react';
import {useFilterSearch} from '@src/hooks/use-filter-search';
import type {FilterOption} from '@tryghost/shade';

const buildPublishedSearchParams = (term: string) => ({
    filter: term ? `status:published+title:~${escapeNqlString(term)}` : 'status:published',
    fields: 'id,title',
    order: 'published_at DESC'
});

const titleFilter = <T extends {title: string}>(items: T[], term: string) => items.filter(i => i.title.toLowerCase().includes(term.toLowerCase()));

export function usePostResourceSearch(activeValues?: string[]) {
    const postSearch = useFilterSearch({
        useQuery: useBrowsePostsInfinite,
        dataKey: 'posts',
        serverSearchParams: buildPublishedSearchParams,
        localSearchFilter: titleFilter,
        limit: '25',
        toOption: p => ({value: p.id, label: p.title}),
        useGetById: getPost,
        activeValues
    });

    const pageSearch = useFilterSearch({
        useQuery: useBrowsePagesInfinite,
        dataKey: 'pages',
        serverSearchParams: buildPublishedSearchParams,
        localSearchFilter: titleFilter,
        limit: '25',
        toOption: p => ({value: p.id, label: p.title, detail: 'Page'}),
        useGetById: getPage,
        activeValues
    });

    const {onSearchChange: postOnSearch} = postSearch;
    const {onSearchChange: pageOnSearch} = pageSearch;
    const onSearchChange = useCallback((search: string) => {
        postOnSearch(search);
        pageOnSearch(search);
    }, [postOnSearch, pageOnSearch]);

    const options = useMemo((): FilterOption<string>[] => [
        ...postSearch.options,
        ...pageSearch.options
    ], [postSearch.options, pageSearch.options]);

    const {onLoadMore: postOnLoadMore} = postSearch;
    const {onLoadMore: pageOnLoadMore} = pageSearch;
    const onLoadMore = useCallback(() => {
        postOnLoadMore();
        pageOnLoadMore();
    }, [postOnLoadMore, pageOnLoadMore]);

    return {
        options,
        isLoading: postSearch.isLoading || pageSearch.isLoading,
        isFetching: postSearch.isFetching || pageSearch.isFetching,
        searchValue: postSearch.searchValue,
        onSearchChange,
        onLoadMore,
        hasMore: postSearch.hasMore || pageSearch.hasMore,
        isLoadingMore: postSearch.isLoadingMore || pageSearch.isLoadingMore
    };
}
