import { Button, Kbd, Tooltip, TooltipContent, TooltipTrigger } from '@tryghost/shade/components';
import { type Filter, FilterBar, Filters } from '@tryghost/shade/patterns';
import { useShade } from '@tryghost/shade/app';
import { Inline } from '@tryghost/shade/primitives';
import type { ReactNode } from 'react';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { usePostFilterFields } from '@/posts/list/use-post-filter-fields';
import type { PostResource } from '@/posts/list/post-resource';
import type { User } from '@tryghost/admin-x-framework/api/users';

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
export function PostsFilters({
  resource,
  filters,
  params,
  currentUser,
  iconOnly = false,
  viewActions,
  onFiltersChange,
}: PostsFiltersProps) {
  const { controlShape } = useShade();
  const fields = usePostFilterFields(resource, currentUser, params);
  const hasFilters = filters.length > 0;
  const showIconOnlyTrigger = iconOnly && !hasFilters;

  // Pinned right: inline it would read as another chip's own X, and wrapping
  // chips would drag it down off the first row.
  const trailingActions = hasFilters ? (
    <FilterBar.Actions>
      <FilterBar.Action
        className="hidden items-center lg:inline-flex"
        type="button"
        variant="ghost"
        onClick={() => onFiltersChange([])}
      >
        Clear
      </FilterBar.Action>
      {viewActions}
    </FilterBar.Actions>
  ) : undefined;

  const controls = (
    // Testid on the wrapper — `Filters` doesn't forward arbitrary props.
    <Inline
      align="center"
      className={cn(!iconOnly && 'w-full')}
      data-testid="posts-filters"
      gap="sm"
    >
      <Filters
        addButton={
          !hasFilters && controlShape === 'pill' ? (
            <TooltipTrigger asChild>
              <Button
                aria-keyshortcuts="F"
                aria-label="Filter"
                data-slot="filters-add"
                type="button"
                variant="ghost"
              >
                <LucideIcon.ListFilter className="size-4 stroke-2!" />
                Filter
              </Button>
            </TooltipTrigger>
          ) : undefined
        }
        // Collapsed with `text-[0px]`, not by dropping the label: the
        // word "Filter" stays in the accessible name at every width.
        addButtonClassName={cn(
          showIconOnlyTrigger &&
            'min-w-[34px] gap-0 !px-3 text-[0px] data-[control-shape=pill]:aspect-square data-[control-shape=pill]:h-(--control-height) data-[control-shape=pill]:!px-0 data-[control-shape=pill]:text-[0px]! lg:min-w-0 lg:gap-1.5 lg:px-3 lg:text-base lg:data-[control-shape=pill]:aspect-auto lg:data-[control-shape=pill]:!px-3 lg:data-[control-shape=pill]:text-base! data-[control-shape=pill]:[&_svg]:size-4',
          // In the bar it is icon-only at every width — the chips
          // beside it already say what it adds to.
          hasFilters &&
            'data-[control-shape=rounded]:gap-0 data-[control-shape=rounded]:!px-3 data-[control-shape=rounded]:text-[0px]',
        )}
        addButtonIcon={
          hasFilters ? (
            <LucideIcon.ListFilterPlus className="size-4" />
          ) : (
            <LucideIcon.ListFilter className="size-4" />
          )
        }
        addButtonText={hasFilters ? 'Add filter' : 'Filter'}
        addButtonVariant={controlShape === 'pill' && !hasFilters ? 'ghost' : undefined}
        // Each field maps to one URL param holding one value; a second
        // chip per field would sit there without being in the URL.
        allowMultiple={false}
        // `order-last` keeps the trailing buttons after the chips;
        // `pr-40` reserves the lane the pinned actions occupy.
        className={cn(
          '[&>button]:order-last',
          iconOnly ? 'w-auto' : 'w-full',
          hasFilters && 'sm:!pr-40',
        )}
        clearButton={trailingActions}
        fields={fields}
        filters={filters}
        keyboardShortcut="f"
        popoverAlign="start"
        showClearButton={hasFilters}
        // Hides only the four-item *field* list's search; the tag and
        // author value pickers keep their own.
        showSearchInput={false}
        onChange={onFiltersChange}
      />
    </Inline>
  );

  return !hasFilters && controlShape === 'pill' ? (
    <Tooltip>
      {controls}
      <TooltipContent side="bottom" variant="white">
        <Inline align="center" gap="sm">
          Filter <Kbd>F</Kbd>
        </Inline>
      </TooltipContent>
    </Tooltip>
  ) : (
    controls
  );
}
