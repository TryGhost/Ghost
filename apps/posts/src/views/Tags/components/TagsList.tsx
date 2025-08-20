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
import {notUndefined, useVirtualizer} from '@tanstack/react-virtual';
import {useEffect, useRef} from 'react';

function getScrollParent(node: Node | null): HTMLElement | null {
    const isElement = node instanceof HTMLElement;
    const overflowY = isElement && window.getComputedStyle(node).overflowY;
    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';

    if (!node) {
        return null;
    } else if (
        isScrollable &&
        (node as HTMLElement).scrollHeight >= (node as HTMLElement).clientHeight
    ) {
        return node as HTMLElement;
    }

    return getScrollParent(node.parentNode) || document.body;
}

const TagsList = ({
    items,
    totalCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage
}: {
    items: Tag[];
    totalCount: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
}) => {
    const tagCount = items.length;
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        getScrollElement: () => getScrollParent(parentRef.current),
        count: totalCount,
        estimateSize: () => 100
    });

    useEffect(() => {
        const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();

        if (!lastItem) {
            return;
        }

        if (
            lastItem.index >= tagCount - 1 &&
            hasNextPage &&
            !isFetchingNextPage
        ) {
            fetchNextPage();
        }
    }, [
        hasNextPage,
        fetchNextPage,
        tagCount,
        isFetchingNextPage,
        rowVirtualizer.getVirtualItems()
    ]);

    const visibleItems = rowVirtualizer.getVirtualItems();
    const [before, after] =
        visibleItems.length > 0
            ? [
                notUndefined(visibleItems[0]).start -
                      rowVirtualizer.options.scrollMargin,
                rowVirtualizer.getTotalSize() -
                      notUndefined(visibleItems[visibleItems.length - 1]).end
            ]
            : [0, 0];
    const colSpan = 4;

    return (
        <div
            ref={parentRef}
            style={{height: `${rowVirtualizer.getTotalSize()}px`}}
        >
            <Table className="flex table-fixed flex-col lg:table">
                <TableHeader className="hidden lg:!visible lg:!table-header-group">
                    <TableRow>
                        <TableHead className="w-1/2 px-4 xl:w-3/5">Tag</TableHead>
                        <TableHead className="w-1/5 px-4">Slug</TableHead>
                        <TableHead className="w-1/5 px-4">No. of posts</TableHead>
                        <TableHead className="w-16 px-4"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="flex flex-col lg:table-row-group">
                    {before > 0 && (
                        <tr className="flex lg:table-row">
                            <td
                                className="flex lg:table-cell"
                                colSpan={colSpan}
                                style={{height: before}}
                            />
                        </tr>
                    )}
                    {visibleItems.map((virtualRow) => {
                        const item = items[virtualRow.index];
                        const isLoaderRow = virtualRow.index > items.length - 1;

                        if (isLoaderRow) {
                            return (
                                <TableRow
                                    key={virtualRow.key}
                                    ref={rowVirtualizer.measureElement}
                                    className="relative flex flex-col lg:table-row"
                                    style={{
                                        height: `${virtualRow.size}px`
                                    }}
                                >
                                    <TableCell className="relative z-10 h-24 animate-pulse">
                                        <div className="h-full rounded-md bg-muted" />
                                    </TableCell>
                                    <TableCell colSpan={3} />
                                </TableRow>
                            );
                        }

                        return (
                            <TableRow
                                key={virtualRow.key}
                                ref={rowVirtualizer.measureElement}
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
                                    <span className="block truncate">{item.slug}</span>
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
                    {after > 0 && (
                        <tr className="flex lg:table-row">
                            <td
                                className="flex lg:table-cell"
                                colSpan={colSpan}
                                style={{height: after}}
                            />
                        </tr>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default TagsList;
