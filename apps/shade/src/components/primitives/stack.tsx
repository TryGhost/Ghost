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

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
    function Stack({
        className,
        gap = 'md',
        align = 'stretch',
        justify = 'start',
        ...props
    }: StackProps, ref) {
        return (
            <div
                ref={ref}
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
);

Stack.displayName = 'Stack';

export {Stack};
