import moment from 'moment-timezone';

import {Member} from '@tryghost/admin-x-framework/api/members';
import {MemberAvatar} from '@components/member-avatar';

// --- Helpers ---

function formatLocation(geolocation: Member['geolocation']): string {
    if (!geolocation) {
        return 'Unknown';
    }

    try {
        const parsed = JSON.parse(geolocation) as {country?: string; region?: string; country_code?: string};

        if (!parsed.country) {
            return 'Unknown';
        }

        // For US, show "State, US"
        if (parsed.country_code === 'US' && parsed.region) {
            return `${parsed.region}, US`;
        }

        return parsed.country;
    } catch {
        return 'Unknown';
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

function MembersListItemName({item}: {item: Member}) {
    return (
        <div className="flex items-center gap-3">
            <MemberAvatar
                avatarImage={item.avatar_image}
                className="size-10 min-w-10 md:size-10 md:min-w-10"
                memberId={item.id}
            />
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
    );
}

function MembersListItemStatus({status, tiers}: {status: Member['status']; tiers?: Member['tiers']}) {
    const tierNames = tiers?.map(t => t.name).join(', ');
    return (
        <div className="flex justify-end lg:justify-start">
            <div className="min-w-0">
                <div className="text-sm">{getStatusLabel(status)}</div>
                {tierNames && (
                    <div className="truncate text-xs text-muted-foreground">
                        {tierNames}
                    </div>
                )}
            </div>
        </div>
    );
}

function MembersListItemOpenRate({emailOpenRate}: {emailOpenRate: number | null | undefined}) {
    return (
        <div className="hidden text-sm text-muted-foreground lg:block">
            {emailOpenRate !== null && emailOpenRate !== undefined
                ? `${Math.round(emailOpenRate)}%`
                : 'N/A'}
        </div>
    );
}

function MembersListItemLocation({geolocation}: {geolocation: Member['geolocation']}) {
    return (
        <div className="hidden truncate text-sm text-muted-foreground lg:block">
            {formatLocation(geolocation)}
        </div>
    );
}

function MembersListItemCreated({createdAt}: {createdAt: string}) {
    return (
        <div className="hidden lg:block">
            <div className="text-sm">{moment.utc(createdAt).format('D MMM YYYY')}</div>
            <div className="text-xs text-muted-foreground">
                {moment.utc(createdAt).fromNow()}
            </div>
        </div>
    );
}

// --- Main component ---

interface MembersListItemProps {
    item: Member;
    gridCols: string;
    showEmailOpenRate: boolean;
    onClick: (memberId: string) => void;
}

function MembersListItem({item, gridCols, showEmailOpenRate, onClick, ...props}: MembersListItemProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'>) {
    return (
        <div
            {...props}
            className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_7rem] items-center gap-2 border-b px-4 py-3 hover:bg-muted/50 lg:gap-4 ${gridCols}`}
            data-testid="members-list-item"
            onClick={() => onClick(item.id)}
        >
            <MembersListItemName item={item} />
            <MembersListItemStatus status={item.status} tiers={item.tiers} />
            {showEmailOpenRate && (
                <MembersListItemOpenRate emailOpenRate={item.email_open_rate} />
            )}
            <MembersListItemLocation geolocation={item.geolocation} />
            <MembersListItemCreated createdAt={item.created_at} />
        </div>
    );
}

export default MembersListItem;
export {
    MembersListItemName,
    MembersListItemStatus,
    MembersListItemOpenRate,
    MembersListItemLocation,
    MembersListItemCreated
};
