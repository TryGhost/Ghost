import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Inline } from '@/components/primitives';
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
 *     <FilterBar.Action variant="ghost">Save view</FilterBar.Action>
 *   </FilterBar>
 */
function FilterBarRoot({ className, children }: FilterBarProps) {
  if (React.Children.count(children) === 0) {
    return null;
  }

  return (
    <FilterBarContext.Provider value={true}>
      <Inline
        align="start"
        className={cn('w-full', className)}
        data-slot="filter-bar"
        gap="sm"
        justify="between"
      >
        {children}
      </Inline>
    </FilterBarContext.Provider>
  );
}

const FilterBarAction = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ size, ...props }, ref) => {
    const isInFilterBar = useFilterBarContext();
    const { controlShape } = useShade();

    return (
      <Button
        ref={ref}
        size={size ?? (isInFilterBar && controlShape === 'pill' ? 'sm' : undefined)}
        {...props}
      />
    );
  },
);
FilterBarAction.displayName = 'FilterBar.Action';

const FilterBar = Object.assign(FilterBarRoot, {
  Action: FilterBarAction,
});

export { FilterBar };
