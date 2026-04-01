import LoadMoreButton from '@components/virtual-table/load-more-button';
import MembersListItem from './members-list-item';
import {Member} from '@tryghost/admin-x-framework/api/members';
import {MembersTableColGroup, MembersTableHeader, PinnedMemberHeader} from './member-table-chrome';
import {Table, TableBody, TableCell, TableRow} from '@tryghost/shade';
import {forwardRef, useEffect, useMemo, useRef, useState} from 'react';
import {getMemberTableLayout, getMemberTableLayoutStyles} from './member-table-layout';
import {useInfiniteVirtualScroll} from '@components/virtual-table/use-infinite-virtual-scroll';
import {useScrollRestoration} from '@components/virtual-table/use-scroll-restoration';
import {useVirtualListWindow} from '@components/virtual-table/virtual-list-window';
import type {ActiveColumn} from '../member-query-params';
import type {RefObject} from 'react';

const SpacerRow = ({height}: { height: number }) => (
    <tr aria-hidden="true" style={{height}}>
        <td colSpan={999} />
    </tr>
);

const PlaceholderRow = forwardRef<HTMLTableRowElement>(
    function PlaceholderRow(props, ref) {
        return (
            <TableRow
                ref={ref}
                {...props}
                aria-hidden="true"
            >
                <TableCell className="h-[72px] px-4 py-3" colSpan={999}>
                    <div
                        className="h-full animate-pulse rounded-md bg-muted"
                        data-testid="loading-placeholder"
                    />
                </TableCell>
            </TableRow>
        );
    }
);

interface MembersListProps {
    items: Member[];
    totalItems: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
    isLoading?: boolean;
    showEmailOpenRate?: boolean;
    activeColumns: ActiveColumn[];
    timezone: string;
    pageHeaderRef?: RefObject<HTMLElement | null>;
    onRowClick?: (memberId: string) => void;
}

function MembersList({
    items,
    totalItems,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    showEmailOpenRate = true,
    activeColumns,
    timezone,
    pageHeaderRef,
    onRowClick
}: MembersListProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const stickyHeaderRef = useRef<HTMLTableSectionElement>(null);
    const scrollingMemberHeaderRef = useRef<HTMLTableCellElement>(null);
    const headerScrollRef = useRef<HTMLDivElement>(null);
    const horizontalScrollRef = useRef<HTMLDivElement>(null);
    const [stickyColumnWidth, setStickyColumnWidth] = useState(0);
    const [stickyTop, setStickyTop] = useState(0);
    const [showPinnedEdge, setShowPinnedEdge] = useState(false);
    const {visibleItemCount, canLoadMore, loadMore} = useVirtualListWindow(totalItems);
    const layout = useMemo(() => {
        return getMemberTableLayout({
            showEmailOpenRate,
            activeColumnCount: activeColumns.length
        });
    }, [activeColumns.length, showEmailOpenRate]);
    const {tableStyle, columnStyles} = useMemo(() => getMemberTableLayoutStyles(layout), [layout]);

    useScrollRestoration({parentRef, isLoading});

    useEffect(() => {
        const scrollElement = horizontalScrollRef.current;

        if (!scrollElement) {
            return;
        }

        const updatePinnedEdge = () => {
            const scrollLeft = scrollElement.scrollLeft;
            setShowPinnedEdge(scrollLeft > 0);

            if (headerScrollRef.current) {
                headerScrollRef.current.scrollLeft = scrollLeft;
            }
        };

        updatePinnedEdge();
        scrollElement.addEventListener('scroll', updatePinnedEdge, {passive: true});
        window.addEventListener('resize', updatePinnedEdge);

        return () => {
            scrollElement.removeEventListener('scroll', updatePinnedEdge);
            window.removeEventListener('resize', updatePinnedEdge);
        };
    }, [activeColumns.length, items.length, showEmailOpenRate]);

    useEffect(() => {
        const pageHeader = pageHeaderRef?.current;
        const stickyHeader = stickyHeaderRef.current;
        const scrollingMemberHeader = scrollingMemberHeaderRef.current;

        if (!pageHeader || !stickyHeader || !scrollingMemberHeader) {
            setStickyColumnWidth(0);
            setStickyTop(0);
            return;
        }

        const initialPaddingBottom = pageHeader.style.paddingBottom;
        const initialMarginBottom = pageHeader.style.marginBottom;
        const basePaddingBottom = parseFloat(getComputedStyle(pageHeader).paddingBottom) || 0;
        const baseMarginBottom = parseFloat(getComputedStyle(pageHeader).marginBottom) || 0;

        const resetHeaderSpacing = () => {
            if (initialPaddingBottom) {
                pageHeader.style.setProperty('padding-bottom', initialPaddingBottom);
            } else {
                pageHeader.style.removeProperty('padding-bottom');
            }
            if (initialMarginBottom) {
                pageHeader.style.setProperty('margin-bottom', initialMarginBottom);
            } else {
                pageHeader.style.removeProperty('margin-bottom');
            }
        };

        const updateStickyPosition = () => {
            const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
            if (!isDesktop) {
                resetHeaderSpacing();
                setStickyColumnWidth(0);
                setStickyTop(0);
                return;
            }

            const stickyHeaderHeight = stickyHeader.getBoundingClientRect().height;
            const memberHeaderWidth = scrollingMemberHeader.getBoundingClientRect().width;
            pageHeader.style.setProperty('padding-bottom', `${basePaddingBottom + stickyHeaderHeight}px`, 'important');
            pageHeader.style.setProperty('margin-bottom', `${baseMarginBottom - stickyHeaderHeight}px`, 'important');
            const pageHeaderHeight = pageHeader.getBoundingClientRect().height;

            setStickyColumnWidth(memberHeaderWidth);
            setStickyTop(Math.max(pageHeaderHeight - stickyHeaderHeight, 0));
        };

        updateStickyPosition();

        const resizeObserver = new ResizeObserver(() => {
            updateStickyPosition();
        });

        resizeObserver.observe(pageHeader);
        resizeObserver.observe(stickyHeader);
        resizeObserver.observe(scrollingMemberHeader);
        window.addEventListener('resize', updateStickyPosition);

        return () => {
            resetHeaderSpacing();
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateStickyPosition);
        };
    }, [activeColumns.length, pageHeaderRef, showEmailOpenRate]);

    const {visibleItems, spaceBefore, spaceAfter} = useInfiniteVirtualScroll({
        items,
        totalItems: visibleItemCount,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        parentRef,
        estimateSize: () => 72 // Approximate row height
    });

    const handleRowClick = (memberId: string) => {
        if (onRowClick) {
            onRowClick(memberId);
        } else {
            // Default: Navigate to Ember member detail page
            window.location.hash = `/members/${memberId}`;
        }
    };

    return (
        <div ref={parentRef} className="-mt-4 w-full min-w-0 lg:-mt-8" data-testid="members-list-scroll-root">
            <div
                className="sticky z-[50] hidden overflow-visible bg-transparent lg:block"
                style={{top: stickyTop}}
            >
                <div className="relative">
                    <PinnedMemberHeader
                        columnStyle={stickyColumnWidth > 0 ? {width: stickyColumnWidth} : columnStyles.member}
                        showPinnedEdge={showPinnedEdge}
                    />
                    <div
                        ref={headerScrollRef}
                        className="w-full overflow-hidden"
                        style={stickyColumnWidth > 0 ? {clipPath: `inset(0 0 0 ${stickyColumnWidth}px)`} : undefined}
                    >
                        <Table
                            aria-hidden="true"
                            className="w-full border-collapse lg:w-[var(--members-table-width)] lg:min-w-[var(--members-table-min-width)] lg:table-fixed"
                            style={tableStyle}
                        >
                            <MembersTableColGroup
                                activeColumns={activeColumns}
                                columnStyles={columnStyles}
                                showEmailOpenRate={showEmailOpenRate}
                            />
                            <MembersTableHeader
                                activeColumns={activeColumns}
                                columnStyles={columnStyles}
                                headerRef={stickyHeaderRef}
                                memberHeaderRef={scrollingMemberHeaderRef}
                                showEmailOpenRate={showEmailOpenRate}
                            />
                        </Table>
                    </div>
                </div>
            </div>

            <div ref={horizontalScrollRef} className="w-full overflow-x-auto overflow-y-visible">
                <Table
                    className="w-full border-collapse max-sm:table-fixed sm:max-lg:table-auto lg:w-[var(--members-table-width)] lg:min-w-[var(--members-table-min-width)] lg:table-fixed"
                    data-testid="members-list"
                    style={tableStyle}
                >
                    <MembersTableColGroup
                        activeColumns={activeColumns}
                        columnStyles={columnStyles}
                        showEmailOpenRate={showEmailOpenRate}
                    />
                    <MembersTableHeader
                        activeColumns={activeColumns}
                        className="lg:h-0 lg:overflow-hidden lg:[&_th]:pointer-events-none lg:[&_th]:h-0 lg:[&_th]:border-0 lg:[&_th]:p-0 lg:[&_th]:text-[0px] lg:[&_th]:leading-none lg:[&_th]:opacity-0 lg:[&_tr]:h-0 lg:[&_tr]:border-0"
                        columnStyles={columnStyles}
                        showEmailOpenRate={showEmailOpenRate}
                    />
                    <TableBody>
                        <SpacerRow height={spaceBefore} />
                        {visibleItems.map(({key, virtualItem, item, props}) => {
                            const shouldRenderPlaceholder =
                                virtualItem.index > items.length - 1;

                            if (shouldRenderPlaceholder) {
                                return <PlaceholderRow key={key} {...props} />;
                            }

                            return (
                                <MembersListItem
                                    key={key}
                                    {...props}
                                    activeColumns={activeColumns}
                                    columnStyles={columnStyles}
                                    item={item}
                                    showEmailOpenRate={showEmailOpenRate}
                                    showPinnedEdge={showPinnedEdge}
                                    timezone={timezone}
                                    onClick={handleRowClick}
                                />
                            );
                        })}
                        <SpacerRow height={spaceAfter} />
                    </TableBody>
                </Table>
            </div>

            {canLoadMore && (
                <LoadMoreButton isLoading={isFetchingNextPage} onClick={loadMore} />
            )}
        </div>
    );
}

export default MembersList;
