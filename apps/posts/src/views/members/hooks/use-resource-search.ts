import {useBrowsePages} from '@tryghost/admin-x-framework/api/pages';
import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useCallback, useMemo, useState} from 'react';
import type {FilterOption} from '@tryghost/shade';

export type ResourceType = 'post' | 'email';

interface UseResourceSearchReturn {
    options: FilterOption<string>[];
    isLoading: boolean;
    searchValue: string;
    onSearchChange: (search: string) => void;
}

function buildFilter(baseFilter: string, search: string): string {
    if (!search) {
        return baseFilter;
    }
    return `${baseFilter}+title:~'${search.replace(/'/g, '\\\'')}'`;
}

/**
 * Hook to search posts/pages or emails for resource-based filters.
 *
 * - `post` type: fetches published posts and pages
 * - `email` type: fetches published/sent posts that have a newsletter (i.e. emails)
 */
export function useResourceSearch(resourceType: ResourceType): UseResourceSearchReturn {
    const [searchValue, setSearchValue] = useState('');

    const isPostType = resourceType === 'post';

    const postFilter = buildFilter(
        isPostType ? 'status:published' : '(status:published,status:sent)+newsletter_id:-null',
        searchValue
    );

    const {data: postsData, isLoading: postsLoading} = useBrowsePosts({
        searchParams: {
            filter: postFilter,
            limit: '25',
            fields: 'id,title',
            order: 'published_at DESC'
        }
    });

    const {data: pagesData, isLoading: pagesLoading} = useBrowsePages({
        searchParams: {
            filter: buildFilter('status:published', searchValue),
            limit: '25',
            fields: 'id,title',
            order: 'published_at DESC'
        },
        enabled: isPostType
    });

    const options = useMemo(() => {
        const posts = postsData?.posts || [];

        if (!isPostType) {
            return posts.map(p => ({
                value: p.id,
                label: p.title
            }));
        }

        const pages = pagesData?.pages || [];
        const result: FilterOption<string>[] = [];

        for (const p of posts) {
            result.push({value: p.id, label: p.title});
        }
        for (const p of pages) {
            result.push({value: p.id, label: p.title, detail: 'Page'});
        }

        return result;
    }, [postsData, pagesData, isPostType]);

    const onSearchChange = useCallback((search: string) => {
        setSearchValue(search);
    }, []);

    return {
        options,
        isLoading: postsLoading || (isPostType && pagesLoading),
        searchValue,
        onSearchChange
    };
}
