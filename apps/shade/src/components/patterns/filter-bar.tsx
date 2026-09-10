import { useAdmin7 } from '@/providers/admin7-provider';
import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Inline, type InlineProps } from '@/components/primitives/inline';
import { FilterBarContext, useFilterBarContext } from '@/components/patterns/filter-bar-context';
import { cn } from '@/lib/utils';
import { useShade } from '@/providers/shade-provider';

type FilterBarProps = React.PropsWithChildren & {
  className?: string;
};

/**
 * FilterBar is a full-width horizontal row for active filters and related
 * controls (clear, save view, etc.). It renders null when it has no children,
 * so consumers can always mount it without conditional wrapping.
 *
 * Typical usage:
 *   <FilterBar>
 *     <Filters ... />
 *     <FilterBar.Actions>
 *       <FilterBar.Action variant="ghost">Clear</FilterBar.Action>
 *       <FilterBar.Action variant="outline">Save view</FilterBar.Action>
 *     </FilterBar.Actions>
 *   </FilterBar>
 */
function FilterBarRoot({ className, children }: FilterBarProps) {
  const { controlShape } = useShade();
  const { pill: isAdmin7Pill } = useAdmin7();

  if (React.Children.count(children) === 0) {
    return null;
  }

  return (
    <FilterBarContext.Provider value={true}>
      <Inline
        align="start"
        className={cn(
          'w-full',
          isAdmin7Pill &&
            'relative -mt-1 rounded-control bg-filter-bar-background p-2 [&_[data-slot=filter-item]>*]:bg-background! [&_[data-slot=filter-item]>*:hover]:bg-filter-bar-item-hover! [&_[data-slot=filter-item]>*[data-state=open]]:bg-filter-bar-item-hover! [&_[data-slot=filters-add]]:bg-transparent! [&_[data-slot=filters-add]:hover]:bg-filter-bar-item-hover!',
          className,
        )}
        data-control-shape={controlShape}
        data-slot="filter-bar"
        gap="sm"
        justify="between"
      >
        {children}
      </Inline>
    </FilterBarContext.Provider>
  );
}

const FilterBarActions = React.forwardRef<HTMLElement, InlineProps>(
  ({ className, gap = 'sm', ...props }, ref) => {
    const isInFilterBar = useFilterBarContext();
    const { pill: isAdmin7Pill } = useAdmin7();

    return (
      <Inline
        ref={ref}
        className={cn(
          'shrink-0 sm:absolute',
          isInFilterBar && isAdmin7Pill ? 'sm:top-2 sm:right-2' : 'sm:top-0 sm:right-0',
          className,
        )}
        data-slot="filter-bar-actions"
        gap={gap}
        {...props}
      />
    );
  },
);
FilterBarActions.displayName = 'FilterBar.Actions';

const FilterBarAction = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, variant, ...props }, ref) => {
    const isInFilterBar = useFilterBarContext();
    const { pill: isAdmin7Pill } = useAdmin7();
    const usePillFilterBarStyle = isInFilterBar && isAdmin7Pill;

    return (
      <Button
        ref={ref}
        className={cn(usePillFilterBarStyle && variant === 'outline' && 'bg-background', className)}
        size={size ?? (usePillFilterBarStyle ? 'sm' : undefined)}
        variant={variant}
        {...props}
      />
    );
  },
);
FilterBarAction.displayName = 'FilterBar.Action';

const FilterBar = Object.assign(FilterBarRoot, {
  Actions: FilterBarActions,
  Action: FilterBarAction,
});

export { FilterBar };
