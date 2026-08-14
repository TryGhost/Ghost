import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import {useContext, useEffect, useState} from 'react';
import {getSiteNewsletters,hasNewsletterSendingEnabled} from '../../utils/helpers';
import NewsletterManagement from '../common/newsletter-management';
import CloseButton from '../common/close-button';
import WarningIcon from '../../images/icons/warning-fill.svg?react';
import Interpolate from '@doist/react-interpolate';
import LoadingPage from './loading-page';
import {t} from '../../utils/i18n';

function SiteLogo() {
    const {site} = useContext(AppContext);
    const siteLogo = site.icon;

    if (siteLogo) {
        return (
            <img className='gh-portal-unsubscribe-logo' src={siteLogo} alt={site.title} />
        );
    }
    return (null);
}

function AccountHeader() {
    const {site} = useContext(AppContext);
    const siteTitle = site.title || '';
    return (
        <header className='gh-portal-header'>
            <SiteLogo />
            <h2 className="gh-portal-publication-title">{siteTitle}</h2>
        </header>
    );
}

async function updateMemberNewsletters({api, memberUuid, key, newsletters, enableCommentNotifications, enableUpdatesAndAnnouncements}) {
    try {
        return await api.member.updateNewsletters({uuid: memberUuid, key, newsletters, enableCommentNotifications, enableUpdatesAndAnnouncements});
    } catch (e) {
        // ignore auto unsubscribe error
    }
}

// NOTE: This modal is available even if not logged in, but because it's possible to also be logged in while making modifications,
//  we need to update the member data in the context if logged in.
export default function UnsubscribePage() {
    const {site, api, pageData, member: loggedInMember, doAction} = useContext(AppContext);
    // member is the member data fetched from the API based on the uuid and its state is limited to just this modal, not all of Portal
    const [member, setMember] = useState();
    const [loading, setLoading] = useState(true);
    const siteNewsletters = getSiteNewsletters({site});
    const defaultNewsletters = siteNewsletters.filter((d) => {
        return d.subscribe_on_signup;
    });
    const [hasInteracted, setHasInteracted] = useState(false);
    const [subscribedNewsletters, setSubscribedNewsletters] = useState(defaultNewsletters);
    const [showPrefs, setShowPrefs] = useState(false);
    const {comments_enabled: commentsEnabled} = site;
    const canChangeUpdatesAndAnnouncements = !!site.labs?.automations;
    const {
        enable_comment_notifications: enableCommentNotifications = false,
        enable_updates_and_announcements: enableUpdatesAndAnnouncements
    } = member || {};

    const hasNewslettersEnabled = hasNewsletterSendingEnabled({site});

    const updateNewsletters = async (newsletters, enableUpdatesAndAnnouncementsValue) => {
        const update = {newsletters};
        if (enableUpdatesAndAnnouncementsValue !== undefined) {
            update.enableUpdatesAndAnnouncements = enableUpdatesAndAnnouncementsValue;
        }
        if (loggedInMember) {
            doAction('updateNewsletterPreference', update);
        } else {
            await updateMemberNewsletters({api, memberUuid: pageData.uuid, key: pageData.key, ...update});
        }
        setSubscribedNewsletters(newsletters);
        const notification = {
            action: `updated:success`,
            message: t('Email preferences updated.')
        };
        doAction('showPopupNotification', notification);
    };

    const updateCommentNotifications = async (enabled) => {
        let updatedData;
        if (loggedInMember) {
            // when we have a member logged in, we need to update the newsletters in the context
            await doAction('updateNewsletterPreference', {enableCommentNotifications: enabled});
            updatedData = {...loggedInMember, enable_comment_notifications: enabled};
        } else {
            updatedData = await updateMemberNewsletters({api, memberUuid: pageData.uuid, key: pageData.key, enableCommentNotifications: enabled});
        }
        setMember(updatedData);
        doAction('showPopupNotification', {
            action: 'updated:success',
            message: t('Comment preferences updated.')
        });
    };

    const updateUpdatesAndAnnouncements = async (enabled) => {
        let updatedData;
        if (loggedInMember) {
            await doAction('updateNewsletterPreference', {enableUpdatesAndAnnouncements: enabled});
            updatedData = {...loggedInMember, enable_updates_and_announcements: enabled};
        } else {
            updatedData = await updateMemberNewsletters({api, memberUuid: pageData.uuid, key: pageData.key, enableUpdatesAndAnnouncements: enabled});
        }
        setMember(updatedData);
        doAction('showPopupNotification', {
            action: 'updated:success',
            message: t('Email preferences updated.')
        });
    };

    const unsubscribeAll = async () => {
        let updatedMember;
        if (loggedInMember) {
            await doAction('updateNewsletterPreference', {newsletters: [], enableCommentNotifications: false, enableUpdatesAndAnnouncements: false});
            updatedMember = {...loggedInMember};
            updatedMember.newsletters = [];
            updatedMember.enable_comment_notifications = false;
            updatedMember.enable_updates_and_announcements = false;
        } else {
            updatedMember = await api.member.updateNewsletters({uuid: pageData.uuid, key: pageData.key, newsletters: [], enableCommentNotifications: false, enableUpdatesAndAnnouncements: false});
        }
        setSubscribedNewsletters([]);
        setMember(updatedMember);
        doAction('showPopupNotification', {
            action: 'updated:success',
            message: t(`Unsubscribed from all emails.`)
        });
    };

    // This handles the url query param actions that ultimately launch this component/modal
    useEffect(() => {
        (async () => {
            let memberData;
            try {
                memberData = await api.member.newsletters({uuid: pageData.uuid, key: pageData.key});
                setMember(memberData ?? null);
                setLoading(false);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('[PORTAL] Error fetching member newsletters', e);
                setMember(null);
                setLoading(false);
                return;
            }

            if (memberData === null) {
                return;
            }

            const memberNewsletters = memberData?.newsletters || [];
            setSubscribedNewsletters(memberNewsletters);
            if (siteNewsletters?.length === 1 && !commentsEnabled && !pageData.newsletterUuid) {
                // Unsubscribe from all the newsletters, because we only have one
                await updateNewsletters([]);
            } else if (pageData.newsletterUuid) {
                // Unsubscribe link for a specific newsletter
                await updateNewsletters(memberNewsletters?.filter((d) => {
                    return d.uuid !== pageData.newsletterUuid;
                }));
            } else if (pageData.comments && commentsEnabled) {
                // Unsubscribe link for comments
                await updateCommentNotifications(false);
            } else if (pageData.updatesAndAnnouncements && canChangeUpdatesAndAnnouncements) {
                // Unsubscribe link for updates & announcements (automation emails)
                await updateUpdatesAndAnnouncements(false);
            }
        })();
    }, [commentsEnabled, canChangeUpdatesAndAnnouncements, pageData.uuid, pageData.newsletterUuid, pageData.comments, pageData.updatesAndAnnouncements, site.url, siteNewsletters?.length]);

    if (loading) {
        // Loading member data from the API based on the uuid
        return (
            <LoadingPage />
        );
    }

    // Case: invalid uuid passed
    if (!member) {
        return (
            <div className='gh-portal-content gh-portal-feedback with-footer'>
                <CloseButton />
                <div className="gh-feedback-icon gh-feedback-icon-error">
                    <WarningIcon />
                </div>
                <h1 className="gh-portal-main-title">{t('That didn\'t go to plan')}</h1>
                <div>
                    <p className="gh-portal-text-center">{t('We couldn\'t unsubscribe you as the email address was not found. Please contact the site owner.')}</p>
                </div>
                <ActionButton
                    style={{width: '100%'}}
                    retry={false}
                    onClick = {() => doAction('closePopup')}
                    disabled={false}
                    brandColor='#000000'
                    label={t('Close')}
                    isRunning={false}
                    tabIndex={3}
                    classes={'sticky bottom'}
                />
            </div>
        );
    }

    // Case: Single active newsletter
    if (siteNewsletters?.length === 1 && !commentsEnabled && !showPrefs) {
        return (
            <div className='gh-portal-content gh-portal-unsubscribe with-footer'>
                <CloseButton />
                <AccountHeader />
                <h1 className="gh-portal-main-title">{t('Successfully unsubscribed')}</h1>
                <div>
                    <p className='gh-portal-text-center'>
                        <Interpolate
                            string={t('{memberEmail} will no longer receive this newsletter.')}
                            mapping={{
                                memberEmail: <strong>{member?.email}</strong>
                            }}
                        />
                    </p>
                    <p className='gh-portal-text-center'>
                        <Interpolate
                            string={t('Didn\'t mean to do this? Manage your preferences <button>here</button>.')}
                            mapping={{
                                button: <button
                                    className="gh-portal-btn-link gh-portal-btn-branded gh-portal-btn-inline"
                                    onClick={() => {
                                        setShowPrefs(true);
                                    }}
                                />
                            }}
                        />
                    </p>
                </div>
            </div>
        );
    }

    const HeaderNotification = () => {
        if (pageData.comments && commentsEnabled) {
            const hideClassName = hasInteracted ? 'gh-portal-hide' : '';
            return (
                <>
                    <p className={`gh-portal-text-center gh-portal-header-message ${hideClassName}`}>
                        <Interpolate
                            string={t('{memberEmail} will no longer receive emails when someone replies to your comments.')}
                            mapping={{
                                memberEmail: <strong>{member?.email}</strong>
                            }}
                        />
                    </p>
                </>
            );
        }
        if (pageData.updatesAndAnnouncements && canChangeUpdatesAndAnnouncements) {
            const hideClassName = hasInteracted ? 'gh-portal-hide' : '';
            return (
                <>
                    <p className={`gh-portal-text-center gh-portal-header-message ${hideClassName}`}>
                        <Interpolate
                            string={t('{memberEmail} will no longer receive updates & announcements.')}
                            mapping={{
                                memberEmail: <strong>{member?.email}</strong>
                            }}
                        />
                    </p>
                </>
            );
        }
        const unsubscribedNewsletter = siteNewsletters?.find((d) => {
            return d.uuid === pageData.newsletterUuid;
        });

        if (!unsubscribedNewsletter) {
            return null;
        }

        const hideClassName = hasInteracted ? 'gh-portal-hide' : '';
        return (
            <>
                <p className={`gh-portal-text-center gh-portal-header-message ${hideClassName}`}>
                    <Interpolate
                        string={t('{memberEmail} will no longer receive {newsletterName} newsletter.')}
                        mapping={{
                            memberEmail: <strong>{member?.email}</strong>,
                            newsletterName: <strong>{unsubscribedNewsletter?.name}</strong>
                        }}
                    />
                </p>
            </>
        );
    };

    return (
        <NewsletterManagement
            hasNewslettersEnabled={hasNewslettersEnabled}
            notification={HeaderNotification}
            subscribedNewsletters={subscribedNewsletters}
            updateSubscribedNewsletters={async (newsletters, enableUpdatesAndAnnouncementsValue) => {
                await updateNewsletters(newsletters, enableUpdatesAndAnnouncementsValue);
                setHasInteracted(true);
            }}
            updateCommentNotifications={updateCommentNotifications}
            updateUpdatesAndAnnouncements={updateUpdatesAndAnnouncements}
            unsubscribeAll={async () => {
                await unsubscribeAll();
                setHasInteracted(true);
            }}
            isPaidMember={member?.status !== 'free'}
            isCommentsEnabled={commentsEnabled !== 'off'}
            enableCommentNotifications={enableCommentNotifications}
            canChangeUpdatesAndAnnouncements={canChangeUpdatesAndAnnouncements}
            enableUpdatesAndAnnouncements={enableUpdatesAndAnnouncements}
        />
    );
}
