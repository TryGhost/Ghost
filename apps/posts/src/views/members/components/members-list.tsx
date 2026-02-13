import {Badge, formatDisplayDate, formatTimestamp} from '@tryghost/shade';
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

function formatLocation(geolocation: Member['geolocation']): string {
    if (!geolocation) {
        return 'Unknown';
    }

    const {country, region, country_code: countryCode} = geolocation;

    if (!country) {
        return 'Unknown';
    }

    // For US, show "State, US"
    if (countryCode === 'US' && region) {
        return `${region}, US`;
    }

    return country;
}

function getStatusBadgeVariant(status: Member['status']): 'default' | 'secondary' | 'outline' {
    switch (status) {
    case 'paid':
        return 'default';
    case 'comped':
        return 'secondary';
    default:
        return 'outline';
    }
}

function getStatusLabel(status: Member['status']): string {
    switch (status) {
    case 'paid':
        return 'Paid';
    case 'comped':
        return 'Complimentary';
    default:
        return 'Free';
    }
}

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
                    <div className="text-sm font-medium text-muted-foreground">Member</div>
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    {showEmailOpenRate && (
                        <div className="text-sm font-medium text-muted-foreground">Open rate</div>
                    )}
                    <div className="text-sm font-medium text-muted-foreground">Location</div>
                    <div className="text-sm font-medium text-muted-foreground">Created</div>
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
                            <div
                                key={key}
                                {...props}
                                className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_7rem] items-center gap-2 border-b px-4 py-3 hover:bg-muted/50 lg:gap-4 ${gridCols}`}
                                data-testid="members-list-item"
                                onClick={() => handleRowClick(item.id)}
                            >
                                {/* Member Name/Email */}
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                                        {item.avatar_image ? (
                                            <img
                                                alt={item.name || item.email || 'Member avatar'}
                                                className="size-full object-cover"
                                                src={item.avatar_image}
                                            />
                                        ) : (
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {(item.name || item.email || '?')[0].toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate font-medium">
                                            {item.name || item.email || 'Anonymous'}
                                        </div>
                                        {item.name && item.email && (
                                            <div className="truncate text-sm text-muted-foreground" data-testid="member-email">
                                                {item.email}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className="flex justify-end lg:justify-start">
                                    <Badge variant={getStatusBadgeVariant(item.status)}>
                                        {getStatusLabel(item.status)}
                                    </Badge>
                                </div>

                                {/* Open Rate - Hidden on mobile */}
                                {showEmailOpenRate && (
                                    <div className="hidden text-sm text-muted-foreground lg:block">
                                        {item.email_open_rate !== null && item.email_open_rate !== undefined
                                            ? `${Math.round(item.email_open_rate)}%`
                                            : 'N/A'}
                                    </div>
                                )}

                                {/* Location - Hidden on mobile */}
                                <div className="hidden truncate text-sm text-muted-foreground lg:block">
                                    {formatLocation(item.geolocation)}
                                </div>

                                {/* Created Date - Hidden on mobile */}
                                <div className="hidden lg:block">
                                    <div className="text-sm">{formatDisplayDate(item.created_at)}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatTimestamp(item.created_at)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <SpacerRow height={spaceAfter} />
                </div>
            </div>
        </div>
    );
}

export default MembersList;
