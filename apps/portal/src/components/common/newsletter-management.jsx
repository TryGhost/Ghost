import AppContext from '../../app-context';
import CloseButton from './close-button';
import BackButton from './back-button';
import {useContext, useRef} from 'react';
import Switch from './switch';
import {getSiteNewsletters, hasMemberGotEmailSuppression} from '../../utils/helpers';
import ActionButton from './action-button';
import {t} from '../../utils/i18n';

function AccountHeader() {
    const {brandColor, lastPage, doAction} = useContext(AppContext);
    return (
        <header className='gh-portal-detail-header'>
            <BackButton brandColor={brandColor} hidden={!lastPage} onClick={() => {
                doAction('back');
            }} />
            <h3 className='gh-portal-main-title'>{t('Email preferences')}</h3>
        </header>
    );
}

function NewsletterPrefSection({newsletter, subscribedNewsletters, setSubscribedNewsletters}) {
    const isChecked = subscribedNewsletters.some((d) => {
        return d.id === newsletter?.id;
    });

    const handleToggle = () => {
        let updatedNewsletters = [];
        if (isChecked) {
            updatedNewsletters = subscribedNewsletters.filter((d) => {
                return d.id !== newsletter.id;
            });
        } else {
            updatedNewsletters = subscribedNewsletters.filter((d) => {
                return d.id !== newsletter.id;
            }).concat(newsletter);
        }
        setSubscribedNewsletters(updatedNewsletters);
    };

    return (
        <section
            className='gh-portal-list-toggle-wrapper gh-portal-list-clickable'
            data-testid="newsletter-toggle"
            role="button"
            tabIndex={0}
            aria-pressed={isChecked}
            onClick={handleToggle}
            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) {
                    return;
                }
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle();
                }
            }}
        >
            <div className='gh-portal-list-detail'>
                <h3>{newsletter.name}</h3>
                <p>{newsletter?.description}</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center'}} onClick={(e) => e.stopPropagation()}>
                <Switch id={newsletter.id} label={newsletter.name} onToggle={handleToggle} checked={isChecked} dataTestId="switch-input" presentational={true} />
            </div>
        </section>
    );
}

function CommentsSection({updateCommentNotifications, isCommentsEnabled, enableCommentNotifications}) {
    const {doAction} = useContext(AppContext);
    const isChecked = !!enableCommentNotifications;
    // Ref-based guard so rapid synchronous clicks see the in-flight state
    // immediately — state updates wouldn't be visible until the next render.
    const isUpdatingRef = useRef(false);

    if (!isCommentsEnabled) {
        return null;
    }

    // Guard inside handleToggle so both the row click path and the inner
    // Switch's onToggle path are protected from concurrent updates.
    const handleToggle = async () => {
        if (isUpdatingRef.current) {
            return;
        }
        isUpdatingRef.current = true;
        try {
            await updateCommentNotifications(!isChecked);
            doAction('showPopupNotification', {
                action: 'updated:success',
                message: t('Comment preferences updated.')
            });
        } finally {
            isUpdatingRef.current = false;
        }
    };

    return (
        <section
            className='gh-portal-list-toggle-wrapper gh-portal-list-clickable'
            data-testid="comment-toggle"
            role="button"
            tabIndex={0}
            aria-pressed={isChecked}
            onClick={handleToggle}
            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) {
                    return;
                }
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle();
                }
            }}
        >
            <div className='gh-portal-list-detail'>
                <h3>{t('Comments')}</h3>
                <p>{t('Get notified when someone replies to your comment')}</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center'}} onClick={(e) => e.stopPropagation()}>
                <Switch id="comments" label={t('Comments')} onToggle={handleToggle} checked={isChecked} dataTestId="switch-input" presentational={true} />
            </div>
        </section>
    );
}

function UpdatesAndAnnouncementsSection({updateUpdatesAndAnnouncements, canChangeUpdatesAndAnnouncements, enableUpdatesAndAnnouncements}) {
    const {doAction, site} = useContext(AppContext);
    // Ref-based guard so rapid synchronous clicks see the in-flight state
    // immediately — state updates wouldn't be visible until the next render.
    const isUpdatingRef = useRef(false);

    if (!canChangeUpdatesAndAnnouncements) {
        return null;
    }

    // Guard inside handleToggle so both the row click path and the inner
    // Switch's onToggle path are protected from concurrent updates.
    const handleToggle = async () => {
        if (isUpdatingRef.current) {
            return;
        }
        isUpdatingRef.current = true;
        try {
            await updateUpdatesAndAnnouncements(!enableUpdatesAndAnnouncements);
            doAction('showPopupNotification', {
                action: 'updated:success',
                message: t('Email preferences updated.')
            });
        } finally {
            isUpdatingRef.current = false;
        }
    };

    return (
        <section
            className='gh-portal-list-toggle-wrapper gh-portal-list-clickable'
            data-testid="updates-and-announcements-toggle"
            role="button"
            tabIndex={0}
            aria-pressed={!!enableUpdatesAndAnnouncements}
            onClick={handleToggle}
            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) {
                    return;
                }
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle();
                }
            }}
        >
            <div className='gh-portal-list-detail'>
                <h3>{t('Updates & announcements')}</h3>
                <p>{t('Occasional updates from {siteTitle}', {siteTitle: site?.title})}</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center'}} onClick={(e) => e.stopPropagation()}>
                <Switch id="updates-and-announcements" label={t('Updates & announcements')} onToggle={handleToggle} checked={enableUpdatesAndAnnouncements} dataTestId="switch-input" presentational={true} />
            </div>
        </section>
    );
}

function NewsletterPrefs({subscribedNewsletters, setSubscribedNewsletters, hasNewslettersEnabled}) {
    const {site} = useContext(AppContext);
    const newsletters = getSiteNewsletters({site});
    if (!hasNewslettersEnabled) {
        return null;
    }
    return newsletters.map((newsletter) => {
        return (
            <NewsletterPrefSection
                key={newsletter?.id}
                newsletter={newsletter}
                subscribedNewsletters={subscribedNewsletters}
                setSubscribedNewsletters={setSubscribedNewsletters}
            />
        );
    });
}

function ShowPaidMemberMessage({site, isPaid}) {
    if (isPaid) {
        return (
            <p style={{textAlign: 'center', marginTop: '12px', marginBottom: '0', color: 'var(--grey6)'}}>{t('Unsubscribing from emails will not cancel your paid subscription to {title}', {title: site?.title})}</p>
        );
    }
    return null;
}

export default function NewsletterManagement({
    hasNewslettersEnabled,
    notification,
    subscribedNewsletters,
    updateSubscribedNewsletters,
    updateCommentNotifications,
    updateUpdatesAndAnnouncements,
    unsubscribeAll,
    isPaidMember,
    isCommentsEnabled,
    enableCommentNotifications,
    canChangeUpdatesAndAnnouncements,
    enableUpdatesAndAnnouncements
}) {
    const {brandColor, doAction, member, site} = useContext(AppContext);

    // Snapshot the updates & announcements value when the modal opens. When the member has no
    // explicit preference yet (null), derive it from whether any newsletter is subscribed at open
    // time and keep it fixed while open, so toggling a newsletter doesn't also appear to flip
    // updates & announcements.
    const wasInitiallySubscribedToAnyNewsletters = useRef(!!subscribedNewsletters?.length).current;
    const hasExplicitUpdatesPreference = enableUpdatesAndAnnouncements !== null && enableUpdatesAndAnnouncements !== undefined;
    const effectiveEnableUpdatesAndAnnouncements = hasExplicitUpdatesPreference ? enableUpdatesAndAnnouncements : wasInitiallySubscribedToAnyNewsletters;

    const hasNoCommentSubscription = (isCommentsEnabled && !enableCommentNotifications) || !isCommentsEnabled;
    const hasNoUpdatesSubscription = (canChangeUpdatesAndAnnouncements && !effectiveEnableUpdatesAndAnnouncements) || !canChangeUpdatesAndAnnouncements;
    const isDisabled = !subscribedNewsletters?.length && hasNoCommentSubscription && hasNoUpdatesSubscription;
    const EmptyNotification = () => {
        return null;
    };
    const FinalNotification = notification || EmptyNotification;
    return (
        <div className='gh-portal-content with-footer'>
            <AccountHeader />
            <CloseButton brandColor={brandColor} />
            <FinalNotification />
            <div className='gh-portal-section flex'>
                <div className='gh-portal-list'>
                    <NewsletterPrefs
                        hasNewslettersEnabled={hasNewslettersEnabled}
                        subscribedNewsletters={subscribedNewsletters}
                        setSubscribedNewsletters={(updatedNewsletters) => {
                            let newsletters = updatedNewsletters.map((d) => {
                                return {
                                    id: d.id
                                };
                            });
                            if (canChangeUpdatesAndAnnouncements && !hasExplicitUpdatesPreference) {
                                updateSubscribedNewsletters(newsletters, effectiveEnableUpdatesAndAnnouncements);
                            } else {
                                updateSubscribedNewsletters(newsletters);
                            }
                        }}
                    />
                    <CommentsSection
                        isCommentsEnabled={isCommentsEnabled}
                        enableCommentNotifications={enableCommentNotifications}
                        updateCommentNotifications={updateCommentNotifications}
                    />
                    <UpdatesAndAnnouncementsSection
                        canChangeUpdatesAndAnnouncements={canChangeUpdatesAndAnnouncements}
                        enableUpdatesAndAnnouncements={effectiveEnableUpdatesAndAnnouncements}
                        updateUpdatesAndAnnouncements={updateUpdatesAndAnnouncements}
                    />
                </div>
            </div>
            <div className='gh-portal-btn-unsubscribe'>
                <ActionButton
                    isRunning={false}
                    onClick={() => {
                        unsubscribeAll();
                    }}
                    disabled={isDisabled}
                    brandColor={brandColor}
                    isPrimary={false}
                    label={t('Unsubscribe from all emails')}
                    isDestructive={true}
                    style={{width: '100%'}}
                    dataTestId="unsubscribe-from-all-emails"
                />
            </div>
            <footer className={'gh-portal-action-footer' + (hasMemberGotEmailSuppression({member}) ? ' gh-feature-suppressions' : '')}>
                <div style={{width: '100%'}}>
                    <ShowPaidMemberMessage
                        isPaid={isPaidMember}
                        site={site}
                        subscribedNewsletters={subscribedNewsletters}
                    />
                </div>
                {hasMemberGotEmailSuppression({member}) && !isDisabled &&
                    <div className="gh-portal-footer-secondary">
                        <span className="gh-portal-footer-secondary-light">{t('Not receiving emails?')}</span>
                        <button
                            className="gh-portal-btn-text gh-email-faq-page-button"
                            onClick={() => doAction('switchPage', {page: 'emailReceivingFAQ', pageData: {direct: false}})}
                        >
                            {t('Get help')} <span className="right-arrow">&rarr;</span>
                        </button>
                    </div>
                }
            </footer>
        </div>
    );
}
