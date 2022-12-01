import AppContext from '../../AppContext';
import CloseButton from '../common/CloseButton';
import BackButton from '../common/BackButton';
import {useContext, useState} from 'react';
import Switch from '../common/Switch';
import {getSiteNewsletters, hasMemberGotEmailSuppression} from '../../utils/helpers';
import ActionButton from '../common/ActionButton';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/check-circle.svg';

const React = require('react');

function AccountHeader() {
    const {brandColor, lastPage, onAction} = useContext(AppContext);
    return (
        <header className='gh-portal-detail-header'>
            <BackButton brandColor={brandColor} hidden={!lastPage} onClick={(e) => {
                onAction('back');
            }} />
            <h3 className='gh-portal-main-title'>Email preferences</h3>
        </header>
    );
}

function SuccessIcon({show, checked}) {
    let classNames = [];
    if (show) {
        classNames.push('gh-portal-checkmark-show');
    }

    if (checked) {
        classNames.push('gh-portal-toggle-checked');
    }

    classNames.push('gh-portal-checkmark-container');

    return (
        <div className={classNames.join(' ')}>
            <CheckmarkIcon className='gh-portal-checkmark-icon' alt='' />
        </div>
    );
}

function NewsletterPrefSection({newsletter, subscribedNewsletters, setSubscribedNewsletters}) {
    const isChecked = subscribedNewsletters.some((d) => {
        return d.id === newsletter?.id;
    });

    const [showUpdated, setShowUpdated] = useState(false);
    const [timeoutId, setTimeoutId] = useState(null);
    return (
        <section className='gh-portal-list-toggle-wrapper'>
            <div className='gh-portal-list-detail'>
                <h3>{newsletter.name}</h3>
                <p>{newsletter?.description}</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center'}}>
                <SuccessIcon show={showUpdated} checked={isChecked} />
                <Switch id={newsletter.id} onToggle={(e, checked) => {
                    let updatedNewsletters = [];
                    if (!checked) {
                        updatedNewsletters = subscribedNewsletters.filter((d) => {
                            return d.id !== newsletter.id;
                        });
                        setShowUpdated(true);
                        clearTimeout(timeoutId);
                        let newTimeoutId = setTimeout(() => {
                            setShowUpdated(false);
                        }, 2000);
                        setTimeoutId(newTimeoutId);
                    } else {
                        updatedNewsletters = subscribedNewsletters.filter((d) => {
                            return d.id !== newsletter.id;
                        }).concat(newsletter);
                        setShowUpdated(true);
                        clearTimeout(timeoutId);
                        let newTimeoutId = setTimeout(() => {
                            setShowUpdated(false);
                        }, 2000);
                        setTimeoutId(newTimeoutId);
                    }
                    setSubscribedNewsletters(updatedNewsletters);
                }} checked={isChecked} />
            </div>
        </section>
    );
}

function CommentsSection({updateCommentNotifications, isCommentsEnabled, enableCommentNotifications}) {
    const isChecked = !!enableCommentNotifications;

    const [showUpdated, setShowUpdated] = useState(false);
    const [timeoutId, setTimeoutId] = useState(null);

    if (!isCommentsEnabled) {
        return null;
    }

    return (
        <section className='gh-portal-list-toggle-wrapper'>
            <div className='gh-portal-list-detail'>
                <h3>Comments</h3>
                <p>Get notified when someone replies to your comment</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center'}}>
                <SuccessIcon show={showUpdated} checked={isChecked} />
                <Switch id="comments" onToggle={(e, checked) => {
                    setShowUpdated(true);
                    clearTimeout(timeoutId);
                    let newTimeoutId = setTimeout(() => {
                        setShowUpdated(false);
                    }, 2000);
                    setTimeoutId(newTimeoutId);
                    updateCommentNotifications(checked);
                }} checked={isChecked} />
            </div>
        </section>
    );
}

function NewsletterPrefs({subscribedNewsletters, setSubscribedNewsletters}) {
    const {site} = useContext(AppContext);
    const newsletters = getSiteNewsletters({site});
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
            <p style={{textAlign: 'center', marginTop: '12px', marginBottom: '0', color: 'var(--grey6)'}}>Unsubscribing from emails will not cancel your paid subscription to {site?.title}</p>
        );
    }
    return null;
}

export default function NewsletterManagement({
    notification,
    subscribedNewsletters,
    updateSubscribedNewsletters,
    updateCommentNotifications,
    unsubscribeAll,
    isPaidMember,
    isCommentsEnabled,
    enableCommentNotifications
}) {
    const {brandColor, onAction, member, site} = useContext(AppContext);
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
            <footer className={'gh-portal-action-footer' + (hasMemberGotEmailSuppression({member}) ? ' gh-feature-suppressions' : '')}>
                <div style={{width: '100%'}}>
                    <ActionButton
                        isRunning={false}
                        onClick={(e) => {
                            unsubscribeAll();
                        }}
                        disabled={isDisabled}
                        brandColor={brandColor}
                        isPrimary={false}
                        label='Unsubscribe from all emails'
                        isDestructive={true}
                        style={{width: '100%'}}
                    />
                    <ShowPaidMemberMessage isPaid={isPaidMember} site={site} />
                </div>
                {hasMemberGotEmailSuppression({member}) && !isDisabled &&
                <button
                    className='gh-portal-btn-text gh-email-faq-page-button'
                    onClick={() => onAction('switchPage', {page: 'emailReceivingFAQ'})}
                >
                    Not receiving emails? Learn more →
                </button>}
            </footer>
        </div>
    );
}
