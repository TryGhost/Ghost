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

async function updateMemberNewsletters({api, memberUuid, key, run, newsletters, enableCommentNotifications}) {
    try {
        return await api.member.updateNewsletters({uuid: memberUuid, key, run, newsletters, enableCommentNotifications});
    } catch (e) {
        // ignore auto unsubscribe error
    }
}

async function unsubscribeAutomation({api, memberUuid, key, run}) {
    return await api.member.unsubscribeAutomation({uuid: memberUuid, key, run});
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
    const [canManagePreferences, setCanManagePreferences] = useState(true);
    const {comments_enabled: commentsEnabled} = site;
    const {enable_comment_notifications: enableCommentNotifications = false} = member || {};

    const hasNewslettersEnabled = hasNewsletterSendingEnabled({site});
    const isAutomationUnsubscribe = pageData.unsubscribeType === 'automation';

    const updateNewsletters = async (newsletters) => {
        if (loggedInMember) {
            doAction('updateNewsletterPreference', {newsletters});
        } else {
            await updateMemberNewsletters({api, memberUuid: pageData.uuid, key: pageData.key, run: pageData.automationRunId, newsletters});
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
            updatedData = await updateMemberNewsletters({api, memberUuid: pageData.uuid, key: pageData.key, run: pageData.automationRunId, enableCommentNotifications: enabled});
        }
        setMember(updatedData);
        doAction('showPopupNotification', {
            action: 'updated:success',
            message: t('Comment preferences updated.')
        });
    };

    const unsubscribeAll = async () => {
        let updatedMember;
        if (loggedInMember) {
            await doAction('updateNewsletterPreference', {newsletters: [], enableCommentNotifications: false});
            updatedMember = {...loggedInMember};
            updatedMember.newsletters = [];
            updatedMember.enable_comment_notifications = false;
        } else {
            updatedMember = await api.member.updateNewsletters({uuid: pageData.uuid, key: pageData.key, run: pageData.automationRunId, newsletters: [], enableCommentNotifications: false});
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
            let automationUnsubscribeData;
            try {
                if (isAutomationUnsubscribe) {
                    // This mount effect can rerun after remounts; the server-side
                    // unsubscribe operation must remain idempotent.
                    automationUnsubscribeData = await unsubscribeAutomation({
                        api,
                        memberUuid: pageData.uuid,
                        key: pageData.key,
                        run: pageData.automationRunId
                    });
                }

                try {
                    memberData = await api.member.newsletters({uuid: pageData.uuid, key: pageData.key, run: pageData.automationRunId});
                } catch (e) {
                    if (!isAutomationUnsubscribe) {
                        throw e;
                    }

                    // The unsubscribe already succeeded. Preferences are secondary,
                    // so keep showing the success state if this follow-up request fails.
                    // eslint-disable-next-line no-console
                    console.error('[PORTAL] Error fetching member newsletters after automation unsubscribe', e);
                    memberData = {
                        uuid: automationUnsubscribeData?.uuid || pageData.uuid,
                        email: automationUnsubscribeData?.email,
                        status: automationUnsubscribeData?.memberStatus,
                        newsletters: []
                    };
                    setCanManagePreferences(false);
                }

                if (memberData === null && isAutomationUnsubscribe) {
                    memberData = {
                        uuid: automationUnsubscribeData?.uuid || pageData.uuid,
                        email: automationUnsubscribeData?.email,
                        status: automationUnsubscribeData?.memberStatus,
                        newsletters: []
                    };
                    setCanManagePreferences(false);
                }

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
            if (isAutomationUnsubscribe) {
                return;
            }
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
            }
        })();
    }, [commentsEnabled, pageData.uuid, pageData.newsletterUuid, pageData.comments, isAutomationUnsubscribe, pageData.automationRunId, site.url, siteNewsletters?.length]);

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

    const AutomationUnsubscribeNotification = ({showManageCopy = true} = {}) => {
        return (
            <div className='gh-portal-header-message gh-portal-header-message-success'>
                <strong className='gh-portal-header-message-title'>{t('You\'ve been unsubscribed from those emails.')}</strong>
                <span>
                    <Interpolate
                        string={showManageCopy ? t('{memberEmail} won\'t receive them anymore. You can manage other email preferences below.') : t('{memberEmail} won\'t receive them anymore.')}
                        mapping={{
                            memberEmail: <strong>{member?.email}</strong>
                        }}
                    />
                </span>
            </div>
        );
    };

    if (isAutomationUnsubscribe && !canManagePreferences) {
        return (
            <div className='gh-portal-content gh-portal-unsubscribe with-footer'>
                <CloseButton />
                <AccountHeader />
                <AutomationUnsubscribeNotification showManageCopy={false} />
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
    if (!isAutomationUnsubscribe && siteNewsletters?.length === 1 && !commentsEnabled && !showPrefs) {
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
        if (isAutomationUnsubscribe) {
            return <AutomationUnsubscribeNotification />;
        }

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
            updateSubscribedNewsletters={async (newsletters) => {
                await updateNewsletters(newsletters);
                setHasInteracted(true);
            }}
            updateCommentNotifications={updateCommentNotifications}
            unsubscribeAll={async () => {
                await unsubscribeAll();
                setHasInteracted(true);
            }}
            isPaidMember={member?.status !== 'free'}
            isCommentsEnabled={commentsEnabled !== 'off'}
            enableCommentNotifications={enableCommentNotifications}
        />
    );
}
