import React from 'react';
import {cn} from '@/lib/utils';

type PropsWithChildrenAndClassName = React.PropsWithChildren & {
    className?: string;
};

type ListPageProps = PropsWithChildrenAndClassName;

/**
 * Sticky, full-bleed header stack. Place `PageHeader`, `ViewBar`, and/or
 * `FilterBar` directly inside — they stack with a consistent gap.
 *
 * Full-bleed is achieved by negating the parent's horizontal padding
 * (`-mx-4 lg:-mx-8`) and re-applying it (`px-4 lg:px-8`), so the blurred
 * background spans edge-to-edge while content stays aligned with the body.
 *
 * Pass `sticky={false} blurredBackground={false}` to `PageHeader` when using
 * it here — stickiness and blur are handled by `ListPage.Header` instead.
 */
function ListPageHeader({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div
            className={cn(
                '-mx-4 lg:-mx-8 px-4 lg:px-8',
                'sticky top-0 z-50',
                'bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md dark:bg-black',
                'flex flex-col gap-3 py-4',
                className
            )}
            data-list-page='header'
        >
            {children}
        </div>
    );
}

function ListPageBody({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div
            className={cn('flex-1 min-h-0 min-w-0', className)}
            data-list-page='body'
        >
            {children}
        </div>
    );
}

function ListPagePagination({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div
            className={cn('flex items-center justify-center py-4', className)}
            data-list-page='pagination'
        >
            {children}
        </div>
    );
}

type ListPageComponent = React.FC<ListPageProps> & {
    Header: React.FC<PropsWithChildrenAndClassName>;
    Body: React.FC<PropsWithChildrenAndClassName>;
    Pagination: React.FC<PropsWithChildrenAndClassName>;
};

/**
 * ListPage is the canonical recipe for the **List page** type — the recurring
 * structure used by Members, Tags, Comments, Automations, etc.
 *
 * It is intentionally thin: a vertical flex-col stack with horizontal padding.
 * Drop the named slots in as direct children.
 *
 * Composition:
 *  - `<ListPage.Header>` — sticky, blurred, full-bleed chrome band. Place
 *    `PageHeader`, `ViewBar`, and/or `FilterBar` directly inside as siblings.
 *    `FilterBar` auto-collapses when it has no active filters.
 *  - `<ListPage.Body>` — main content area (table, list, or empty state)
 *  - `<ListPage.Pagination>` — optional centered pagination row (load-more, page links)
 */
const ListPage: ListPageComponent = Object.assign(
    function ListPage({className, children}: ListPageProps) {
        return (
            <div
                className={cn('flex flex-col h-full min-h-0 px-4 lg:px-8', className)}
                data-list-page='list-page'
            >
                {children}
            </div>
        );
    },
    {
        Header: ListPageHeader,
        Body: ListPageBody,
        Pagination: ListPagePagination
    }
);

export {
    ListPage,
    ListPageHeader,
    ListPageBody,
    ListPagePagination
};
