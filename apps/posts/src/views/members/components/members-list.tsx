import MembersListItem from './members-list-item';
import {Button, cn} from '@tryghost/shade';
import {Member} from '@tryghost/admin-x-framework/api/members';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';
import {forwardRef, useEffect, useMemo, useRef, useState} from 'react';
import {getMemberTableLayout} from './member-table-layout';
import {useInfiniteVirtualScroll} from '@components/virtual-table/use-infinite-virtual-scroll';
import {useScrollRestoration} from '@components/virtual-table/use-scroll-restoration';
import {useVirtualListWindow} from '@components/virtual-table/virtual-list-window';
import type {ActiveColumn} from '../member-query-params';
import type {CSSProperties, RefObject} from 'react';

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

type HeaderColumnStyles = {
    created: CSSProperties;
    dynamic: CSSProperties;
    location: CSSProperties;
    member: CSSProperties;
    openRate: CSSProperties;
    status: CSSProperties;
};

const PINNED_EDGE_FADE_STYLE = {
    left: '100%',
    background: 'linear-gradient(to right, var(--members-sticky-fade-base) 0px, color-mix(in hsl, var(--members-sticky-fade-base) 78%, transparent) 6px, color-mix(in hsl, var(--members-sticky-fade-base) 28%, transparent) 16px, transparent 24px)'
} as CSSProperties;

const MembersTableColGroup = ({
    activeColumns,
    columnStyles,
    showEmailOpenRate
}: {
    activeColumns: ActiveColumn[];
    columnStyles: HeaderColumnStyles;
    showEmailOpenRate: boolean;
}) => {
    return (
        <colgroup>
            <col style={columnStyles.member} />
            <col style={columnStyles.status} />
            {showEmailOpenRate && <col style={columnStyles.openRate} />}
            <col style={columnStyles.location} />
            <col style={columnStyles.created} />
            {activeColumns.map(col => (
                <col key={col.key} style={columnStyles.dynamic} />
            ))}
        </colgroup>
    );
};

const MembersTableHeader = ({
    activeColumns,
    columnStyles,
    memberHeaderRef,
    showEmailOpenRate
}: {
    activeColumns: ActiveColumn[];
    columnStyles: HeaderColumnStyles;
    memberHeaderRef?: RefObject<HTMLTableCellElement | null>;
    showEmailOpenRate: boolean;
}) => {
    return (
        <TableHeader className="bg-transparent lg:table-header-group">
            <TableRow>
                <TableHead ref={memberHeaderRef} className="bg-transparent px-4 py-3" style={columnStyles.member}>
                    Member
                </TableHead>
                <TableHead className="bg-transparent px-4 py-3" style={columnStyles.status}>
                    Status
                </TableHead>
                {showEmailOpenRate && (
                    <TableHead className="bg-transparent px-4 py-3" style={columnStyles.openRate}>
                        Open rate
                    </TableHead>
                )}
                <TableHead className="bg-transparent px-4 py-3" style={columnStyles.location}>
                    Location
                </TableHead>
                <TableHead className="bg-transparent px-4 py-3" style={columnStyles.created}>
                    Created
                </TableHead>
                {activeColumns.map(col => (
                    <TableHead key={col.key} className="bg-transparent px-4 py-3" style={columnStyles.dynamic}>
                        {col.label}
                    </TableHead>
                ))}
            </TableRow>
        </TableHeader>
    );
};

const PinnedMemberHeader = ({
    columnStyle,
    showPinnedEdge
}: {
    columnStyle: CSSProperties;
    showPinnedEdge: boolean;
}) => {
    return (
        <div
            className={cn(
                'pointer-events-none absolute inset-y-0 left-0 z-[70] overflow-visible bg-transparent [--members-sticky-fade-base:var(--background)]'
            )}
            style={columnStyle}
        >
            <Table className="w-full table-fixed border-collapse">
                <colgroup>
                    <col style={{width: '100%'}} />
                </colgroup>
                <TableHeader className="bg-transparent lg:table-header-group">
                    <TableRow>
                        <TableHead className="bg-transparent px-4 py-3">
                            Member
                        </TableHead>
                    </TableRow>
                </TableHeader>
            </Table>
            {showPinnedEdge && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-px w-[24px]"
                    style={PINNED_EDGE_FADE_STYLE}
                />
            )}
        </div>
    );
};

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
    const stickyHeaderRef = useRef<HTMLDivElement>(null);
    const scrollingMemberHeaderRef = useRef<HTMLTableCellElement>(null);
    const headerScrollRef = useRef<HTMLDivElement>(null);
    const horizontalScrollRef = useRef<HTMLDivElement>(null);
    const [stickyColumnWidth, setStickyColumnWidth] = useState(0);
    const [stickyTop, setStickyTop] = useState(0);
    const [showPinnedEdge, setShowPinnedEdge] = useState(false);
    const {visibleItemCount, canFetchMore, fetchMore} = useVirtualListWindow(totalItems);
    const layout = useMemo(() => {
        return getMemberTableLayout({
            showEmailOpenRate,
            activeColumnCount: activeColumns.length
        });
    }, [activeColumns.length, showEmailOpenRate]);
    const tableStyle = {
        '--members-table-width': `${layout.tableWidthPercentage}%`,
        '--members-table-min-width': `${layout.minTableWidth}px`
    } as CSSProperties;
    const memberColumnStyle = {
        width: `${layout.baseColumnWidthPercentages.member}%`,
        minWidth: `${layout.baseColumnMinWidths.member}px`
    } as CSSProperties;
    const statusColumnStyle = {
        width: `${layout.baseColumnWidthPercentages.status}%`,
        minWidth: `${layout.baseColumnMinWidths.status}px`
    } as CSSProperties;
    const openRateColumnStyle = {
        width: `${layout.baseColumnWidthPercentages.openRate}%`,
        minWidth: `${layout.baseColumnMinWidths.openRate}px`
    } as CSSProperties;
    const locationColumnStyle = {
        width: `${layout.baseColumnWidthPercentages.location}%`,
        minWidth: `${layout.baseColumnMinWidths.location}px`
    } as CSSProperties;
    const createdColumnStyle = {
        width: `${layout.baseColumnWidthPercentages.created}%`,
        minWidth: `${layout.baseColumnMinWidths.created}px`
    } as CSSProperties;
    const dynamicColumnStyle = {
        width: `${layout.dynamicColumnWidthPercentage}%`,
        minWidth: `${layout.dynamicColumnMinWidth}px`
    } as CSSProperties;

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

        const updateStickyPosition = () => {
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
        <div ref={parentRef} className="w-full min-w-0" data-testid="members-list-scroll-root">
            <div
                ref={stickyHeaderRef}
                className="sticky z-[60] hidden bg-transparent lg:block"
                style={{top: stickyTop}}
            >
                <div className="relative">
                    <PinnedMemberHeader
                        columnStyle={stickyColumnWidth > 0 ? {width: stickyColumnWidth} : memberColumnStyle}
                        showPinnedEdge={showPinnedEdge}
                    />
                    <div
                        ref={headerScrollRef}
                        className="w-full overflow-hidden"
                        style={stickyColumnWidth > 0 ? {clipPath: `inset(0 0 0 ${stickyColumnWidth}px)`} : undefined}
                    >
                        <Table
                            className="w-full border-collapse lg:w-[var(--members-table-width)] lg:min-w-[var(--members-table-min-width)] lg:table-fixed"
                            style={tableStyle}
                        >
                            <MembersTableColGroup
                                activeColumns={activeColumns}
                                columnStyles={{
                                    created: createdColumnStyle,
                                    dynamic: dynamicColumnStyle,
                                    location: locationColumnStyle,
                                    member: memberColumnStyle,
                                    openRate: openRateColumnStyle,
                                    status: statusColumnStyle
                                }}
                                showEmailOpenRate={showEmailOpenRate}
                            />
                            <MembersTableHeader
                                activeColumns={activeColumns}
                                columnStyles={{
                                    created: createdColumnStyle,
                                    dynamic: dynamicColumnStyle,
                                    location: locationColumnStyle,
                                    member: memberColumnStyle,
                                    openRate: openRateColumnStyle,
                                    status: statusColumnStyle
                                }}
                                memberHeaderRef={scrollingMemberHeaderRef}
                                showEmailOpenRate={showEmailOpenRate}
                            />
                        </Table>
                    </div>
                </div>
            </div>

            <div ref={horizontalScrollRef} className="w-full overflow-x-auto overflow-y-visible">
                <Table
                    className="w-full border-collapse lg:w-[var(--members-table-width)] lg:min-w-[var(--members-table-min-width)] lg:table-fixed"
                    data-testid="members-list"
                    style={tableStyle}
                >
                    <MembersTableColGroup
                        activeColumns={activeColumns}
                        columnStyles={{
                            created: createdColumnStyle,
                            dynamic: dynamicColumnStyle,
                            location: locationColumnStyle,
                            member: memberColumnStyle,
                            openRate: openRateColumnStyle,
                            status: statusColumnStyle
                        }}
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
                                    columnStyles={{
                                        created: createdColumnStyle,
                                        dynamic: dynamicColumnStyle,
                                        location: locationColumnStyle,
                                        member: memberColumnStyle,
                                        openRate: openRateColumnStyle,
                                        status: statusColumnStyle
                                    }}
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

            {canFetchMore && (
                <div className="flex justify-center px-4 py-6">
                    <Button
                        disabled={isFetchingNextPage}
                        variant="outline"
                        onClick={fetchMore}
                    >
                        {isFetchingNextPage ? 'Loading more...' : 'Fetch more'}
                    </Button>
                </div>
            )}
        </div>
    );
}

export default MembersList;
