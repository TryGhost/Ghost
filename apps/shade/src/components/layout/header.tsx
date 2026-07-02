import {H1} from './heading';
import {Inline} from '@/components/primitives';
import {cn} from '@/lib/utils';
import {cva, VariantProps} from 'class-variance-authority';

import React from 'react';

type PropsWithChildrenAndClassName = React.PropsWithChildren & {
    className?: string;
};

function HeaderAbove({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('[grid-area:above]', className)}
            data-header='header-above'
            gap='sm'
        >
            {children}
        </Inline>
    );
}

function HeaderTitle({className, children}: PropsWithChildrenAndClassName) {
    return (
        <H1
            className={cn(
                'text-2xl leading-[1.2em] [grid-area:title] lg:text-3xl',
                className
            )}
            data-header='header-title'
        >
            {children}
        </H1>
    );
}

function HeaderMeta({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('pt-1 pb-4 text-muted-foreground [grid-area:meta]', className)}
            data-header='header-meta'
            gap='none'
            justify='start'
        >
            {children}
        </Inline>
    );
}

function HeaderActionGroup({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={className}
            data-header='header-action-group'
            gap='sm'
        >
            {children}
        </Inline>
    );
}

function HeaderActions({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('self-start [grid-area:actions] sm:justify-self-end', className)}
            data-header='header-actions'
            gap='lg'
        >
            {children}
        </Inline>
    );
}

function HeaderNav({className, children}: PropsWithChildrenAndClassName) {
    return (
        <Inline
            align='center'
            className={cn('mt-2 self-start [grid-area:nav] lg:mt-0.5', className)}
            data-header='header-nav'
            gap='sm'
        >
            {children}
        </Inline>
    );
}

const headerVariants = cva(`sticky top-0 z-50 -mb-4 grid gap-x-4 bg-gradient-to-b from-background via-background/70 to-background/70 p-4 backdrop-blur-md [grid-template-areas:'above''title''meta''actions''nav'] sm:[grid-template-areas:'above_above''title_actions''meta_actions''nav_nav'] lg:-mb-8 lg:p-8 dark:bg-black`, {
    variants: {
        variant: {
            default: `lg:[grid-template-areas:'above_above''title_actions''meta_actions''nav_nav']`,
            'inline-nav': `lg:[grid-template-columns:1fr_auto_auto] lg:[grid-template-areas:'above_above_above''title_nav_actions''meta_nav_actions']`
        }
    },
    defaultVariants: {
        variant: 'default'
    }
});

interface HeaderProps extends PropsWithChildrenAndClassName, VariantProps<typeof headerVariants> {}
type HeaderComponent = React.ForwardRefExoticComponent<HeaderProps & React.RefAttributes<HTMLElement>> & {
    Above: typeof HeaderAbove;
    Title: typeof HeaderTitle;
    Actions: typeof HeaderActions;
    ActionGroup: typeof HeaderActionGroup;
    Nav: typeof HeaderNav;
    Meta: typeof HeaderMeta;
};

/**
 * @deprecated Prefer composing new header shells with `Grid`, `Inline`, `Stack`, and `Text` primitives.
 */
const Header: HeaderComponent = Object.assign(
    React.forwardRef<HTMLElement, HeaderProps>(function Header({className, children, variant}, ref) {
        return (
            <header
                ref={ref}
                className={cn(headerVariants({variant, className}))}
                data-header='header'
            >
                {children}
            </header>
        );
    }),
    {
        Above: HeaderAbove,
        Title: HeaderTitle,
        Actions: HeaderActions,
        ActionGroup: HeaderActionGroup,
        Nav: HeaderNav,
        Meta: HeaderMeta
    }
);

export {Header, HeaderActions, HeaderTitle, HeaderNav, HeaderMeta};
