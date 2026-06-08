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

type InlineElement = 'div' | 'header' | 'section' | 'footer' | 'nav' | 'span';

export interface InlineProps extends React.HTMLAttributes<HTMLElement> {
    as?: InlineElement;
    gap?: SpaceStep;
    align?: Align;
    justify?: Justify;
    wrap?: boolean;
}

const Inline = React.forwardRef<HTMLElement, InlineProps>(
    function Inline({
        as = 'div',
        className,
        gap = 'md',
        align = 'center',
        justify = 'start',
        wrap = false,
        ...props
    }: InlineProps, ref: React.Ref<HTMLElement>) {
        const Component = as as React.ElementType;

        return (
            <Component
                ref={ref}
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
);

Inline.displayName = 'Inline';

export {Inline};
