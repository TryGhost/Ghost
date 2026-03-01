import MembersListItem from './members-list-item';
import {Member} from '@tryghost/admin-x-framework/api/members';
import {forwardRef, useRef} from 'react';
import {useInfiniteVirtualScroll} from '@components/virtual-table/use-infinite-virtual-scroll';
import {useScrollRestoration} from '@components/virtual-table/use-scroll-restoration';

const SpacerRow = ({height}: {height: number}) => (
    <div aria-hidden="true" className="flex">
        <div className="flex" style={{height}} />
    </div>
);

const PlaceholderRow = forwardRef<HTMLDivElement>(function PlaceholderRow(
    props,
    ref
) {
    return (
        <div
            ref={ref}
            {...props}
            aria-hidden="true"
            className="relative flex flex-col"
        >
            <div className="relative z-10 h-[72px] animate-pulse">
                <div className="h-full rounded-md bg-muted" data-testid="loading-placeholder" />
            </div>
        </div>
    );
});

interface MembersListProps {
    items: Member[];
    totalItems: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
    isLoading?: boolean;
    showEmailOpenRate?: boolean;
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

    const gridColsWithOpenRate = 'lg:grid-cols-[3fr_1fr_1fr_1.5fr_1.5fr]';
    const gridColsWithoutOpenRate = 'lg:grid-cols-[3fr_1fr_1.5fr_1.5fr]';
    const gridCols = showEmailOpenRate ? gridColsWithOpenRate : gridColsWithoutOpenRate;

    return (
        <div ref={parentRef} className="overflow-hidden">
            <div className="flex flex-col" data-testid="members-list">
                {/* Table Header */}
                <div className={`sticky top-0 z-10 hidden border-b bg-background lg:grid lg:gap-4 lg:px-4 lg:py-3 ${gridCols}`}>
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-700">Member</div>
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-700">Status</div>
                    {showEmailOpenRate && (
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-700">Open rate</div>
                    )}
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-700">Location</div>
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-700">Created</div>
                </div>

                {/* Table Body */}
                <div className="flex flex-col">
                    <SpacerRow height={spaceBefore} />
                    {visibleItems.map(({key, virtualItem, item, props}) => {
                        const shouldRenderPlaceholder = virtualItem.index > items.length - 1;

                        if (shouldRenderPlaceholder) {
                            return <PlaceholderRow key={key} {...props} />;
                        }

                        return (
                            <MembersListItem
                                key={key}
                                {...props}
                                gridCols={gridCols}
                                item={item}
                                showEmailOpenRate={showEmailOpenRate}
                                onClick={handleRowClick}
                            />
                        );
                    })}
                    <SpacerRow height={spaceAfter} />
                </div>
            </div>
        </div>
    );
}

export default MembersList;
