import {cn} from '@/lib/utils';
import {PADDING_X_CLASSES, SpaceStep} from './types';
import React from 'react';

export type ContainerSize =
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | '6xl'
    | '7xl'
    | '8xl'
    | '9xl'
    | 'prose'
    | 'page'
    | 'page-with-sidebar';

const MAX_WIDTH_CLASSES: Record<ContainerSize, string> = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    '8xl': 'max-w-8xl',
    '9xl': 'max-w-9xl',
    prose: 'max-w-prose',
    page: 'max-w-page',
    'page-with-sidebar': 'max-w-pageminsidebar'
};

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: ContainerSize;
    centered?: boolean;
    paddingX?: SpaceStep;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
    function Container({
        className,
        size = 'page',
        centered = true,
        paddingX,
        ...props
    }: ContainerProps, ref) {
        return (
            <div
                ref={ref}
                className={cn(
                    'w-full',
                    MAX_WIDTH_CLASSES[size],
                    centered && 'mx-auto',
                    paddingX && PADDING_X_CLASSES[paddingX],
                    className
                )}
                {...props}
            />
        );
    }
);

Container.displayName = 'Container';

export {Container};
