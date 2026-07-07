import MemberAddCompModal from './member-add-comp-modal';
import MemberSubscriptionActions from './member-subscription-actions';
import MemberSubscriptionCompActions from './member-subscription-comp-actions';
import React from 'react';
import moment from 'moment-timezone';
import {Badge, Button, Card, CardContent} from '@tryghost/shade/components';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {classifyMemberSubscription, formatSubscriptionInterval, getSubscriptionPriceLabel, getSubscriptionStatusLabel, getSubscriptionValidityLabel, groupSubscriptionsByTier} from './member-subscription';
import {getSymbol} from '@tryghost/admin-x-framework';
import type {Member, MemberSubscription} from '@tryghost/admin-x-framework/api/members';
import type {SubscriptionKind} from './member-subscription';

const formatPriceBlockAmount = (amount: number) => {
    const value = amount / 100;
    // Match Ember: whole = no decimals, fractional = 2 decimals with locale separators.
    return value.toLocaleString(undefined, value % 1 === 0
        ? undefined
        : {minimumFractionDigits: 2, maximumFractionDigits: 2});
};

const PriceBlock: React.FC<{sub: MemberSubscription; kind: SubscriptionKind}> = ({sub, kind}) => {
    if (kind === 'complimentary' || kind === 'gift') {
        return (
            <div className='flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted text-center text-sm font-medium text-muted-foreground'>
                {kind === 'complimentary' ? 'Comp' : 'Gift'}
            </div>
        );
    }
    const symbol = getSymbol(sub.price.currency);
    const amount = formatPriceBlockAmount(sub.price.amount);
    const interval = formatSubscriptionInterval(sub.price.interval);
    return (
        <div className='flex size-20 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-foreground'>
            <div className='flex items-start leading-none'>
                <span className='mt-1 text-sm font-semibold'>{symbol}</span>
                <span className='text-3xl font-semibold tracking-tight'>{amount}</span>
            </div>
            <div className='mt-1 text-xs text-muted-foreground'>{interval}</div>
        </div>
    );
};

const formatDate = (value?: string | null) => (value ? moment(new Date(value)).format('D MMM YYYY') : '');

const SubscriptionDetails: React.FC<{sub: MemberSubscription}> = ({sub}) => {
    const created = formatDate(sub.start_date);
    const source = sub.attribution?.referrer_source;
    const showSource = source && source !== 'Unknown';
    const page = sub.attribution?.title
        ? {title: sub.attribution.title, url: sub.attribution.url ?? null}
        : null;
    return (
        <div className='mt-3 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground'>
            {created && <p>Created — <span className='text-foreground'>{created}</span></p>}
            {showSource && <p>Source — <span className='text-foreground'>{source}</span></p>}
            {page && (
                <p>
                    Page — {page.url ? (
                        <a className='text-foreground hover:underline' href={page.url} rel='noopener noreferrer' target='_blank'>{page.title}</a>
                    ) : <span className='text-foreground'>{page.title}</span>}
                </p>
            )}
        </div>
    );
};

const SubscriptionRow: React.FC<{member: Member; sub: MemberSubscription; showDivider: boolean}> = ({member, sub, showDivider}) => {
    const [showDetails, setShowDetails] = React.useState(false);
    const kind = classifyMemberSubscription(sub);
    const status = getSubscriptionStatusLabel(sub);
    const validity = getSubscriptionValidityLabel(sub);
    const priceLabel = getSubscriptionPriceLabel(sub);

    return (
        <div className={cn('flex items-start justify-between gap-4 py-5 first:pt-0 last:pb-0', showDivider && 'border-t border-border')} data-testid='member-subscription'>
            <div className='flex min-w-0 flex-1 items-start gap-4'>
                <PriceBlock kind={kind} sub={sub} />
                <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                        <span className='min-w-0 truncate font-semibold' data-testid='member-subscription-tier'>{sub.tier?.name ?? 'Subscription'}</span>
                        <Badge data-testid='member-subscription-status' variant={status === 'Canceled' ? 'secondary' : 'success'}>{status}</Badge>
                    </div>
                    {(priceLabel || validity) && (
                        <div className='mt-1 text-sm'>
                            {priceLabel && <span className='font-semibold text-foreground'>{priceLabel}</span>}
                            {priceLabel && validity && <span className='text-muted-foreground'> – </span>}
                            {validity && <span className='text-muted-foreground'>{validity}</span>}
                        </div>
                    )}
                    <button
                        aria-expanded={showDetails}
                        className='mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline'
                        data-testid='member-subscription-details-toggle'
                        type='button'
                        onClick={() => setShowDetails(v => !v)}
                    >
                        Details
                        <LucideIcon.ChevronDown className={cn('transition-transform', showDetails && 'rotate-180')} size={14} />
                    </button>
                    {showDetails && <SubscriptionDetails sub={sub} />}
                </div>
            </div>
            {/* Gift subs get no action menu (Ember parity). Comp subs get their
                own menu with Remove complimentary; paid subs get Cancel/Continue +
                Stripe links. */}
            {kind === 'paid' && (
                <MemberSubscriptionActions memberId={member.id} subscription={sub} />
            )}
            {kind === 'complimentary' && sub.tier?.id && (
                <MemberSubscriptionCompActions member={member} tierId={sub.tier.id} />
            )}
        </div>
    );
};

interface MemberSubscriptionsSectionProps {
    member: Member;
    paidMembersEnabled: boolean;
    // True when there is at least one active paid tier the member could be
    // granted a comp on. Caller (`member-detail.tsx`) fetches tiers and computes.
    canAddComp: boolean;
}

/**
 * Read-only subscriptions block for the member-detail screen. Groups the member's
 * subscriptions by tier so a member with multiple subs to the same tier renders
 * under one heading (matches Ember). When there is nothing to show, nothing
 * renders — the empty-state + "add complimentary" UI is Phase 6.
 *
 * The section heading sits **outside** the card (rendered by the parent) so the
 * card contents flow edge-to-edge without a nested header, matching Ember.
 */
const MemberSubscriptionsSection: React.FC<MemberSubscriptionsSectionProps> = ({member, paidMembersEnabled, canAddComp}) => {
    const [showAddComp, setShowAddComp] = React.useState(false);

    if (!paidMembersEnabled) {
        return null;
    }
    const subscriptions = member.subscriptions ?? [];
    const groups = groupSubscriptionsByTier(subscriptions);
    const hasSubscriptions = groups.length > 0;

    // Ember's `isAddComplimentaryAllowed`: paidMembersEnabled + not new + no tiers
    // yet + at least one active paid tier exists. The caller already checks the
    // first two; we complete the check here with the member's current tier state.
    const isAddCompAllowed = canAddComp && (member.tiers?.length ?? 0) === 0;

    // Nothing to show — no rows, no way to add.
    if (!hasSubscriptions && !isAddCompAllowed) {
        return null;
    }

    // The Add-complimentary button appears in TWO places, matching Ember exactly
    // (`gh-member-settings-form.hbs:82-111,279-293`):
    //   - As the empty-state affordance when there are no subs at all.
    //   - As a footer under existing subs when the member has active paid subs but
    //     no comp tier yet — that's the "cancel Stripe and comp on top" flow.
    const addCompButton = isAddCompAllowed ? (
        <Button
            data-testid='add-complimentary'
            variant='outline'
            onClick={() => setShowAddComp(true)}
        >
            <LucideIcon.Plus className='mr-1' size={16} />
            Add complimentary subscription
        </Button>
    ) : null;

    return (
        <>
            <Card data-testid='member-subscriptions'>
                <CardContent className='pt-6'>
                    {hasSubscriptions
                        ? (
                            <>
                                {groups.map(group => (
                                    <div key={group.tier.id} className='flex flex-col'>
                                        {group.subscriptions.map((sub, i) => (
                                            // For a member with 2+ subs on the same tier, the second key
                                            // needs a fallback since comp/gift subs have `id: ''`.
                                            <SubscriptionRow
                                                key={sub.id || `${group.tier.id}-${i}`}
                                                member={member}
                                                showDivider={i > 0}
                                                sub={sub}
                                            />
                                        ))}
                                        {group.subscriptions.length > 1 && (
                                            <div className='pt-3 text-sm text-muted-foreground'>
                                                {group.subscriptions.length} subscriptions
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {addCompButton && (
                                    <div className='mt-4 flex justify-center border-t border-border pt-4'>
                                        {addCompButton}
                                    </div>
                                )}
                            </>
                        )
                        : (
                            <div className='flex flex-col items-center gap-3 py-6 text-center'>
                                <p className='text-sm text-muted-foreground'>No subscriptions</p>
                                {addCompButton}
                            </div>
                        )}
                </CardContent>
            </Card>
            {isAddCompAllowed && (
                <MemberAddCompModal member={member} open={showAddComp} onOpenChange={setShowAddComp} />
            )}
        </>
    );
};

export default MemberSubscriptionsSection;
