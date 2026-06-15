import {useEffect, useState, type ReactElement} from 'react';
import type {Services, SiteState} from '../../../types';
import type {MembersApiClient, MemberRecord, Subscription} from '../../../shared/api-client';
import {cn} from '../../../shared/cn';
import {CloseButton} from '../../../shared/components/buttons/CloseButton';
import {EmailDeliveryFailedIcon} from '../../../shared/icons/EmailDeliveryFailedIcon';
import {Interpolate} from '../../../shared/i18n/Interpolate';
import {warn} from '../../../shared/log';
import {formatDate, formatPrice, readError} from '../utils';
import {isPaidTier} from '../plans';
import {buildTransistorUrl, canContinueGiftSubscription, checkTransistorMembership, isValidMemberUuid, resolveTransistorDisplay} from '../account-home';

interface Props {
    services: Services;
    api: MembersApiClient;
    onClose(): void;
    onManageNewsletters(): void;
    onShowSuppressed(): void;
    onEditProfile(): void;
    onChangePlan(): void;
}

// Portal's .gh-portal-list anatomy: bordered 20px/8px container, rows with
// edge-to-edge dividers via negative margins, last row flush.
const LIST_BOX = 'gh:mb-10 gh:rounded-lg gh:border gh:border-[#eaeaea] gh:bg-white gh:p-5';
const LIST_ROW = 'gh:-mx-5 gh:mb-5 gh:flex gh:items-center gh:border-b gh:border-[#eaeaea] gh:px-5 gh:pb-5 gh:last:mb-0 gh:last:border-b-0 gh:last:pb-0';
const LIST_DETAIL = 'gh:min-w-0 gh:grow';
const LIST_TITLE = 'gh:m-0 gh:text-[15px] gh:font-semibold gh:text-[#1d1d1d]';
const LIST_TEXT = 'gh:mb-0 gh:me-2 gh:ms-0 gh:mt-[5px] gh:break-words gh:text-[14.5px] gh:leading-[1.3] gh:tracking-[0.3px] gh:text-[#7f7f7f]';
const LIST_BTN = 'gh:-mx-1 gh:h-[38px] gh:shrink-0 gh:cursor-pointer gh:whitespace-nowrap gh:border-0 gh:bg-transparent gh:px-1 gh:text-[15px] gh:font-medium gh:text-[var(--ghost-accent-color,#15171a)] gh:hover:opacity-75 gh:disabled:cursor-not-allowed gh:disabled:opacity-40';
// Portal's base .gh-portal-btn outline button.
const OUTLINE_BTN = 'gh:inline-flex gh:h-11 gh:min-w-20 gh:cursor-pointer gh:items-center gh:justify-center gh:whitespace-nowrap gh:rounded-md gh:border gh:border-[#eaeaea] gh:bg-white gh:px-[18px] gh:text-[15px] gh:font-medium gh:text-[#1d1d1d] gh:no-underline gh:transition-all gh:hover:border-[#dcdcdc] gh:disabled:opacity-60';

const PRIMARY_BTN = cn(
    'gh:flex gh:w-full gh:items-center gh:justify-center gh:gap-2',
    'gh:rounded-md gh:border-0 gh:px-4 gh:py-3 gh:text-[14px] gh:font-semibold gh:text-white gh:cursor-pointer',
    'gh:bg-[var(--ghost-accent-color,#15171a)] gh:disabled:opacity-60 gh:disabled:cursor-not-allowed'
);

// Portal's .gh-portal-cancel-banner: rounded, centered, accent color at 5%.
const BANNER_BOX = 'gh:relative gh:mb-8 gh:rounded-lg gh:p-4 gh:text-center gh:text-[14px] gh:leading-normal gh:text-[#1d1d1d] gh:bg-[color-mix(in_srgb,var(--ghost-accent-color,#15171a)_5%,transparent)]';
const BANNER_TEXT = 'gh:mx-auto gh:mb-4 gh:mt-0 gh:max-w-[320px]';

export function AccountHome({services, api, onClose, onManageNewsletters, onShowSuppressed, onEditProfile, onChangePlan}: Props): ReactElement | null {
    const t = services.t;
    const state = services.getState();
    const member = state.member;
    const site = state.site;
    const locale = site.locale || 'en';

    const [record, setRecord] = useState<MemberRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [signingOut, setSigningOut] = useState(false);
    const [resuming, setResuming] = useState(false);
    const [continuingGift, setContinuingGift] = useState(false);
    const [hasPodcasts, setHasPodcasts] = useState(false);

    useEffect(() => {
        if (!member) return;
        api.member.sessionData()
            .then((rec) => setRecord(rec))
            .catch((err) => warn('sessionData error', err))
            .finally(() => setLoading(false));
    }, [api, member]);

    // Ports use-integrations.js: the row only shows for members Transistor
    // actually knows about, so ask it before rendering anything. In the admin
    // preview the settings alone decide — the fixture member is unknown to
    // Transistor, so no fetch (use-integrations.js:34-36).
    const transistorEnabled = site.transistor_portal_enabled === true;
    const isPreview = Boolean(state.preview);
    const memberUuid = member?.uuid;
    useEffect(() => {
        if (isPreview) {
            setHasPodcasts(transistorEnabled);
            return;
        }
        setHasPodcasts(false);
        if (!transistorEnabled || !isValidMemberUuid(memberUuid)) return;
        const controller = new AbortController();
        checkTransistorMembership(memberUuid, controller.signal)
            .then((v) => { if (!controller.signal.aborted) setHasPodcasts(v); })
            .catch((err) => { if (!controller.signal.aborted) warn('transistor check failed', err); });
        return () => controller.abort();
    }, [isPreview, transistorEnabled, memberUuid]);

    if (!member) return null;

    const subscription = record?.subscriptions?.[0];
    const isPaid = member.status === 'paid';
    const isComped = member.status === 'comped';
    const showBilling = subscription && isPaid && !isComped;

    const displayName = record?.name || member.name || '';
    const displayEmail = record?.email || member.email;
    const avatarUrl = record?.avatar_image;
    const hasPaidTiers = (site.tiers || []).some(isPaidTier);
    const canUpgrade = !subscription && !isComped && hasPaidTiers;

    async function handleSignout(): Promise<void> {
        setSigningOut(true);
        setError('');
        try {
            await api.member.signout();
            services.setMember(null);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to log out, please try again'));
            setSigningOut(false);
        }
    }

    async function handleManageBilling(): Promise<void> {
        if (!subscription) return;
        setError('');
        try {
            await api.member.manageBilling({subscription_id: subscription.id});
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to open billing portal, please try again'));
        }
    }

    async function handleResume(): Promise<void> {
        if (!subscription) return;
        setResuming(true);
        setError('');
        try {
            const res = await api.member.updateSubscription({subscriptionId: subscription.id, cancel_at_period_end: false});
            if (!res.ok) throw new Error(await readError(res, t('Failed to update subscription, please try again')));
            setRecord(await api.member.sessionData());
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to update subscription, please try again'));
        } finally {
            setResuming(false);
        }
    }

    async function handleContinueGift(): Promise<void> {
        setContinuingGift(true);
        setError('');
        try {
            // Redirects to Stripe on success, so the running state stays set.
            await api.member.continueGiftCheckout();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('Failed to process checkout, please try again'));
            setContinuingGift(false);
        }
    }

    const supportHref = `mailto:noreply@${new URL(site.url).hostname}`;

    return (
        <div className="gh:relative">
            <CloseButton onClick={onClose} t={t} />

            <header className="gh:flex gh:flex-col gh:items-center gh:gap-2 gh:mb-8">
                <MemberAvatar src={avatarUrl} alt={displayName || displayEmail} />
                <h1 className="gh:m-0 gh:text-center gh:text-[32px] gh:font-bold gh:leading-[1.1] gh:tracking-[-0.022em] gh:text-[#1d1d1d]">
                    {t('Your account')}
                </h1>
            </header>

            {error && (
                <div className="gh:mb-4 gh:rounded-md gh:bg-[#fde7e7] gh:px-3 gh:py-2 gh:text-[14px] gh:text-[#a3160e]">
                    {error}
                </div>
            )}

            {loading && !record ? (
                <div className="gh:flex gh:justify-center gh:py-6">
                    <Spinner />
                </div>
            ) : (
                <>
                    {canContinueGiftSubscription({memberStatus: member.status, subscription, siteTiers: site.tiers, paidMembersEnabled: site.paid_members_enabled}) && (
                        <GiftContinueBanner
                            submitting={continuingGift}
                            onContinue={() => { void handleContinueGift().catch(err => warn('continue gift error', err)); }}
                            t={t}
                        />
                    )}

                    {subscription?.cancel_at_period_end && (
                        <ResumeSubscriptionBanner
                            expiryDate={formatDate(subscription.current_period_end, locale)}
                            submitting={resuming}
                            onResume={() => { void handleResume().catch(err => warn('resume error', err)); }}
                            t={t}
                        />
                    )}

                    <div className={LIST_BOX}>
                        <ProfileRow
                            name={displayName}
                            email={displayEmail}
                            onEdit={onEditProfile}
                            t={t}
                        />

                        {subscription && (
                            <PlanRow subscription={subscription} isComped={isComped} locale={locale} onChange={onChangePlan} t={t} />
                        )}

                        {canUpgrade && (
                            <UpgradeRow onUpgrade={onChangePlan} t={t} />
                        )}

                        {showBilling && (
                            <BillingRow
                                subscription={subscription}
                                onUpdate={() => { void handleManageBilling().catch(err => warn('billing error', err)); }}
                                t={t}
                            />
                        )}

                        <EmailsRow
                            suppressed={record?.email_suppression?.suppressed ?? false}
                            onManage={record?.email_suppression?.suppressed ? onShowSuppressed : onManageNewsletters}
                            t={t}
                        />

                        {transistorEnabled && hasPodcasts && isValidMemberUuid(memberUuid) && (
                            <TransistorRow site={site} memberUuid={memberUuid} t={t} />
                        )}
                    </div>
                </>
            )}

            <footer className="gh:flex gh:items-center gh:justify-between">
                <button
                    type="button"
                    onClick={() => { void handleSignout().catch(err => warn('signout error', err)); }}
                    disabled={signingOut}
                    className={OUTLINE_BTN}
                >
                    {t('Sign out')}
                </button>
                <a
                    href={supportHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={cn(OUTLINE_BTN, 'gh:text-[var(--ghost-accent-color,#15171a)]')}
                >
                    {t('Contact support')}
                </a>
            </footer>
        </div>
    );
}

interface ProfileRowProps {
    name: string;
    email: string;
    onEdit(): void;
    t: Services['t'];
}

function ProfileRow({name, email, onEdit, t}: ProfileRowProps): ReactElement {
    return (
        <section className={LIST_ROW}>
            <div className={LIST_DETAIL}>
                <h3 className={LIST_TITLE}>{name || t('Account')}</h3>
                <p className={LIST_TEXT}>{email}</p>
            </div>
            <button type="button" onClick={onEdit} className={LIST_BTN}>
                {t('Edit')}
            </button>
        </section>
    );
}

interface PlanRowProps {
    subscription: Subscription;
    isComped: boolean;
    locale: string;
    onChange(): void;
    t: Services['t'];
}

function PlanRow({subscription, isComped, locale, onChange, t}: PlanRowProps): ReactElement {
    const priceLabel = subscription.price
        ? `${formatPrice(subscription.price.amount, subscription.price.currency, locale)}/${subscription.price.interval === 'year' ? t('year') : t('month')}`
        : '';

    const expiry = subscription.expiry_at || subscription.current_period_end;
    const expiryStr = formatDate(expiry, locale);

    const tierName = subscription.tier?.name;
    const title = tierName || t('Plan');

    return (
        <section className={LIST_ROW}>
            <div className={LIST_DETAIL}>
                <h3 className={LIST_TITLE}>{title}</h3>
                {priceLabel && <p className={LIST_TEXT}>{priceLabel}</p>}
                {isComped ? (
                    <p className={LIST_TEXT}>
                        {t('Complimentary')}
                        {expiryStr ? ` — ${t('Expires {expiryDate}', {expiryDate: expiryStr})}` : ''}
                    </p>
                ) : subscription.cancel_at_period_end && expiryStr ? (
                    <p className={cn(LIST_TEXT, 'gh:inline-flex gh:items-center gh:gap-1.5 gh:text-[#a3160e]')}>
                        <span className="gh:rounded gh:bg-[#fde7e7] gh:px-1.5 gh:py-0.5 gh:font-semibold">{t('Canceled')}</span>
                        <span>{t('Expires {expiryDate}', {expiryDate: expiryStr})}</span>
                    </p>
                ) : null}
            </div>
            <button type="button" disabled={isComped} onClick={onChange} className={LIST_BTN}>
                {t('Change')}
            </button>
        </section>
    );
}

interface UpgradeRowProps {
    onUpgrade(): void;
    t: Services['t'];
}

function UpgradeRow({onUpgrade, t}: UpgradeRowProps): ReactElement {
    return (
        <section className={LIST_ROW}>
            <div className={LIST_DETAIL}>
                <h3 className={LIST_TITLE}>{t('Plan')}</h3>
                <p className={LIST_TEXT}>{t('You currently have a free membership, upgrade to a paid subscription for full access.')}</p>
            </div>
            <button type="button" onClick={onUpgrade} className={LIST_BTN}>
                {t('View plans')}
            </button>
        </section>
    );
}

interface BillingRowProps {
    subscription: Subscription;
    onUpdate(): void;
    t: Services['t'];
}

function BillingRow({subscription, onUpdate, t}: BillingRowProps): ReactElement {
    const last4 = subscription.default_payment_card_last4;
    return (
        <section className={LIST_ROW}>
            <div className={LIST_DETAIL}>
                <h3 className={LIST_TITLE}>{t('Billing info & receipts')}</h3>
                <p className={cn(LIST_TEXT, 'gh:font-mono')}>
                    {last4 ? `•••• •••• •••• ${last4}` : '•••• •••• •••• ••••'}
                </p>
            </div>
            <button type="button" onClick={onUpdate} className={LIST_BTN}>
                {t('Update')}
            </button>
        </section>
    );
}

function Spinner(): ReactElement {
    return (
        <div className="gh:h-6 gh:w-6 gh:animate-spin gh:rounded-full gh:border-2 gh:border-[#dadee2] gh:border-t-[#15171a]" />
    );
}

interface AvatarProps {
    src?: string;
    alt: string;
}

function MemberAvatar({src, alt}: AvatarProps): ReactElement {
    return (
        <figure className="gh:relative gh:m-0 gh:flex gh:h-14 gh:w-14 gh:items-center gh:justify-center gh:overflow-hidden gh:rounded-full">
            <UserIcon />
            {src && <img className="gh:absolute gh:inset-[-2px] gh:block gh:w-[calc(100%+4px)] gh:h-[calc(100%+4px)] gh:max-w-none" src={src} alt={alt} />}
        </figure>
    );
}

function UserIcon(): ReactElement {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="gh:h-14 gh:w-14 gh:p-0.5 gh:text-[var(--ghost-accent-color,#15171a)]"
        >
            <circle cx="12" cy="9.75" r="5.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.8" />
            <path d="M18.913,20.876a9.746,9.746,0,0,0-13.826,0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.8" />
            <circle cx="12" cy="12" r="11.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.8" />
        </svg>
    );
}

interface EmailsRowProps {
    suppressed: boolean;
    onManage(): void;
    t: Services['t'];
}

function EmailsRow({suppressed, onManage, t}: EmailsRowProps): ReactElement {
    return (
        <section className={LIST_ROW}>
            <div className={LIST_DETAIL}>
                <h3 className={LIST_TITLE}>{t('Emails')}</h3>
                {suppressed ? (
                    <p className={cn(LIST_TEXT, 'gh:flex gh:items-center gh:gap-[5px] gh:font-medium gh:text-[#f50b18]')}>
                        <EmailDeliveryFailedIcon className="gh:h-5 gh:w-5 gh:shrink-0" />
                        <span className="gh:min-[481px]:hidden">{t("You're not receiving emails")}</span>
                        <span className="gh:hidden gh:min-[481px]:inline">{t("You're currently not receiving emails")}</span>
                    </p>
                ) : (
                    <p className={LIST_TEXT}>{t('Update your preferences')}</p>
                )}
            </div>
            <button type="button" onClick={onManage} className={LIST_BTN}>
                {t('Manage')}
            </button>
        </section>
    );
}

interface TransistorRowProps {
    site: SiteState;
    memberUuid: string;
    t: Services['t'];
}

function TransistorRow({site, memberUuid, t}: TransistorRowProps): ReactElement {
    const {heading, description, buttonText, urlTemplate} = resolveTransistorDisplay(site, t);
    return (
        <section className={cn(LIST_ROW, 'gh-fade-in')}>
            <div className={LIST_DETAIL}>
                <h3 className={LIST_TITLE}>{heading}</h3>
                <p className={LIST_TEXT}>{description}</p>
            </div>
            <a
                href={buildTransistorUrl(urlTemplate, memberUuid)}
                target="_parent"
                rel="noopener noreferrer"
                className={cn(LIST_BTN, 'gh:inline-flex gh:items-center gh:no-underline')}
            >
                {buttonText}
            </a>
        </section>
    );
}

interface GiftContinueBannerProps {
    submitting: boolean;
    onContinue(): void;
    t: Services['t'];
}

function GiftContinueBanner({submitting, onContinue, t}: GiftContinueBannerProps): ReactElement {
    return (
        <div className={BANNER_BOX}>
            <p className={cn(BANNER_TEXT, 'gh:max-w-none gh:[text-wrap:pretty]')}>
                {t('Continue with a paid subscription anytime. Your remaining gift period will be added as a free trial.')}
            </p>
            <button type="button" disabled={submitting} onClick={onContinue} className={PRIMARY_BTN}>
                {t('Continue subscription')}
            </button>
        </div>
    );
}

interface ResumeSubscriptionBannerProps {
    expiryDate: string;
    submitting: boolean;
    onResume(): void;
    t: Services['t'];
}

function ResumeSubscriptionBanner({expiryDate, submitting, onResume, t}: ResumeSubscriptionBannerProps): ReactElement {
    return (
        <div className={BANNER_BOX}>
            <p className={BANNER_TEXT}>
                <Interpolate
                    string={t('Your subscription has been canceled and will expire on {expiryDate}.')}
                    mapping={{expiryDate: <strong>{expiryDate}</strong>}}
                />
            </p>
            <button type="button" disabled={submitting} onClick={onResume} className={PRIMARY_BTN}>
                {t('Resume subscription')}
            </button>
        </div>
    );
}
