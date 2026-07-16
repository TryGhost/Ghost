import React from 'react';
import {Stack} from '@/components/primitives/stack';
import {cn} from '@/lib/utils';

type DetailPageProps = React.ComponentPropsWithoutRef<'div'>;

/**
 * Non-sticky page-level header band. Place `PageHeader` (usually with
 * `sticky={false} blurredBackground={false}`) directly inside — vertical padding
 * matches the list-page rhythm (`py-5`) so a detail page's breadcrumb sits at
 * the same visual height as the tags/members list title.
 */
function DetailPageHeader({className, children, ...rest}: DetailPageProps) {
    return (
        <Stack
            className={cn('py-5', className)}
            data-detail-page='header'
            gap='lg'
            {...rest}
        >
            {children}
        </Stack>
    );
}

/**
 * Body for a detail page — grows to fill the remaining vertical space and
 * scrolls its own content. The horizontal padding is inherited from the outer
 * `DetailPage`, so the header and body always line up on the same left edge.
 */
function DetailPageBody({className, children, ...rest}: DetailPageProps) {
    return (
        <Stack
            className={cn('min-h-0 min-w-0 grow overflow-y-auto pb-4 lg:pb-8', className)}
            data-detail-page='body'
            gap='none'
            {...rest}
        >
            {children}
        </Stack>
    );
}

type DetailPageComponent = React.FC<DetailPageProps> & {
    Header: React.FC<DetailPageProps>;
    Body: React.FC<DetailPageProps>;
};

/**
 * DetailPage is the canonical recipe for a **detail / edit** page — the sibling
 * of `ListPage` for screens that show or edit a single entity (member, post,
 * newsletter, etc.).
 *
 * Structure:
 *  - Outer container is a vertical Stack with the same horizontal padding as
 *    `ListPage` (`px-4 lg:px-6`) so a detail screen visually aligns with the
 *    list it was navigated in from.
 *  - `<DetailPage.Header>` — non-sticky header band. Use `PageHeader` with
 *    `sticky={false} blurredBackground={false}` for the breadcrumb + actions.
 *  - `<DetailPage.Body>` — scroll container that grows to fill.
 *
 * Composition example:
 * ```tsx
 * <DetailPage>
 *   <DetailPage.Header>
 *     <PageHeader blurredBackground={false} sticky={false}>...</PageHeader>
 *   </DetailPage.Header>
 *   <DetailPage.Body>...</DetailPage.Body>
 * </DetailPage>
 * ```
 */
const DetailPage: DetailPageComponent = Object.assign(
    function DetailPage({className, children, ...rest}: DetailPageProps) {
        return (
            <Stack
                className={cn('h-full min-h-0 grow px-4 lg:px-6', className)}
                data-detail-page='detail-page'
                gap='none'
                {...rest}
            >
                {children}
            </Stack>
        );
    },
    {
        Header: DetailPageHeader,
        Body: DetailPageBody
    }
);

export {DetailPage};
