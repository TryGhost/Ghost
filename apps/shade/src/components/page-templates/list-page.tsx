import React from 'react';
import {Stack} from '@/components/primitives/stack';
import {cn} from '@/lib/utils';

type ListPageProps = React.ComponentPropsWithoutRef<'div'>;

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
function ListPageHeader({className, children, ...rest}: ListPageProps) {
    return (
        <Stack
            className={cn(
                '-mx-4 px-4 lg:-mx-5 lg:px-5',
                'sticky top-0 z-50',
                'bg-gradient-to-b from-background via-background/70 to-background/70 backdrop-blur-md dark:bg-black',
                'py-5',
                className
            )}
            data-list-page='header'
            gap='lg'
            {...rest}
        >
            {children}
        </Stack>
    );
}

function ListPageBody({className, children, ...rest}: ListPageProps) {
    return (
        <Stack
            className={cn('min-h-0 min-w-0 grow pb-4 lg:pb-8', className)}
            data-list-page='body'
            gap='none'
            {...rest}
        >
            {children}
        </Stack>
    );
}

type ListPageComponent = React.FC<ListPageProps> & {
    Header: React.FC<ListPageProps>;
    Body: React.FC<ListPageProps>;
};

/**
 * ListPage is the canonical recipe for the **List page** type — the recurring
 * structure used by Members, Tags, Comments, Automations, etc.
 *
 * It is intentionally thin: a vertical Stack with horizontal padding
 * that grows to fill its flex parent. Drop the named slots in as direct children.
 *
 * Composition:
 *  - `<ListPage.Header>` — sticky, blurred, full-bleed chrome band. Place
 *    `PageHeader`, `ViewBar`, and/or `FilterBar` directly inside as siblings.
 *    `FilterBar` auto-collapses when it has no active filters.
 *  - `<ListPage.Body>` — grows to fill remaining space. Use `flex-1 flex items-center justify-center`
 *    on the immediate child to vertically center empty/loading states.
 */
const ListPage: ListPageComponent = Object.assign(
    function ListPage({className, children, ...rest}: ListPageProps) {
        return (
            <Stack
                className={cn('h-full min-h-0 grow px-4 lg:px-6', className)}
                data-list-page='list-page'
                gap='none'
                {...rest}
            >
                {children}
            </Stack>
        );
    },
    {
        Header: ListPageHeader,
        Body: ListPageBody
    }
);

export {
    ListPage,
    ListPageHeader,
    ListPageBody
};
