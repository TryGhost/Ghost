import {H1} from './heading';
import {cn} from '@/lib/utils';

import React from 'react';

type PropsWithChildrenAndClassName = React.PropsWithChildren & {
    className?: string;
};

type ListHeaderLeftProps = PropsWithChildrenAndClassName;
function ListHeaderLeft({className, children}: ListHeaderLeftProps) {
    return (
        <div
            className={cn('flex min-w-0 flex-col gap-1', className)}
            data-list-header='list-header-left'
        >
            {children}
        </div>
    );
}

type ListHeaderBreadcrumbProps = PropsWithChildrenAndClassName;
function ListHeaderBreadcrumb({className, children}: ListHeaderBreadcrumbProps) {
    return (
        <div
            className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}
            data-list-header='list-header-breadcrumb'
        >
            {children}
        </div>
    );
}

type ListHeaderTitleProps = PropsWithChildrenAndClassName;
function ListHeaderTitle({className, children}: ListHeaderTitleProps) {
    return (
        <H1
            className={cn(
                'text-2xl leading-[1.2em] lg:text-3xl',
                className
            )}
            data-list-header='list-header-title'
        >
            {children}
        </H1>
    );
}

type ListHeaderDescriptionProps = PropsWithChildrenAndClassName;
function ListHeaderDescription({className, children}: ListHeaderDescriptionProps) {
    return (
        <p
            className={cn('text-sm text-muted-foreground', className)}
            data-list-header='list-header-description'
        >
            {children}
        </p>
    );
}

type ListHeaderActionGroupProps = PropsWithChildrenAndClassName;
function ListHeaderActionGroup({className, children}: ListHeaderActionGroupProps) {
    return (
        <div
            className={cn('flex items-center gap-2', className)}
            data-list-header='list-header-action-group'
        >
            {children}
        </div>
    );
}

type ListHeaderActionsProps = PropsWithChildrenAndClassName;
function ListHeaderActions({className, children}: ListHeaderActionsProps) {
    return (
        <div
            className={cn('flex shrink-0 items-center gap-4', className)}
            data-list-header='list-header-actions'
        >
            {children}
        </div>
    );
}

type ListHeaderProps = PropsWithChildrenAndClassName;
function ListHeader({className, children}: ListHeaderProps) {
    return (
        <header
            className={cn(
                'sticky top-0 z-50 -mb-4 flex items-start justify-between gap-4 bg-gradient-to-b from-background via-background/70 to-background/70 p-4 backdrop-blur-md lg:-mb-8 lg:p-8 dark:bg-black',
                className
            )}
            data-list-header='list-header'
        >
            {children}
        </header>
    );
}

ListHeader.Left = ListHeaderLeft;
ListHeader.Breadcrumb = ListHeaderBreadcrumb;
ListHeader.Title = ListHeaderTitle;
ListHeader.Actions = ListHeaderActions;
ListHeader.ActionGroup = ListHeaderActionGroup;
ListHeader.Description = ListHeaderDescription;

export {
    ListHeader,
    ListHeaderLeft,
    ListHeaderBreadcrumb,
    ListHeaderActions,
    ListHeaderActionGroup,
    ListHeaderTitle,
    ListHeaderDescription
};
