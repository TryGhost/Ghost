import React from 'react';
import {Inline} from '@/components/primitives';
import {cn} from '@/lib/utils';

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
 *     <Button variant="ghost">Save view</Button>
 *   </FilterBar>
 */
function FilterBar({className, children}: FilterBarProps) {
    if (React.Children.count(children) === 0) {
        return null;
    }

    return (
        <Inline
            align='start'
            className={cn('w-full', className)}
            data-slot='filter-bar'
            gap='sm'
            justify='between'
        >
            {children}
        </Inline>
    );
}

export {FilterBar};
