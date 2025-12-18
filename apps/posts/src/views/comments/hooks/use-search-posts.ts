import {useBrowsePosts} from '@tryghost/admin-x-framework/api/posts';
import {useDebounce} from 'use-debounce';

export function useSearchPosts(searchTerm: string) {
    const [debouncedSearch] = useDebounce(searchTerm, 200);
    
    const filter = debouncedSearch 
        ? `title:~'${debouncedSearch.replace(/'/g, '\\\'')}'`
        : '';
    
    return useBrowsePosts({
        searchParams: {
            ...(filter && {filter}),
            limit: '100',
            fields: 'id,title',
            order: 'published_at DESC'
        }
    });
}
