import {cn} from '@/lib/utils';
import {PADDING_CLASSES, PADDING_X_CLASSES, PADDING_Y_CLASSES, SpaceStep} from './types';
import React from 'react';

type BoxRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

const RADIUS_CLASSES: Record<BoxRadius, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
};

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: SpaceStep;
    paddingX?: SpaceStep;
    paddingY?: SpaceStep;
    radius?: BoxRadius;
}

const Box = React.forwardRef<HTMLDivElement, BoxProps>(
    function Box({
        className,
        padding,
        paddingX,
        paddingY,
        radius,
        ...props
    }: BoxProps, ref) {
        return (
            <div
                ref={ref}
                className={cn(
                    padding && PADDING_CLASSES[padding],
                    paddingX && PADDING_X_CLASSES[paddingX],
                    paddingY && PADDING_Y_CLASSES[paddingY],
                    radius && RADIUS_CLASSES[radius],
                    className
                )}
                {...props}
            />
        );
    }
);

Box.displayName = 'Box';

export {Box};
