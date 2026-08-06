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
    /** Save/Edit view, pinned to the right of the bar beside Clear. */
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

    // Clear and the view actions sit together at the far right of the bar, as
    // on the members list. Pinned rather than pushed: the chips wrap when there
    // are several, and a right-aligned group in normal flow would ride down
    // with them instead of staying level with the first row.
    const trailingActions = (hasFilters || viewActions) ? (
        <Inline className='shrink-0 sm:absolute sm:top-0 sm:right-0' gap='lg'>
            {hasFilters && (
                <Button
                    className='hidden items-center gap-1 !px-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground lg:inline-flex'
                    type='button'
                    variant='ghost'
                    onClick={() => onFiltersChange([])}
                >
                    <LucideIcon.X className='size-4' />
                    Clear
                </Button>
            )}
            {viewActions}
        </Inline>
    ) : undefined;

    return (
        // The testid sits on the wrapper, as it does in Ember (on the
        // `view-actions` section) — `Filters` doesn't forward arbitrary props.
        // `w-full` in the bar, and it is load-bearing rather than cosmetic: the
        // trailing actions are pinned with `right-0`, which resolves against
        // this wrapper. Left to shrink-wrap, "the right edge" is the right edge
        // of the chips themselves, so Clear and Save view sit just after them
        // instead of out at the edge of the page.
        <Inline align='center' className={cn(!iconOnly && 'w-full')} data-testid='posts-filters' gap='sm'>
            <Filters
                // Collapsed with `text-[0px]` rather than by dropping the
                // label, which is how the members list does it: the word
                // "Filter" stays in the accessible name, so the control is
                // still findable by screen readers and by tests at every width.
                //
                // Once there are chips the trigger drops its border and becomes
                // a quiet "Add filter" that trails them, rather than a second
                // bordered control competing with the chips it produced.
                addButtonClassName={cn(showIconOnlyTrigger && 'min-w-[34px] gap-0 !px-3 text-[0px] lg:min-w-0 lg:gap-1.5 lg:px-3 lg:text-base')}
                addButtonIcon={hasFilters ? <LucideIcon.FunnelPlus className='size-4' /> : <LucideIcon.Filter className='size-4' />}
                addButtonText={hasFilters ? 'Add filter' : 'Filter'}
                // Shade defaults this to true. Each field here maps to one URL
                // param holding one value, and the serializer keeps the last —
                // so leaving it on would let someone sit looking at two "Post
                // type" chips while only one was in the URL or a saved view.
                allowMultiple={false}
                // `pr-40` reserves the lane the pinned actions above occupy, so
                // a long row of chips runs up to them rather than under them.
                // Shade only stretches this to full width once there are
                // chips, but the bar needs it whenever it is on screen — a
                // sort-only view has no chips and still pins Save view.
                className={cn(
                    '[&>button]:order-last',
                    iconOnly ? 'w-auto' : 'w-full',
                    hasFilters && 'sm:!pr-40 [&>button]:border-none'
                )}
                clearButton={trailingActions}
                fields={fields}
                filters={filters}
                keyboardShortcut='f'
                popoverAlign='start'
                showClearButton={Boolean(trailingActions)}
                onChange={onFiltersChange}
            />
        </Inline>
    );
}
