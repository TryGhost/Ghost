/**
 * Account plan management — change tier/cadence, cancel, continue (reactivate),
 * and free → paid upgrade. Orchestrates the shared PlanSelection / PlanConfirm
 * components and the wired checkoutPlan / updateSubscription API calls.
 *
 * On cancel, any retention offer (redemption_type === 'retention') is surfaced
 * first via RetentionOffer; declining falls through to the normal cancel.
 */

import {useEffect, useState, type ReactElement} from 'react';
import type {Services} from '../../../types';
import type {MembersApiClient, MemberRecord, MemberTier, Offer, Subscription} from '../../../shared/api-client';
import {CloseButton} from '../../../shared/components/buttons/CloseButton';
import {BackButton} from '../../../shared/components/buttons/BackButton';
import {cn} from '../../../shared/cn';
import {warn} from '../../../shared/log';
import {isRetentionOffer} from '../../../shared/pricing';
import {formatPrice, formatDate, readError} from '../utils';
import {loadTiers, priceFor, type Cadence} from '../plans';
import {PlanSelection} from '../components/PlanSelection';
import {PlanConfirm} from '../components/PlanConfirm';
import {RetentionOffer} from '../components/RetentionOffer';

interface Props {
    services: Services;
    api: MembersApiClient;
    onClose(): void;
    onBack(): void;
}

type View = 'list' | 'select' | 'confirm' | 'cancel' | 'cancel-offer';



const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);

const SECONDARY_BTN = 'gh:mt-3 gh:w-full gh:rounded-md gh:border gh:border-[#dadee2] gh:bg-white gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-[#15171a] gh:cursor-pointer gh:hover:border-[#a8adb4] gh:disabled:opacity-60';

export function AccountPlan({services, api, onClose, onBack}: Props): ReactElement | null {
    const t = services.t;
    const state = services.getState();
    const member = state.member;
    const site = state.site;
    const locale = site.locale || 'en';

    const isPaidMember = member?.status === 'paid';

    const [record, setRecord] = useState<MemberRecord | null>(null);
    const [tiers, setTiers] = useState<MemberTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<View>(isPaidMember ? 'list' : 'select');
    const [cadence, setCadence] = useState<Cadence>('year');
    const [pendingTier, setPendingTier] = useState<MemberTier | null>(null);
    const [retentionOffer, setRetentionOffer] = useState<Offer | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!member) return;
        let active = true;
        Promise.all([
            api.member.sessionData().catch((err) => {
                warn('sessionData error', err);
                return null;
            }),
            loadTiers(services, api),
        ])
            .then(([rec, ts]) => {
                if (!active) return;
                setRecord(rec);
                setTiers(ts);
                const sub = rec?.subscriptions?.[0];
                if (sub?.price?.interval) setCadence(sub.price.interval);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [api, member, services]);

    if (!member) return null;

    const subscription = record?.subscriptions?.[0];
    const isPaid = isPaidMember && !!subscription;
    const isCanceled = isPaid && subscription?.cancel_at_period_end === true;

    async function refreshMember(): Promise<void> {
        const updated = await api.member.sessionData().catch(() => null);
        if (updated) {
            setRecord(updated);
            if (updated.status !== member?.status) {
                services.setMember({
                    id: updated.id,
                    uuid: updated.uuid,
                    email: updated.email,
                    name: updated.name,
                    status: updated.status,
                });
            }
        }
    }

    function startChange(): void {
        setError('');
        if (subscription?.price?.interval) setCadence(subscription.price.interval);
        setView('select');
    }

    async function handleContinue(): Promise<void> {
        if (!subscription) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await api.member.updateSubscription({subscriptionId: subscription.id, cancel_at_period_end: false});
            if (!res.ok) throw new Error(await readError(res, t('Failed to update subscription, please try again')));
            await refreshMember();
            onBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to update subscription, please try again'));
            setSubmitting(false);
        }
    }

    // A product card was chosen — branch by member type.
    async function handleChoose(tierId: string): Promise<void> {
        setError('');
        const tier = tiers.find(ts => ts.id === tierId);
        if (!tier) return;

        if (!isPaid) {
            // Free / no active subscription → straight to Stripe checkout.
            setSubmitting(true);
            try {
                await api.member.checkoutPlan({tierId: tier.id, cadence});
                // checkoutPlan redirects; if it returns we surface no further UI.
            } catch (err) {
                setError(err instanceof Error ? err.message : t('Failed to process checkout, please try again'));
                setSubmitting(false);
            }
            return;
        }

        // Existing paid member → confirm the change first.
        setPendingTier(tier);
        setView('confirm');
    }

    async function handleConfirmChange(): Promise<void> {
        if (!subscription || !pendingTier) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await api.member.updateSubscription({subscriptionId: subscription.id, tierId: pendingTier.id, cadence});
            if (!res.ok) throw new Error(await readError(res, t('Failed to update subscription, please try again')));
            await refreshMember();
            onBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to update subscription, please try again'));
            setSubmitting(false);
        }
    }

    // Opening the cancel flow: look for a retention offer first; if one exists,
    // show it before the cancellation confirm. Otherwise go straight to cancel.
    async function startCancel(): Promise<void> {
        setError('');
        setSubmitting(true);
        let retention: Offer | undefined;
        try {
            const res = await api.member.offers();
            retention = res.offers.find(isRetentionOffer);
        } catch (err) {
            warn('offers fetch failed', err);
        }
        setSubmitting(false);
        if (retention) {
            setRetentionOffer(retention);
            setView('cancel-offer');
        } else {
            setView('cancel');
        }
    }

    async function handleAcceptRetention(): Promise<void> {
        if (!subscription || !retentionOffer) return;
        setSubmitting(true);
        setError('');
        try {
            await api.member.applyOffer({offerId: retentionOffer.id, subscriptionId: subscription.id});
            await refreshMember();
            onBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('There was an error continuing your subscription, please try again.'));
            setSubmitting(false);
        }
    }

    async function handleCancel(): Promise<void> {
        if (!subscription) return;
        setSubmitting(true);
        setError('');
        try {
            const res = await api.member.updateSubscription({
                subscriptionId: subscription.id,
                smart_cancel: true,
                cancellation_reason: cancelReason.trim() || undefined,
            });
            if (!res.ok) throw new Error(await readError(res, t('Failed to cancel subscription, please try again')));
            await refreshMember();
            onBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to cancel subscription, please try again'));
            setSubmitting(false);
        }
    }

    return (
        <div className="gh:relative">
            <CloseButton onClick={onClose} t={t} />

            {error && (
                <div className="gh:mb-4 gh:rounded-md gh:bg-[#fde7e7] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#a3160e]">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="gh:flex gh:justify-center gh:py-10">
                    <Spinner />
                </div>
            ) : view === 'list' && subscription ? (
                <PlanList
                    subscription={subscription}
                    isCanceled={isCanceled}
                    locale={locale}
                    submitting={submitting}
                    onChange={startChange}
                    onCancel={() => { void startCancel().catch(err => warn('start cancel error', err)); }}
                    onContinue={() => { void handleContinue().catch(err => warn('continue error', err)); }}
                    onBack={onBack}
                    t={t}
                />
            ) : view === 'confirm' && pendingTier ? (
                <PlanConfirm
                    email={record?.email || member.email}
                    planName={pendingTier.name}
                    priceLabel={confirmPriceLabel(pendingTier, cadence, locale, t)}
                    timingLabel={confirmTimingLabel(pendingTier, cadence, subscription, locale, t)}
                    loading={submitting}
                    onConfirm={() => { void handleConfirmChange().catch(err => warn('confirm error', err)); }}
                    onBack={() => { setError(''); setView('select'); }}
                    t={t}
                />
            ) : view === 'cancel-offer' && subscription && retentionOffer ? (
                <RetentionOffer
                    offer={retentionOffer}
                    subscription={subscription}
                    submitting={submitting}
                    locale={locale}
                    onAccept={() => { void handleAcceptRetention().catch(err => warn('accept retention error', err)); }}
                    onDecline={() => { setError(''); setView('cancel'); }}
                    t={t}
                />
            ) : view === 'cancel' && subscription ? (
                <CancelView
                    expiryLabel={formatDate(subscription.current_period_end || subscription.expiry_at, locale)}
                    reason={cancelReason}
                    onReasonChange={setCancelReason}
                    submitting={submitting}
                    onConfirm={() => { void handleCancel().catch(err => warn('cancel error', err)); }}
                    onBack={() => { setError(''); setView('list'); }}
                    t={t}
                />
            ) : (
                // 'select' view
                <div>
                    <BackButton onClick={() => (isPaidMember ? setView('list') : onBack())} t={t} disabled={submitting} />

                    <header className="gh:mb-6">
                        <h1 className="gh:m-0 gh:text-[24px] gh:font-bold gh:leading-tight gh:text-[#15171a]">
                            {isPaid ? t('Change plan') : t('Choose a plan')}
                        </h1>
                    </header>

                    <PlanSelection
                        tiers={tiers}
                        cadence={cadence}
                        onCadenceChange={setCadence}
                        onChoose={(id) => { void handleChoose(id).catch(err => warn('choose error', err)); }}
                        currentSubscription={subscription}
                        ctaLabel={isPaid ? t('Choose') : t('Continue')}
                        busy={submitting}
                        locale={locale}
                        t={t}
                    />
                </div>
            )}
        </div>
    );
}

function confirmPriceLabel(tier: MemberTier, cadence: Cadence, locale: string, t: Services['t']): string {
    const price = priceFor(tier, cadence);
    if (!price) return '';
    return `${formatPrice(price.amount, price.currency, locale)}/${cadence === 'year' ? t('year') : t('month')}`;
}

function confirmTimingLabel(tier: MemberTier, cadence: Cadence, subscription: Subscription | undefined, locale: string, t: Services['t']): string {
    const next = priceFor(tier, cadence);
    const currentAmount = subscription?.price?.amount;
    // Upgrades (same or higher price) take effect immediately; downgrades at period end.
    const isUpgrade = next != null && (currentAmount == null || next.amount >= currentAmount);
    if (isUpgrade) return t('Starting today');
    const startDate = formatDate(subscription?.current_period_end || subscription?.expiry_at, locale);
    return startDate ? t('Starting {startDate}', {startDate}) : t('Starting today');
}

interface PlanListProps {
    subscription: Subscription;
    isCanceled: boolean;
    locale: string;
    submitting: boolean;
    onChange(): void;
    onCancel(): void;
    onContinue(): void;
    onBack(): void;
    t: Services['t'];
}

function PlanList({subscription, isCanceled, locale, submitting, onChange, onCancel, onContinue, onBack, t}: PlanListProps): ReactElement {
    const priceLabel = subscription.price
        ? `${formatPrice(subscription.price.amount, subscription.price.currency, locale)}/${subscription.price.interval === 'year' ? t('year') : t('month')}`
        : '';
    const tierName = subscription.tier?.name || t('Plan');
    const date = formatDate(subscription.current_period_end || subscription.expiry_at, locale);

    return (
        <div>
            <BackButton onClick={onBack} t={t} disabled={submitting} />

            <header className="gh:mb-6">
                <h1 className="gh:m-0 gh:text-[24px] gh:font-bold gh:leading-tight gh:text-[#15171a]">{tierName}</h1>
            </header>

            <div className="gh:mb-6 gh:rounded-lg gh:border gh:border-[#dadee2] gh:p-4">
                {priceLabel && <span className="gh:text-[16px] gh:font-semibold gh:text-[#15171a]">{priceLabel}</span>}
                {isCanceled && date ? (
                    <p className="gh:m-0 gh:mt-2 gh:text-[13px] gh:text-[#a3160e]">
                        {t('Your subscription has been canceled and will expire on {expiryDate}.', {expiryDate: date})}
                    </p>
                ) : date ? (
                    <p className="gh:m-0 gh:mt-2 gh:text-[13px] gh:text-[#7c8087]">
                        {t('Your subscription will renew on {renewalDate}', {renewalDate: date})}
                    </p>
                ) : null}
            </div>

            {isCanceled ? (
                <button type="button" disabled={submitting} onClick={onContinue} className={PRIMARY_BTN}>
                    {t('Continue subscription')}
                </button>
            ) : (
                <>
                    <button type="button" disabled={submitting} onClick={onChange} className={PRIMARY_BTN}>
                        {t('Change plan')}
                    </button>
                    <button type="button" disabled={submitting} onClick={onCancel} className={SECONDARY_BTN}>
                        {t('Cancel subscription')}
                    </button>
                </>
            )}
        </div>
    );
}

interface CancelViewProps {
    expiryLabel: string;
    reason: string;
    onReasonChange(v: string): void;
    submitting: boolean;
    onConfirm(): void;
    onBack(): void;
    t: Services['t'];
}

function CancelView({expiryLabel, reason, onReasonChange, submitting, onConfirm, onBack, t}: CancelViewProps): ReactElement {
    return (
        <div>
            <BackButton onClick={onBack} t={t} disabled={submitting} />

            <header className="gh:mb-4">
                <h1 className="gh:m-0 gh:text-[24px] gh:font-bold gh:leading-tight gh:text-[#15171a]">{t('Cancel subscription')}</h1>
            </header>

            {expiryLabel && (
                <p className="gh:mb-4 gh:text-[14px] gh:text-[#3d3d3d]">
                    {t('If you cancel your subscription now, you will continue to have access until {periodEnd}.', {periodEnd: expiryLabel})}
                </p>
            )}

            <label htmlFor="sp-cancel-reason" className="gh:mb-1.5 gh:block gh:text-[13px] gh:font-medium gh:text-[#3d3d3d]">
                {t('Cancellation reason')}
            </label>
            <textarea
                id="sp-cancel-reason"
                value={reason}
                onChange={e => onReasonChange(e.target.value)}
                rows={3}
                className="gh:mb-5 gh:block gh:w-full gh:resize-none gh:rounded-md gh:border gh:border-[#dadee2] gh:bg-white gh:px-3 gh:py-2.5 gh:text-[14px] gh:text-[#15171a] gh:outline-none gh:focus:border-[#a8adb4]"
            />

            <button
                type="button"
                disabled={submitting}
                onClick={onConfirm}
                className={cn(PRIMARY_BTN, 'gh:bg-[#a3160e]')}
            >
                {t('Confirm cancellation')}
            </button>
        </div>
    );
}

function Spinner(): ReactElement {
    return (
        <div className="gh:h-6 gh:w-6 gh:animate-spin gh:rounded-full gh:border-2 gh:border-[#dadee2] gh:border-t-[#15171a]" />
    );
}
