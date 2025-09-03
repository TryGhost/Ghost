import {
    Button,
    LucideIcon,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    formatNumber
} from '@tryghost/shade';
import {Tag} from '@tryghost/admin-x-framework/api/tags';
import {forwardRef, useRef} from 'react';
import {useInfiniteVirtualScroll} from './VirtualTable/useInfiniteVirtualScroll';

const SpacerRow = ({height}: { height: number }) => (
    <tr className="flex lg:table-row">
        <td className="flex lg:table-cell" style={{height}} />
    </tr>
);

// TODO: Remove forwardRef once we have upgraded to React 19
const PlaceholderRow = forwardRef<HTMLTableRowElement>(function PlaceholderRow(
    props,
    ref
) {
    return (
        <TableRow
            ref={ref}
            {...props}
            className="relative flex flex-col lg:table-row"
        >
            <TableCell className="relative z-10 h-24 animate-pulse">
                <div className="h-full rounded-md bg-muted" />
            </TableCell>
        </TableRow>
    );
});

function TagsList({
    items,
    totalItems,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
}: {
    items: Tag[];
    totalItems: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
}) {
    const parentRef = useRef<HTMLDivElement>(null);
    const {visibleItems, spaceBefore, spaceAfter} = useInfiniteVirtualScroll({
        items,
        totalItems,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        parentRef
    });

    return (
        <div ref={parentRef}>
            <Table className="flex table-fixed flex-col lg:table">
                <TableHeader className="hidden lg:!visible lg:!table-header-group">
                    <TableRow>
                        <TableHead className="w-1/2 px-4 xl:w-3/5">
                            Tag
                        </TableHead>
                        <TableHead className="w-1/5 px-4">Slug</TableHead>
                        <TableHead className="w-1/5 px-4">
                            No. of posts
                        </TableHead>
                        <TableHead className="w-16 px-4"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="flex flex-col lg:table-row-group">
                    <SpacerRow height={spaceBefore} />
                    {visibleItems.map(({key, virtualItem, item, props}) => {
                        const shouldRenderPlaceholder =
                            virtualItem.index > items.length - 1;

                        if (shouldRenderPlaceholder) {
                            return <PlaceholderRow key={key} {...props} />;
                        }

                        return (
                            <TableRow
                                key={key}
                                {...props}
                                className="relative grid w-full grid-cols-[1fr_5rem] items-center gap-x-4 p-2 md:grid-cols-[1fr_auto_5rem] lg:table-row lg:p-0"
                            >
                                <TableCell className="static col-start-1 col-end-1 row-start-1 row-end-1 flex min-w-0 flex-col p-0 lg:table-cell lg:w-1/2 lg:p-4 xl:w-3/5">
                                    <a
                                        className="block truncate pb-1 text-lg font-medium before:absolute before:inset-0 before:z-10"
                                        href={`#/tags/${item.slug}`}
                                    >
                                        {item.name}
                                    </a>
                                    <span className="block truncate text-muted-foreground">
                                        {item.description}
                                    </span>
                                </TableCell>
                                <TableCell className="col-start-1 col-end-1 row-start-2 row-end-2 flex p-0 lg:table-cell lg:p-4">
                                    <span className="block truncate">
                                        {item.slug}
                                    </span>
                                </TableCell>
                                <TableCell className="col-start-1 col-end-1 row-start-3 row-end-3 flex p-0 md:col-start-2 md:col-end-2 md:row-start-1 md:row-end-3 lg:table-cell lg:p-4">
                                    {item.count?.posts ? (
                                        <a
                                            className="relative z-10 -m-4 inline-block p-4 hover:underline"
                                            href={`#/posts?tag=${item.slug}`}
                                        >
                                            {`${formatNumber(item.count?.posts)}  ${item.count?.posts === 1 ? 'post' : 'posts'}`}
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            0 posts
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="col-start-2 col-end-2 row-start-1 row-end-3 w-4 p-0 md:col-start-3 md:col-end-3 lg:table-cell lg:p-4">
                                    <Button
                                        className="w-12"
                                        size="icon"
                                        variant="outline"
                                    >
                                        <LucideIcon.Pencil />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    <SpacerRow height={spaceAfter} />
                </TableBody>
            </Table>
        </div>
    );
}

export default TagsList;
