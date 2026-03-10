import MembersListItem from './members-list-item';
import {Member} from '@tryghost/admin-x-framework/api/members';
import {CSSProperties, forwardRef, useRef} from 'react';
import {useInfiniteVirtualScroll} from '@components/virtual-table/use-infinite-virtual-scroll';
import {useScrollRestoration} from '@components/virtual-table/use-scroll-restoration';
import type {MemberFilterColumnMetadata} from '../hooks/member-filter-metadata';

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
    activeColumns?: MemberFilterColumnMetadata[];
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
    activeColumns = [],
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

    const desktopGridCols = [
        'minmax(0,3fr)',
        'minmax(0,1fr)',
        ...(showEmailOpenRate ? ['minmax(0,1fr)'] : []),
        'minmax(0,1.5fr)',
        'minmax(0,1.5fr)',
        ...activeColumns.map(() => 'minmax(0,1.25fr)')
    ].join(' ');
    const gridStyle = {
        '--members-grid-cols': desktopGridCols
    } as CSSProperties;

    return (
        <div ref={parentRef} className="overflow-hidden">
            <div className="flex flex-col" data-testid="members-list">
                {/* Table Header */}
                <div
                    className="sticky top-0 z-10 hidden border-b bg-background lg:grid lg:gap-4 lg:px-4 lg:py-3 lg:[grid-template-columns:var(--members-grid-cols)]"
                    style={gridStyle}
                >
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-700">Member</div>
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-700">Status</div>
                    {showEmailOpenRate && (
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-700">Open rate</div>
                    )}
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-700">Location</div>
                    <div className="text-xs font-medium uppercase tracking-wide text-gray-700">Created</div>
                    {activeColumns.map(column => (
                        <div key={column.key} className="text-xs font-medium uppercase tracking-wide text-gray-700">
                            {column.label}
                        </div>
                    ))}
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
                                gridStyle={gridStyle}
                                item={item}
                                activeColumns={activeColumns}
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
