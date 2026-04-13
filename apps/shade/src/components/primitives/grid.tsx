import {cn} from '@/lib/utils';
import {
    ALIGN_ITEMS_CLASSES,
    GAP_CLASSES,
    JUSTIFY_CONTENT_CLASSES,
    Align,
    Justify,
    SpaceStep
} from './types';
import React from 'react';

type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 12;

const GRID_COLUMNS_CLASSES: Record<GridColumns, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    12: 'grid-cols-12'
};

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
    columns?: GridColumns;
    gap?: SpaceStep;
    align?: Align;
    justify?: Justify;
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
    function Grid({
        className,
        columns = 1,
        gap = 'md',
        align = 'stretch',
        justify = 'start',
        ...props
    }: GridProps, ref) {
        return (
            <div
                ref={ref}
                className={cn(
                    'grid',
                    GRID_COLUMNS_CLASSES[columns],
                    GAP_CLASSES[gap],
                    ALIGN_ITEMS_CLASSES[align],
                    JUSTIFY_CONTENT_CLASSES[justify],
                    className
                )}
                {...props}
            />
        );
    }
);

Grid.displayName = 'Grid';

export {Grid};
