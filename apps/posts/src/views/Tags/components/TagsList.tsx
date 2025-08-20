import {
    Button,
    formatNumber,
    LucideIcon,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@tryghost/shade";
import { Tag } from "@tryghost/admin-x-framework/api/tags";
import { useEffect, useRef } from "react";
import { notUndefined, useVirtualizer } from "@tanstack/react-virtual";

function getScrollParent(node: Node | null): HTMLElement | null {
    const isElement = node instanceof HTMLElement;
    const overflowY = isElement && window.getComputedStyle(node).overflowY;
    const isScrollable = overflowY !== "visible" && overflowY !== "hidden";

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
    fetchNextPage,
}: {
    items: Tag[];
    totalCount: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
}) => {
    const tagCount = items.length;
    const parentRef = useRef<HTMLTableElement>(null);

    const rowVirtualizer = useVirtualizer({
        getScrollElement: () => getScrollParent(parentRef.current),
        count: totalCount,
        estimateSize: () => 100,
        debug: true,
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
        rowVirtualizer.getVirtualItems(),
    ]);

    const visibleItems = rowVirtualizer.getVirtualItems();
    const [before, after] =
        visibleItems.length > 0
            ? [
                  notUndefined(visibleItems[0]).start -
                      rowVirtualizer.options.scrollMargin,
                  rowVirtualizer.getTotalSize() -
                      notUndefined(visibleItems[visibleItems.length - 1]).end,
              ]
            : [0, 0];
    const colSpan = 4;

    return (
        <div
            ref={parentRef}
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
            <Table className="flex flex-col lg:table">
                <TableHeader className="hidden lg:!table-header-group lg:!visible">
                    <TableRow>
                        <TableHead className="w-3/5 px-4">Tag</TableHead>
                        <TableHead className="px-4">Slug</TableHead>
                        <TableHead className="px-4">No. of posts</TableHead>
                        <TableHead className="px-4"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="flex flex-col lg:table-row-group">
                    {before > 0 && (
                        <tr className="flex lg:table-row">
                            <td
                                colSpan={colSpan}
                                style={{ height: before }}
                                className="flex lg:table-cell"
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
                                    className="relative lg:table-row flex flex-col"
                                    style={{
                                        height: `${virtualRow.size}px`,
                                    }}
                                >
                                    <TableCell className="relative z-10 h-24 animate-pulse">
                                        <div className="h-full bg-muted rounded-md" />
                                    </TableCell>
                                    <TableCell colSpan={3} />
                                </TableRow>
                            );
                        }

                        return (
                            <TableRow
                                key={virtualRow.key}
                                ref={rowVirtualizer.measureElement}
                                className="relative lg:table-row w-full grid grid-cols-[1fr_5rem] md:grid-cols-[1fr_auto_5rem] items-center gap-x-4 p-2 lg:p-0"
                            >
                                <TableCell className="static min-w-0 p-0 lg:p-4 lg:w-3/5 flex flex-col col-start-1 col-end-1 row-start-1 row-end-1 lg:table-cell">
                                    <a
                                        className="before:absolute before:z-10 before:inset-0 font-medium text-lg block pb-1 truncate"
                                        href={`#/tags/${item.slug}`}
                                    >
                                        {item.name}
                                    </a>
                                    <span className="text-muted-foreground block truncate">
                                        {item.description}
                                    </span>
                                </TableCell>
                                <TableCell className="p-0 lg:p-4 flex col-start-1 col-end-1 row-start-2 row-end-2 lg:table-cell">
                                    {item.slug}
                                </TableCell>
                                <TableCell className="p-0 lg:p-4 flex col-start-1 col-end-1 row-start-3 row-end-3 md:row-start-1 md:row-end-3 md:col-start-2 md:col-end-2 lg:table-cell">
                                    {item.count?.posts ? (
                                        <a
                                            href={`#/posts?tag=${item.slug}`}
                                            className="relative inline-block z-10 p-4 -m-4 hover:underline"
                                        >
                                            {formatNumber(item.count?.posts)}{" "}
                                            posts
                                        </a>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            0 posts
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="p-0 lg:p-4 w-4 col-start-2 col-end-2 row-start-1 row-end-3 md:col-start-3 md:col-end-3 lg:table-cell">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="w-12"
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
                                colSpan={colSpan}
                                style={{ height: after }}
                                className="flex lg:table-cell"
                            />
                        </tr>
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default TagsList;
