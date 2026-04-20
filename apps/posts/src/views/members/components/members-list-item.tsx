import moment from 'moment-timezone';

import {Member} from '@tryghost/admin-x-framework/api/members';
import {MemberAvatar} from '@components/member-avatar';
import {TableCell, TableRow} from '@tryghost/shade/components';
import {buildMemberDetailPath} from '../member-detail-hash';
import {cn} from '@tryghost/shade/utils';
import {getActiveColumnValue} from '../member-query-params';
import type {ActiveColumn} from '../member-query-params';
import type {CSSProperties} from 'react';
import type {MemberTableColumnStyles} from './member-table-layout';

const PINNED_EDGE_FADE_POSITION_STYLE = {
    left: '100%'
} as CSSProperties;

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
    case 'gift':
        return 'Gift';
    default:
        return 'Free';
    }
}

function isModifiedClick(event: Pick<React.MouseEvent<HTMLElement>, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>) {
    return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function openMemberInNewTab(memberId: string, backPath?: string) {
    window.open(`#${buildMemberDetailPath(memberId, backPath)}`, '_blank', 'noopener');
}

// --- Sub-components ---

function MembersListItemName({item, backPath, onClick}: { item: Member; backPath?: string; onClick?: (memberId: string) => void }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <MemberAvatar
                avatarImage={item.avatar_image}
                className="size-10 min-w-10 md:size-10 md:min-w-10"
                memberEmail={item.email}
                memberId={item.id}
                memberName={item.name}
            />
            <div className="min-w-0">
                <a
                    className="block min-w-0 cursor-pointer"
                    href={`#${buildMemberDetailPath(item.id, backPath)}`}
                    onClick={onClick ? (e) => {
                        if (isModifiedClick(e)) {
                            e.stopPropagation();
                            return;
                        }
                        e.preventDefault();
                        e.stopPropagation();
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
        <div className="flex min-w-0 justify-start">
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
    backPath?: string;
    columnStyles: MemberTableColumnStyles;
    showPinnedEdge: boolean;
    showEmailOpenRate: boolean;
    timezone: string;
    onClick: (memberId: string) => void;
}

function MembersListItem({
    item,
    activeColumns,
    backPath,
    columnStyles,
    showPinnedEdge,
    showEmailOpenRate,
    timezone,
    onClick,
    ...props
}: MembersListItemProps &
    Omit<React.HTMLAttributes<HTMLTableRowElement>, 'onClick'>) {
    const memberCellStyle = {
        '--members-sticky-hover-bg': 'color-mix(in hsl, var(--muted) 50%, var(--background))'
    } as CSSProperties;
    const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
        if (isModifiedClick(event)) {
            openMemberInNewTab(item.id, backPath);
            return;
        }

        onClick(item.id);
    };
    const handleRowAuxClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
        if (event.button !== 1) {
            return;
        }

        event.preventDefault();
        openMemberInNewTab(item.id, backPath);
    };

    return (
        <TableRow
            {...props}
            className={cn('group cursor-pointer', props.className)}
            data-testid="members-list-item"
            onAuxClick={handleRowAuxClick}
            onClick={handleRowClick}
        >
            <TableCell className={cn(
                'min-w-0 bg-background px-4 py-3 group-hover:bg-[var(--members-sticky-hover-bg)] max-sm:!w-full max-sm:!min-w-0 lg:sticky lg:left-0 lg:z-20'
            )} style={memberCellStyle}>
                <MembersListItemName backPath={backPath} item={item} onClick={onClick} />
                {showPinnedEdge && (
                    <>
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-px hidden w-[24px] group-hover:opacity-0 lg:block"
                            style={{
                                ...PINNED_EDGE_FADE_POSITION_STYLE,
                                background: 'linear-gradient(to right, var(--background) 0px, color-mix(in hsl, var(--background) 78%, transparent) 6px, color-mix(in hsl, var(--background) 28%, transparent) 16px, transparent 24px)'
                            }}
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-px hidden w-[24px] opacity-0 group-hover:opacity-100 lg:block"
                            style={{
                                ...PINNED_EDGE_FADE_POSITION_STYLE,
                                background: 'linear-gradient(to right, var(--members-sticky-hover-bg) 0px, color-mix(in hsl, var(--members-sticky-hover-bg) 78%, transparent) 6px, color-mix(in hsl, var(--members-sticky-hover-bg) 28%, transparent) 16px, transparent 24px)'
                            }}
                        />
                    </>
                )}
            </TableCell>
            <TableCell className="hidden px-4 py-3 sm:table-cell" style={columnStyles.status}>
                <MembersListItemStatus status={item.status} tiers={item.tiers} />
            </TableCell>
            {showEmailOpenRate && (
                <TableCell className="hidden px-4 py-3 lg:table-cell" style={columnStyles.openRate}>
                    <MembersListItemOpenRate emailOpenRate={item.email_open_rate} />
                </TableCell>
            )}
            <TableCell className="hidden px-4 py-3 lg:table-cell" style={columnStyles.location}>
                <MembersListItemLocation geolocation={item.geolocation} />
            </TableCell>
            <TableCell className="hidden px-4 py-3 lg:table-cell" style={columnStyles.created}>
                <MembersListItemCreated createdAt={item.created_at} />
            </TableCell>
            {activeColumns.map(col => (
                <TableCell key={col.key} className="hidden px-4 py-3 lg:table-cell" style={columnStyles.dynamic}>
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
