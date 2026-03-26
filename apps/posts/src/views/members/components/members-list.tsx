import MembersListItem from './members-list-item';
import {Member} from '@tryghost/admin-x-framework/api/members';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@tryghost/shade';
import {forwardRef, useRef} from 'react';
import {useInfiniteVirtualScroll} from '@components/virtual-table/use-infinite-virtual-scroll';
import {useScrollRestoration} from '@components/virtual-table/use-scroll-restoration';
import type {ActiveColumn} from '../member-query-params';

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
    onRowClick
}: MembersListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    useScrollRestoration({parentRef, isLoading});

    const {visibleItems, spaceBefore, spaceAfter} = useInfiniteVirtualScroll({
        items,
        totalItems,
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
        <div ref={parentRef} className="h-[calc(100%+32px)] w-full overflow-auto lg:-mx-8 lg:-mb-8 lg:w-auto lg:max-w-[calc(100vw-300px)]">
            <Table
                className="w-full border-collapse lg:ml-8 lg:w-auto lg:max-w-[calc(100vw-300px-64px)] lg:table-fixed"
                data-testid="members-list"
            >
                <colgroup className="hidden lg:table-column-group">
                    <col className="w-full min-w-[360px]" />
                    <col className="w-[50%] min-w-[160px]" />
                    {showEmailOpenRate && <col className="w-[50%] min-w-[110px]" />}
                    <col className="w-[50%] min-w-[150px]" />
                    <col className="w-[50%] min-w-[120px]" />
                    {activeColumns.map(col => (
                        <col key={col.key} className="w-[50%] min-w-[250px]" />
                    ))}
                </colgroup>
                <TableHeader className="sticky top-0 z-10 hidden border-b bg-background lg:table-header-group">
                    <TableRow>
                        <TableHead className="px-4 py-3">
                            Member
                        </TableHead>
                        <TableHead className="px-4 py-3">
                            Status
                        </TableHead>
                        {showEmailOpenRate && (
                            <TableHead className="px-4 py-3">
                                Open rate
                            </TableHead>
                        )}
                        <TableHead className="px-4 py-3">
                            Location
                        </TableHead>
                        <TableHead className="px-4 py-3">
                            Created
                        </TableHead>
                        {activeColumns.map(col => (
                            <TableHead key={col.key} className="px-4 py-3">
                                {col.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
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
                                item={item}
                                showEmailOpenRate={showEmailOpenRate}
                                timezone={timezone}
                                onClick={handleRowClick}
                            />
                        );
                    })}
                    <SpacerRow height={spaceAfter} />
                </TableBody>
            </Table>
        </div>
    );
}

export default MembersList;
