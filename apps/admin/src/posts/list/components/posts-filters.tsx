import {type Filter, Filters} from '@tryghost/shade/patterns';
import {Button} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import type {ReactNode} from 'react';
import {cn, LucideIcon} from '@tryghost/shade/utils';
import {usePostFilterFields} from '@/posts/list/use-post-filter-fields';
import type {PostResource} from '@/posts/list/post-resource';
import type {User} from '@tryghost/admin-x-framework/api/users';

interface PostsFiltersProps {
    resource: PostResource;
    filters: Filter<string>[];
    params?: Parameters<typeof usePostFilterFields>[2];
    currentUser?: User;
    /**
     * Renders the trigger for the page header rather than the filter bar: on
     * narrow viewports it collapses to its icon, and expands again from `lg`.
     * Only has an effect while there are no filters — once there are, the
     * component belongs in the filter bar at full size.
     */
    iconOnly?: boolean;
    /**
     * Save/Edit view, pinned to the right of the bar beside Clear. Passed in
     * rather than rendered here, because whether it belongs in the bar at all
     * depends on state this component does not have.
     */
    viewActions?: ReactNode;
    onFiltersChange: (filters: Filter<string>[]) => void;
}

/**
 * The filter chips, using the same Shade `Filters` pattern as the Members list.
 *
 * `allowMultiple` is off: each field maps to one URL param, which can only hold
 * one value, so a second chip on the same field would be unrepresentable — and
 * saved views compare those params verbatim across both implementations.
 */
export function PostsFilters({resource, filters, params, currentUser, iconOnly = false, viewActions, onFiltersChange}: PostsFiltersProps) {
    const fields = usePostFilterFields(resource, currentUser, params);
    const hasFilters = filters.length > 0;
    const showIconOnlyTrigger = iconOnly && !hasFilters;

    // Outlined and pinned right: inline it read as another chip's own X, and
    // in normal flow wrapping chips would drag it down off the first row.
    const trailingActions = hasFilters ? (
        <Inline className='shrink-0 sm:absolute sm:top-0 sm:right-0' gap='sm'>
            <Button
                className='hidden items-center text-muted-foreground hover:text-foreground lg:inline-flex'
                type='button'
                variant='outline'
                onClick={() => onFiltersChange([])}
            >
                Clear
            </Button>
            {viewActions}
        </Inline>
    ) : undefined;

    return (
        // Testid on the wrapper — `Filters` doesn't forward arbitrary props.
        <Inline align='center' className={cn(!iconOnly && 'w-full')} data-testid='posts-filters' gap='sm'>
            <Filters
                // Collapsed with `text-[0px]`, not by dropping the label: the
                // word "Filter" stays in the accessible name at every width.
                addButtonClassName={cn(
                    showIconOnlyTrigger && 'min-w-[34px] gap-0 !px-3 text-[0px] lg:min-w-0 lg:gap-1.5 lg:px-3 lg:text-base',
                    // In the bar it is icon-only at every width — the chips
                    // beside it already say what it adds to.
                    hasFilters && 'gap-0 !px-3 text-[0px]'
                )}
                addButtonIcon={hasFilters ? <LucideIcon.ListFilterPlus className='size-4' /> : <LucideIcon.ListFilter className='size-4' />}
                addButtonText={hasFilters ? 'Add filter' : 'Filter'}
                // Each field maps to one URL param holding one value; a second
                // chip per field would sit there without being in the URL.
                allowMultiple={false}
                // `order-last` keeps the trailing buttons after the chips;
                // `pr-40` reserves the lane the pinned actions occupy.
                className={cn(
                    '[&>button]:order-last',
                    iconOnly ? 'w-auto' : 'w-full',
                    hasFilters && 'sm:!pr-40'
                )}
                clearButton={trailingActions}
                fields={fields}
                filters={filters}
                keyboardShortcut='f'
                popoverAlign='start'
                showClearButton={hasFilters}
                // Hides only the four-item *field* list's search; the tag and
                // author value pickers keep their own.
                showSearchInput={false}
                onChange={onFiltersChange}
            />
        </Inline>
    );
}
