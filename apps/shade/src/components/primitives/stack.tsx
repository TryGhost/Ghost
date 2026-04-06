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

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
    gap?: SpaceStep;
    align?: Align;
    justify?: Justify;
}

function Stack({
    className,
    gap = 'md',
    align = 'stretch',
    justify = 'start',
    ...props
}: StackProps) {
    return (
        <div
            className={cn(
                'flex flex-col',
                GAP_CLASSES[gap],
                ALIGN_ITEMS_CLASSES[align],
                JUSTIFY_CONTENT_CLASSES[justify],
                className
            )}
            {...props}
        />
    );
}

export {Stack};
