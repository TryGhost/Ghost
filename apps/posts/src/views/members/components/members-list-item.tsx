import moment from 'moment-timezone';

import {Member} from '@tryghost/admin-x-framework/api/members';
import {MemberAvatar} from '@components/member-avatar';
import {TableCell, TableRow, cn} from '@tryghost/shade';
import {getActiveColumnValue} from '../member-query-params';
import type {ActiveColumn} from '../member-query-params';

// --- Helpers ---

function formatLocation(geolocation: Member['geolocation']): {
    text: string;
    isKnown: boolean;
} {
    if (!geolocation) {
        return {text: 'Unknown', isKnown: false};
    }

    try {
        const parsed = JSON.parse(geolocation) as {
            country?: string;
            region?: string;
            country_code?: string;
        };

        if (!parsed.country) {
            return {text: 'Unknown', isKnown: false};
        }

        // For US, show "State, US"
        if (parsed.country_code === 'US' && parsed.region) {
            return {text: `${parsed.region}, US`, isKnown: true};
        }

        return {text: parsed.country, isKnown: true};
    } catch {
        return {text: 'Unknown', isKnown: false};
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

// --- Sub-components ---

function MembersListItemName({item, onClick}: { item: Member; onClick?: (memberId: string) => void }) {
    return (
        <div className="flex items-center gap-3">
            <MemberAvatar
                avatarImage={item.avatar_image}
                className="size-10 min-w-10 md:size-10 md:min-w-10"
                memberEmail={item.email}
                memberId={item.id}
                memberName={item.name}
            />
            <div className="min-w-0">
                <a
                    className="cursor-pointer before:absolute before:top-0 before:left-0 before:z-10 before:h-full before:w-[calc(100vw-300px-64px)]"
                    href={`#/members/${item.id}`}
                    onClick={onClick ? (e) => {
                        if (
                            e.button !== 0 ||
                            e.metaKey ||
                            e.ctrlKey ||
                            e.shiftKey ||
                            e.altKey
                        ) {
                            return;
                        }
                        e.preventDefault();
                        onClick(item.id);
                    } : undefined}
                >
                    <span className="block truncate font-medium">
                        {item.name || item.email || 'Anonymous'}
                    </span>
                </a>
                {item.name && item.email && (
                    <div
                        className="truncate text-sm text-muted-foreground"
                        data-testid="member-email"
                    >
                        {item.email}
                    </div>
                )}
            </div>
        </div>
    );
}

function MembersListItemStatus({
    status,
    tiers
}: {
    status: Member['status'];
    tiers?: Member['tiers'];
}) {
    const tierNames = tiers?.map(t => t.name).join(', ');
    return (
        <div className="flex min-w-0 justify-end lg:justify-start">
            <div className="min-w-0">
                <div className="truncate text-sm">{getStatusLabel(status)}</div>
                {tierNames && (
                    <div className="truncate text-xs text-muted-foreground">
                        {tierNames}
                    </div>
                )}
            </div>
        </div>
    );
}

function MembersListItemOpenRate({
    emailOpenRate
}: {
    emailOpenRate: number | null | undefined;
}) {
    const isKnown = emailOpenRate !== null && emailOpenRate !== undefined;
    return (
        <div
            className={cn('text-sm', isKnown ? 'text-foreground' : 'text-muted-foreground')}
        >
            {isKnown ? `${Math.round(emailOpenRate)}%` : 'N/A'}
        </div>
    );
}

function MembersListItemLocation({
    geolocation
}: {
    geolocation: Member['geolocation'];
}) {
    const location = formatLocation(geolocation);

    return (
        <div
            className={cn('truncate text-sm', location.isKnown ? 'text-foreground' : 'text-muted-foreground')}
        >
            {location.text}
        </div>
    );
}

function MembersListItemCreated({createdAt}: { createdAt: string }) {
    return (
        <div>
            <div className="text-sm">
                {moment.utc(createdAt).format('D MMM YYYY')}
            </div>
            <div className="text-xs text-muted-foreground">
                {moment.utc(createdAt).fromNow()}
            </div>
        </div>
    );
}

function MembersListItemDynamicColumn({
    column,
    member,
    timezone
}: {
    column: ActiveColumn;
    member: Member;
    timezone: string;
}) {
    const value = getActiveColumnValue(column, member, timezone);

    if (!value) {
        return (
            <span className="text-sm text-muted-foreground">-</span>
        );
    }

    return (
        <div className="min-w-0">
            <div className="truncate text-sm">{value.text}</div>
            {value.subtext && (
                <div className="truncate text-xs text-muted-foreground">
                    {value.subtext}
                </div>
            )}
        </div>
    );
}

// --- Main component ---

interface MembersListItemProps {
    item: Member;
    activeColumns: ActiveColumn[];
    showEmailOpenRate: boolean;
    timezone: string;
    onClick: (memberId: string) => void;
}

function MembersListItem({
    item,
    activeColumns,
    showEmailOpenRate,
    timezone,
    onClick,
    ...props
}: MembersListItemProps &
    Omit<React.HTMLAttributes<HTMLTableRowElement>, 'onClick'>) {
    return (
        <TableRow
            {...props}
            data-testid="members-list-item"
        >
            <TableCell className="px-4 py-3">
                <MembersListItemName item={item} onClick={onClick} />
            </TableCell>
            <TableCell className="px-4 py-3">
                <MembersListItemStatus status={item.status} tiers={item.tiers} />
            </TableCell>
            {showEmailOpenRate && (
                <TableCell className="hidden px-4 py-3 lg:table-cell">
                    <MembersListItemOpenRate emailOpenRate={item.email_open_rate} />
                </TableCell>
            )}
            <TableCell className="hidden px-4 py-3 lg:table-cell">
                <MembersListItemLocation geolocation={item.geolocation} />
            </TableCell>
            <TableCell className="hidden px-4 py-3 lg:table-cell">
                <MembersListItemCreated createdAt={item.created_at} />
            </TableCell>
            {activeColumns.map(col => (
                <TableCell key={col.key} className="hidden px-4 py-3 lg:table-cell">
                    <MembersListItemDynamicColumn
                        column={col}
                        member={item}
                        timezone={timezone}
                    />
                </TableCell>
            ))}
        </TableRow>
    );
}

export default MembersListItem;
export {
    MembersListItemName,
    MembersListItemStatus,
    MembersListItemOpenRate,
    MembersListItemLocation,
    MembersListItemCreated,
    MembersListItemDynamicColumn
};
