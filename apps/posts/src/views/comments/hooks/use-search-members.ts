import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useDebounce} from 'use-debounce';

export function useSearchMembers(searchTerm: string) {
    const [debouncedSearch] = useDebounce(searchTerm, 200);
    
    return useBrowseMembers({
        searchParams: {
            ...(debouncedSearch && {search: debouncedSearch}),
            limit: '100',
            order: 'created_at DESC'
        }
    });
}
