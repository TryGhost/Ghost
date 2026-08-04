import {type Filter, Filters} from '@tryghost/shade/patterns';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';
import {usePostFilterFields} from '@/posts/list/use-post-filter-fields';
import type {PostResource} from '@/posts/list/post-resource';
import type {User} from '@tryghost/admin-x-framework/api/users';

interface PostsFiltersProps {
    resource: PostResource;
    filters: Filter[];
    currentUser?: User;
    onFiltersChange: (filters: Filter[]) => void;
}

/**
 * The filter chips, using the same Shade `Filters` pattern as the Members list.
 *
 * `allowMultiple` is off: each field maps to one URL param, which can only hold
 * one value, so a second chip on the same field would be unrepresentable — and
 * saved views compare those params verbatim across both implementations.
 */
export function PostsFilters({resource, filters, currentUser, onFiltersChange}: PostsFiltersProps) {
    const fields = usePostFilterFields(resource, currentUser);

    return (
        // The testid sits on the wrapper, as it does in Ember (on the
        // `view-actions` section) — `Filters` doesn't forward arbitrary props.
        <Inline align='center' data-testid='posts-filters' gap='sm'>
            <Filters
                addButtonIcon={<LucideIcon.Filter className='size-4' />}
                addButtonText='Filter'
                fields={fields}
                filters={filters}
                keyboardShortcut='f'
                popoverAlign='start'
                showClearButton={filters.length > 0}
                onChange={onFiltersChange}
            />
        </Inline>
    );
}
