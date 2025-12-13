import {useBrowseMembers} from '@tryghost/admin-x-framework/api/members';
import {useDebounce} from 'use-debounce';

export function useSearchMembers(searchTerm: string) {
    const [debouncedSearch] = useDebounce(searchTerm, 300);
    
    return useBrowseMembers({
        searchParams: {
            ...(debouncedSearch && {search: debouncedSearch}),
            limit: '20',
            order: 'created_at DESC'
        }
    });
}
