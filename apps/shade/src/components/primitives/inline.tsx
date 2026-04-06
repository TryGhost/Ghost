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

export interface InlineProps extends React.HTMLAttributes<HTMLDivElement> {
    gap?: SpaceStep;
    align?: Align;
    justify?: Justify;
    wrap?: boolean;
}

function Inline({
    className,
    gap = 'md',
    align = 'center',
    justify = 'start',
    wrap = false,
    ...props
}: InlineProps) {
    return (
        <div
            className={cn(
                'flex flex-row',
                wrap ? 'flex-wrap' : 'flex-nowrap',
                GAP_CLASSES[gap],
                ALIGN_ITEMS_CLASSES[align],
                JUSTIFY_CONTENT_CLASSES[justify],
                className
            )}
            {...props}
        />
    );
}

export {Inline};
