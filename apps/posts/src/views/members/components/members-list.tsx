import {
    Avatar,
    AvatarFallback,
    Badge,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    formatDisplayDate,
    formatRelativeTime,
    getMemberInitials,
    stringToHslColor
} from '@tryghost/shade';
import {Member} from '@tryghost/admin-x-framework/api/members';
import {forwardRef, useRef} from 'react';
import {useInfiniteVirtualScroll} from '@components/virtual-table/use-infinite-virtual-scroll';

const SpacerRow = ({height}: { height: number }) => (
    <tr aria-hidden="true" className="flex lg:table-row">
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
            aria-hidden="true"
            className="relative flex flex-col lg:table-row"
        >
            <TableCell className="relative z-10 h-24 animate-pulse">
                <div
                    className="h-full rounded-md bg-muted"
                    data-testid="loading-placeholder"
                />
            </TableCell>
        </TableRow>
    );
});

function MembersList({
    items,
    totalItems,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    selectedIds,
    selectionMode,
    onSelect,
    onSelectAll
}: {
    items: Member[];
    totalItems: number;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage: () => void;
    selectedIds: Set<string>;
    selectionMode: 'include' | 'exclude';
    onSelect: (id: string, selected: boolean) => void;
    onSelectAll: (selected: boolean) => void;
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

    const isAnySelected = selectionMode === 'exclude' || selectedIds.size > 0;

    return (
        <div ref={parentRef} className="overflow-hidden">
            <Table
                className="flex table-fixed flex-col lg:table"
                data-testid="members-list"
            >
                <TableHeader className="hidden lg:!visible lg:!table-header-group">
                    <TableRow className="group">
                        <TableHead
                            className={`w-10 px-4 ${
                                isAnySelected
                                    ? 'opacity-100'
                                    : 'opacity-0 group-hover:opacity-100'
                            }`}
                            onClick={() => {
                                const isAllSelected =
                                    selectionMode === 'exclude' ||
                                    (items.length > 0 &&
                                        selectedIds.size === items.length);
                                onSelectAll(!isAllSelected);
                            }}
                        >
                            <input
                                checked={
                                    selectionMode === 'exclude' ||
                                    (items.length > 0 &&
                                        selectedIds.size === items.length)
                                }
                                className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                type="checkbox"
                                onChange={e => onSelectAll(e.target.checked)}
                                onClick={e => e.stopPropagation()}
                            />
                        </TableHead>
                        <TableHead className="w-1/4 px-4">Member</TableHead>
                        <TableHead className="w-1/8 px-4">Status</TableHead>
                        <TableHead className="w-1/8 px-4">Open rate</TableHead>
                        <TableHead className="w-1/4 px-4">Location</TableHead>
                        <TableHead className="w-1/6 px-4">Created</TableHead>
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

                        const initials = getMemberInitials(item);
                        const avatarBg = stringToHslColor(
                            item.name || item.email,
                            75,
                            55
                        );

                        return (
                            <TableRow
                                key={key}
                                {...props}
                                className="group grid w-full grid-cols-[auto_1fr_5rem] items-center gap-x-4 p-2 hover:bg-muted/50 md:grid-cols-[auto_1fr_auto_5rem] lg:table-row lg:p-0 [&.group:hover_td]:bg-transparent"
                                data-testid="member-list-row"
                                onClick={(e) => {
                                    if (
                                        (e.target as HTMLElement).closest(
                                            'a'
                                        ) ||
                                        (e.target as HTMLElement).closest(
                                            'button'
                                        ) ||
                                        (e.target as HTMLElement).closest(
                                            'input'
                                        )
                                    ) {
                                        return;
                                    }
                                    window.location.hash = `#/members/${item.id}`;
                                }}
                            >
                                <TableCell
                                    className={`flex items-center justify-center p-0 lg:table-cell lg:p-4 ${
                                        isAnySelected
                                            ? 'opacity-100'
                                            : 'opacity-0 group-hover:opacity-100'
                                    }`}
                                    onClick={(e) => {
                                        const isChecked =
                                            selectionMode === 'exclude'
                                                ? !selectedIds.has(item.id)
                                                : selectedIds.has(item.id);
                                        onSelect(item.id, !isChecked);
                                        e.stopPropagation();
                                    }}
                                >
                                    <input
                                        checked={
                                            selectionMode === 'exclude'
                                                ? !selectedIds.has(item.id)
                                                : selectedIds.has(item.id)
                                        }
                                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        type="checkbox"
                                        onChange={e => onSelect(item.id, e.target.checked)
                                        }
                                        onClick={e => e.stopPropagation()}
                                    />
                                </TableCell>
                                <TableCell className="static col-start-2 col-end-2 row-start-1 row-end-1 flex min-w-0 flex-col p-0 md:relative lg:table-cell lg:p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex shrink-0 items-center">
                                            <Avatar className="size-10">
                                                <AvatarFallback
                                                    style={{
                                                        backgroundColor:
                                                            avatarBg
                                                    }}
                                                >
                                                    <span className="font-medium text-white">
                                                        {initials}
                                                    </span>
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate font-semibold text-foreground">
                                                <a
                                                    className="absolute inset-0 z-10 lg:static lg:z-auto lg:size-auto"
                                                    href={`#/members/${item.id}`}
                                                >
                                                    {item.name || item.email}
                                                </a>
                                            </span>
                                            <span className="truncate text-sm text-muted-foreground">
                                                {item.email}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell lg:p-4">
                                    <Badge
                                        variant={
                                            item.status === 'paid'
                                                ? 'success'
                                                : 'secondary'
                                        }
                                    >
                                        {item.status.charAt(0).toUpperCase() +
                                            item.status.slice(1)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell lg:p-4">
                                    {item.email_open_rate !== null &&
                                    item.email_open_rate !== undefined ? (
                                            <span>{item.email_open_rate}%</span>
                                        ) : (
                                            <span className="text-muted-foreground">
                                            -
                                            </span>
                                        )}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell lg:p-4">
                                    {(() => {
                                        if (!item.geolocation) {
                                            return (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            );
                                        }
                                        try {
                                            const geo = JSON.parse(
                                                item.geolocation
                                            );
                                            const location = [
                                                geo.city,
                                                geo.country
                                            ]
                                                .filter(Boolean)
                                                .join(', ');
                                            return (
                                                <span
                                                    className="block truncate"
                                                    title={location}
                                                >
                                                    {location || '-'}
                                                </span>
                                            );
                                        } catch {
                                            return (
                                                <span className="text-muted-foreground">
                                                    -
                                                </span>
                                            );
                                        }
                                    })()}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell lg:p-4">
                                    <div className="flex flex-col">
                                        <span
                                            className="whitespace-nowrap font-medium"
                                            title={item.created_at}
                                        >
                                            {formatDisplayDate(item.created_at)}
                                        </span>
                                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                                            {formatRelativeTime(item.created_at)}
                                        </span>
                                    </div>
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

export default MembersList;
