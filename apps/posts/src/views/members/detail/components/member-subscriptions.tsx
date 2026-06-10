import React, {useState} from 'react';
import {Badge, Button, LoadingIndicator, Popover, PopoverContent, PopoverTrigger, Separator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {MemberTierGroup, SubscriptionData, formatPriceAmount, getOfferDisplayData, groupSubscriptionsByTier} from '../subscription-data';
import type {Member} from '@tryghost/admin-x-framework/api/members';
import type {Tier} from '@tryghost/admin-x-framework/api/tiers';

function SubscriptionActionsMenu({children}: {children: React.ReactNode}) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button aria-label="Subscription actions" size="icon" title="Actions" variant="outline">
                    <LucideIcon.Ellipsis className="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-1" onClick={() => setOpen(false)}>
                {children}
            </PopoverContent>
        </Popover>
    );
}

function MenuItemButton({onClick, destructive, disabled, children}: {
    onClick: () => void;
    destructive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            className={`flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50 ${destructive ? 'text-destructive' : ''}`}
            disabled={disabled}
            type="button"
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function MenuItemLink({href, children}: {href: string; children: React.ReactNode}) {
    return (
        <a
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
        >
            {children}
        </a>
    );
}

function SubscriptionPrice({sub}: {sub: SubscriptionData}) {
    return (
        <div className="w-24 shrink-0">
            <div className="flex items-start text-xl font-semibold">
                {sub.hasActiveDiscount && sub.discountedPrice && sub.originalPrice ? (
                    <>
                        <span className="text-sm">{sub.discountedPrice.currencySymbol}</span>
                        <span>{formatPriceAmount(sub.discountedPrice.amount)}</span>
                        <span className="ml-1 text-sm font-normal text-muted-foreground line-through">
                            {sub.originalPrice.currencySymbol}{formatPriceAmount(sub.originalPrice.amount)}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="text-sm">{sub.price.currencySymbol}</span>
                        <span>{formatPriceAmount(sub.price.amount)}</span>
                    </>
                )}
            </div>
            <div className="text-sm text-muted-foreground">{sub.price.interval === 'year' ? 'yearly' : 'monthly'}</div>
        </div>
    );
}

function SubscriptionStatusBadge({sub}: {sub: SubscriptionData}) {
    if (sub.status === 'canceled' || sub.cancel_at_period_end) {
        return <Badge data-testid="member-subscription-status" variant="secondary">Canceled</Badge>;
    }
    return <Badge className="bg-green/15 text-green" data-testid="member-subscription-status" variant="secondary">Active</Badge>;
}

function SubscriptionDetailBox({sub}: {sub: SubscriptionData}) {
    const offerData = sub.offer ? getOfferDisplayData(sub.offer, sub.sub) : null;

    return (
        <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span>Started on {sub.startDate}</span>
            {offerData && <span>{offerData.label}: {offerData.detail}</span>}
            {sub.cancellationReason && <span>Cancellation reason: {sub.cancellationReason}</span>}
        </div>
    );
}

function SubscriptionRow({tier, sub, subCount, loadingKey, onCancel, onContinue, onRemoveComplimentary}: {
    tier: MemberTierGroup;
    sub: SubscriptionData;
    subCount: number;
    loadingKey: string | null;
    onCancel: (subscriptionId: string) => void;
    onContinue: (subscriptionId: string) => void;
    onRemoveComplimentary: (tierId: string) => void;
}) {
    const tierId = tier.id ?? tier.tier_id ?? '';

    return (
        <div className="flex items-start gap-4 border-b py-4 last:border-b-0">
            <SubscriptionPrice sub={sub} />
            <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-2 font-semibold" data-testid="tier-name">
                    {tier.name}
                    <SubscriptionStatusBadge sub={sub} />
                    {subCount > 1 && <span className="text-xs font-normal text-muted-foreground">{subCount} subscriptions</span>}
                </h3>
                <div className="text-sm text-muted-foreground">
                    {sub.priceLabel && <span>{sub.priceLabel}</span>}
                    <span>{sub.validityDetails}</span>
                </div>
                <SubscriptionDetailBox sub={sub} />
            </div>
            {sub.isGift ? null : sub.isComplimentary ? (
                <SubscriptionActionsMenu>
                    <MenuItemButton
                        disabled={loadingKey === `complimentary-${tierId}`}
                        destructive
                        onClick={() => onRemoveComplimentary(tierId)}
                    >
                        Remove complimentary subscription
                    </MenuItemButton>
                </SubscriptionActionsMenu>
            ) : (
                <SubscriptionActionsMenu>
                    <MenuItemLink href={`https://dashboard.stripe.com/customers/${sub.customer?.id}`}>
                        View Stripe customer
                    </MenuItemLink>
                    <Separator className="my-1" />
                    <MenuItemLink href={`https://dashboard.stripe.com/subscriptions/${sub.id}`}>
                        View Stripe subscription
                    </MenuItemLink>
                    {sub.status !== 'canceled' && (
                        sub.cancel_at_period_end ? (
                            <MenuItemButton disabled={loadingKey === sub.id} onClick={() => onContinue(sub.id)}>
                                Continue subscription
                            </MenuItemButton>
                        ) : (
                            <MenuItemButton disabled={loadingKey === sub.id} destructive onClick={() => onCancel(sub.id)}>
                                Cancel subscription
                            </MenuItemButton>
                        )
                    )}
                </SubscriptionActionsMenu>
            )}
        </div>
    );
}

/**
 * The member's paid/complimentary subscriptions grouped by tier, with the
 * Stripe/cancel/complimentary actions. Port of the subscriptions section of
 * gh-member-settings-form.hbs.
 */
export function MemberSubscriptions({member, paidTiers, isSaving, loadingKey, onAddComplimentary, onCancelSubscription, onContinueSubscription, onRemoveComplimentary}: {
    member: Member;
    paidTiers: Tier[];
    isSaving: boolean;
    loadingKey: string | null;
    onAddComplimentary: () => void;
    onCancelSubscription: (subscriptionId: string) => void;
    onContinueSubscription: (subscriptionId: string) => void;
    onRemoveComplimentary: (tierId: string) => void;
}) {
    const subscriptions = member.subscriptions ?? [];
    const tiers = groupSubscriptionsByTier(subscriptions);

    // complimentary subscriptions are assigned to tiers, so adding one only
    // makes sense when there's a paid tier to assign it to
    const isAddComplimentaryAllowed = (member.tiers?.length ?? 0) === 0 && paidTiers.length > 0;

    const addComplimentaryButton = isSaving ? (
        <div className="flex justify-center py-3"><LoadingIndicator size="sm" /></div>
    ) : (
        <Button className="text-green" type="button" variant="ghost" onClick={onAddComplimentary}>
            <LucideIcon.Plus className="size-4" />
            Add complimentary subscription
        </Button>
    );

    return (
        <section className="mt-8">
            <h4 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Subscriptions</h4>

            {tiers.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border py-10">
                    {!isSaving && <h4 className="font-semibold text-muted-foreground">No subscriptions</h4>}
                    {isAddComplimentaryAllowed && addComplimentaryButton}
                </div>
            ) : (
                <>
                    <div className="rounded-lg border px-4">
                        {tiers.map(tier => (
                            <React.Fragment key={tier.id ?? tier.tier_id}>
                                {tier.subscriptions.map(sub => (
                                    <SubscriptionRow
                                        key={sub.id || `complimentary-${tier.id ?? tier.tier_id}`}
                                        loadingKey={loadingKey}
                                        sub={sub}
                                        subCount={tier.subscriptions.length}
                                        tier={tier}
                                        onCancel={onCancelSubscription}
                                        onContinue={onContinueSubscription}
                                        onRemoveComplimentary={onRemoveComplimentary}
                                    />
                                ))}
                                {tier.subscriptions.length === 0 && (
                                    <div className="flex items-start gap-4 border-b py-4 last:border-b-0">
                                        <div className="w-24 shrink-0">
                                            <div className="flex items-start text-xl font-semibold">
                                                <span className="text-sm">$</span>
                                                <span>0</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">yearly</div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="flex items-center gap-2 font-semibold">
                                                Complimentary
                                                <Badge className="bg-green/15 text-green" variant="secondary">Active</Badge>
                                            </h3>
                                        </div>
                                        <SubscriptionActionsMenu>
                                            <MenuItemButton
                                                disabled={loadingKey === `complimentary-${tier.id ?? tier.tier_id}`}
                                                destructive
                                                onClick={() => onRemoveComplimentary(tier.id ?? tier.tier_id ?? '')}
                                            >
                                                Remove complimentary subscription
                                            </MenuItemButton>
                                        </SubscriptionActionsMenu>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    {isAddComplimentaryAllowed && (
                        <div className="mt-2">{addComplimentaryButton}</div>
                    )}
                </>
            )}
        </section>
    );
}
