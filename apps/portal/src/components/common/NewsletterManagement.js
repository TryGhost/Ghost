import AppContext from '../../AppContext';
import CloseButton from '../common/CloseButton';
import BackButton from '../common/BackButton';
import {useContext} from 'react';
import Switch from '../common/Switch';
import {getSiteNewsletters, hasMemberGotEmailSuppression} from '../../utils/helpers';
import ActionButton from '../common/ActionButton';

function AccountHeader() {
    const {brandColor, lastPage, onAction, t} = useContext(AppContext);
    return (
        <header className='gh-portal-detail-header'>
            <BackButton brandColor={brandColor} hidden={!lastPage} onClick={() => {
                onAction('back');
            }} />
            <h3 className='gh-portal-main-title'>{t('Email preferences')}</h3>
        </header>
    );
}

function NewsletterPrefSection({newsletter, subscribedNewsletters, setSubscribedNewsletters}) {
    const isChecked = subscribedNewsletters.some((d) => {
        return d.id === newsletter?.id;
    });

    return (
        <section className='gh-portal-list-toggle-wrapper' data-testid="toggle-wrapper">
            <div className='gh-portal-list-detail'>
                <h3>{newsletter.name}</h3>
                <p>{newsletter?.description}</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center'}}>
                <Switch id={newsletter.id} onToggle={(e, checked) => {
                    let updatedNewsletters = [];
                    if (!checked) {
                        updatedNewsletters = subscribedNewsletters.filter((d) => {
                            return d.id !== newsletter.id;
                        });
                    } else {
                        updatedNewsletters = subscribedNewsletters.filter((d) => {
                            return d.id !== newsletter.id;
                        }).concat(newsletter);
                    }
                    setSubscribedNewsletters(updatedNewsletters);
                }} checked={isChecked} dataTestId="switch-input" />
            </div>
        </section>
    );
}

function CommentsSection({updateCommentNotifications, isCommentsEnabled, enableCommentNotifications}) {
    const {t, onAction} = useContext(AppContext);
    const isChecked = !!enableCommentNotifications;

    if (!isCommentsEnabled) {
        return null;
    }

    const handleToggle = async (e, checked) => {
        await updateCommentNotifications(checked);
        onAction('showPopupNotification', {
            action: 'updated:success',
            message: t('Comment preferences updated.')
        });
    };

    return (
        <section className='gh-portal-list-toggle-wrapper' data-testid="toggle-wrapper">
            <div className='gh-portal-list-detail'>
                <h3>{t('Comments')}</h3>
                <p>{t('Get notified when someone replies to your comment')}</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center'}}>
                <Switch id="comments" onToggle={handleToggle} checked={isChecked} dataTestId="switch-input" />
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
    const {t} = useContext(AppContext);

    if (isPaid) {
        return (
            <p style={{textAlign: 'center', marginTop: '12px', marginBottom: '0', color: 'var(--grey6)'}}>{t('Unsubscribing from emails will not cancel your paid subscription to {{title}}', {title: site?.title})}</p>
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
    unsubscribeAll,
    isPaidMember,
    isCommentsEnabled,
    enableCommentNotifications
}) {
    const {brandColor, onAction, member, site, t} = useContext(AppContext);
    const isDisabled = !subscribedNewsletters?.length && ((isCommentsEnabled && !enableCommentNotifications) || !isCommentsEnabled);
    const EmptyNotification = () => {
        return null;
    };
    const FinalNotification = notification || EmptyNotification;
    return (
        <div className='gh-portal-content with-footer'>
            <CloseButton />
            <AccountHeader />
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
                            updateSubscribedNewsletters(newsletters);
                        }}
                    />
                    <CommentsSection
                        isCommentsEnabled={isCommentsEnabled}
                        enableCommentNotifications={enableCommentNotifications}
                        updateCommentNotifications={updateCommentNotifications}
                    />
                </div>
            </div>
            <div className='gh-portal-btn-product gh-portal-btn-unsubscribe' style={{marginTop: '-48px', marginBottom: 0}}>
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
                    style={{width: '100%', zIndex: 900}}
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
                            onClick={() => onAction('switchPage', {page: 'emailReceivingFAQ', pageData: {direct: false}})}
                        >
                            {/* eslint-disable-next-line i18next/no-literal-string */}
                            {t('Get help')} <span className="right-arrow">&rarr;</span>
                        </button>
                    </div>
                }
            </footer>
        </div>
    );
}
