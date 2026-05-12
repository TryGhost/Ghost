import React from 'react';
import {cn} from '@/lib/utils';

type PropsWithChildrenAndClassName = React.PropsWithChildren & {
    className?: string;
};

type ListPageProps = PropsWithChildrenAndClassName;

function ListPageToolbar({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div
            className={cn('px-4 lg:px-8', className)}
            data-list-page='toolbar'
        >
            {children}
        </div>
    );
}

function ListPageBody({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div
            className={cn('px-4 lg:px-8 flex-1 min-h-0 min-w-0', className)}
            data-list-page='body'
        >
            {children}
        </div>
    );
}

function ListPagePagination({className, children}: PropsWithChildrenAndClassName) {
    return (
        <div
            className={cn('flex items-center justify-center px-4 py-4 lg:px-8', className)}
            data-list-page='pagination'
        >
            {children}
        </div>
    );
}

type ListPageComponent = React.FC<ListPageProps> & {
    Toolbar: React.FC<PropsWithChildrenAndClassName>;
    Body: React.FC<PropsWithChildrenAndClassName>;
    Pagination: React.FC<PropsWithChildrenAndClassName>;
};

/**
 * ListPage is the canonical recipe for the **List page** type — the recurring
 * structure used by Members, Tags, Comments, Automations, etc.
 *
 * It is intentionally thin: a vertical layout container that provides the
 * standard gap and padding for list-page chrome. Bring your own `PageHeader`,
 * `FilterBar`, table/list, and empty state.
 *
 * Composition:
 *  - `<PageHeader>...</PageHeader>` (typically first child)
 *  - `<ListPage.Toolbar>` — optional padded row for `FilterBar` or other controls
 *  - `<ListPage.Body>` — main content area (table, list, or empty state)
 *  - `<ListPage.Pagination>` — optional centered pagination row (load-more, page links)
 */
const ListPage: ListPageComponent = Object.assign(
    function ListPage({className, children}: ListPageProps) {
        return (
            <div
                className={cn('flex flex-col gap-4 h-full min-h-0', className)}
                data-list-page='list-page'
            >
                {children}
            </div>
        );
    },
    {
        Toolbar: ListPageToolbar,
        Body: ListPageBody,
        Pagination: ListPagePagination
    }
);

export {
    ListPage,
    ListPageToolbar,
    ListPageBody,
    ListPagePagination
};
