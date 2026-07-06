import React from 'react';
import {Badge} from '@tryghost/shade/components';
import {classifyMemberSubscription, formatSubscriptionAmount, formatSubscriptionInterval, getSubscriptionStatusLabel, getSubscriptionValidityLabel, groupSubscriptionsByTier} from './member-subscription';
import type {Member, MemberSubscription} from '@tryghost/admin-x-framework/api/members';

const SubscriptionRow: React.FC<{sub: MemberSubscription}> = ({sub}) => {
    const kind = classifyMemberSubscription(sub);
    const status = getSubscriptionStatusLabel(sub);
    const validity = getSubscriptionValidityLabel(sub);

    const priceLine = kind === 'complimentary'
        ? 'Complimentary'
        : kind === 'gift'
            ? 'Gift subscription'
            : `${formatSubscriptionAmount(sub.price.amount, sub.price.currency)} ${formatSubscriptionInterval(sub.price.interval)}`;

    return (
        <div className='flex items-start justify-between gap-4 rounded-md border border-border p-4' data-testid='member-subscription'>
            <div className='min-w-0'>
                <div className='flex items-center gap-2'>
                    <span className='min-w-0 truncate font-semibold' data-testid='member-subscription-tier'>{sub.tier?.name ?? 'Subscription'}</span>
                    <Badge data-testid='member-subscription-status' variant={status === 'Canceled' ? 'secondary' : 'success'}>{status}</Badge>
                </div>
                <div className='mt-1 text-sm text-muted-foreground'>{priceLine}</div>
                {validity && (
                    <div className='mt-0.5 text-sm text-muted-foreground'>{validity}</div>
                )}
            </div>
        </div>
    );
};

interface MemberSubscriptionsSectionProps {
    member: Member;
    paidMembersEnabled: boolean;
}

/**
 * Read-only subscriptions block for the member-detail screen. Groups the member's
 * subscriptions by tier so a member with multiple subs to the same tier renders
 * under one heading (matches Ember). When there is nothing to show, nothing
 * renders — the empty-state + "add complimentary" UI is Phase 6.
 */
const MemberSubscriptionsSection: React.FC<MemberSubscriptionsSectionProps> = ({member, paidMembersEnabled}) => {
    if (!paidMembersEnabled) {
        return null;
    }
    const subscriptions = member.subscriptions ?? [];
    if (subscriptions.length === 0) {
        return null;
    }
    const groups = groupSubscriptionsByTier(subscriptions);
    if (groups.length === 0) {
        return null;
    }

    return (
        <section className='flex flex-col gap-4' data-testid='member-subscriptions'>
            <h3 className='text-sm font-semibold'>Subscriptions</h3>
            {groups.map(group => (
                <div key={group.tier.id} className='flex flex-col gap-2'>
                    {group.subscriptions.map((sub, i) => (
                        // For a member with 2+ subs on the same tier, the second key
                        // needs a fallback since comp/gift subs have `id: null`.
                        <SubscriptionRow key={sub.id ?? `${group.tier.id}-${i}`} sub={sub} />
                    ))}
                    {group.subscriptions.length > 1 && (
                        <div className='text-sm text-muted-foreground'>
                            {group.subscriptions.length} subscriptions
                        </div>
                    )}
                </div>
            ))}
        </section>
    );
};

export default MemberSubscriptionsSection;
