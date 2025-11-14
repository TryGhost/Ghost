import {H1} from './heading';
import {cn} from '@/lib/utils';
import {cva, VariantProps} from 'class-variance-authority';

import React from 'react';

type PropsWithChildrenAndClassName = React.PropsWithChildren & {
    className?: string;
};

interface HeaderAboveProps extends PropsWithChildrenAndClassName {}
function HeaderAbove({className, children}: HeaderAboveProps) {
    return (
        <div
            className={cn('flex items-center gap-2 [grid-area:above]', className)}
            data-header='header-above'
        >
            {children}
        </div>
    );
}

interface HeaderTitleProps extends PropsWithChildrenAndClassName {}
function HeaderTitle({className, children}: HeaderTitleProps) {
    return (
        <H1
            className={cn(
                'text-2xl leading-[1.2em] lg:text-3xl [grid-area:title]',
                className
            )}
            data-header='header-title'
        >
            {children}
        </H1>
    );
}

interface HeaderMetaProps extends PropsWithChildrenAndClassName {}
function HeaderMeta({className, children}: HeaderMetaProps) {
    return (
        <div
            className={cn('flex items-center justify-start text-muted-foreground [grid-area:meta] pb-4 pt-1', className)}
            data-header='header-meta'
        >
            {children}
        </div>
    );
}

interface HeaderActionGroupProps extends PropsWithChildrenAndClassName {}
function HeaderActionGroup({className, children}: HeaderActionGroupProps) {
    return (
        <div
            className={cn('flex items-center gap-2', className)}
            data-header='header-action-group'
        >
            {children}
        </div>
    );
}

interface HeaderActionsProps extends PropsWithChildrenAndClassName {}
function HeaderActions({className, children}: HeaderActionsProps) {
    return (
        <div
            className={cn('flex items-center gap-4 [grid-area:actions] sm:justify-self-end self-start', className)}
            data-header='header-actions'
        >
            {children}
        </div>
    );
}

interface HeaderNavProps extends PropsWithChildrenAndClassName {}
function HeaderNav({className, children}: HeaderNavProps) {
    return (
        <div
            className={cn('flex items-center gap-2 [grid-area:nav] self-start mt-2 lg:mt-0.5', className)}
            data-header='header-nav'
        >
            {children}
        </div>
    );
}

const headerVariants = cva(`sticky top-0 z-50 -mb-4 grid gap-x-4 bg-gradient-to-b from-background via-background/70 to-background/70 p-4 backdrop-blur-md [grid-template-areas:'above''title''meta''actions''nav'] sm:[grid-template-areas:'above_above''title_actions''meta_actions''nav_nav'] lg:-mb-8 lg:p-8 dark:bg-black`, {
    variants: {
        variant: {
            default: `lg:[grid-template-areas:'above_above''title_actions''meta_actions''nav_nav']`,
            'inline-nav': `lg:[grid-template-areas:'above_above_above''title_nav_actions''meta_nav_actions'] lg:[grid-template-columns:1fr_auto_auto]`
        }
    },
    defaultVariants: {
        variant: 'default'
    }
});
interface HeaderProps extends PropsWithChildrenAndClassName, VariantProps<typeof headerVariants> {}
function Header({className, children, variant}: HeaderProps) {
    return (
        <header
            className={cn(headerVariants({variant, className}))}
            data-header='header'
        >
            {children}
        </header>
    );
}

Header.Above = HeaderAbove;
Header.Title = HeaderTitle;
Header.Actions = HeaderActions;
Header.ActionGroup = HeaderActionGroup;
Header.Nav = HeaderNav;
Header.Meta = HeaderMeta;

export {Header, HeaderActions, HeaderTitle, HeaderNav, HeaderMeta};
