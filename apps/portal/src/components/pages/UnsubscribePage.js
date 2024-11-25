import AppContext from '../../AppContext';
import ActionButton from '../common/ActionButton';
import {useContext, useEffect, useState} from 'react';
import {getSiteNewsletters} from '../../utils/helpers';
import NewsletterManagement from '../common/NewsletterManagement';
import CloseButton from '../common/CloseButton';
import {ReactComponent as WarningIcon} from '../../images/icons/warning-fill.svg';
import Interpolate from '@doist/react-interpolate';
import {SYNTAX_I18NEXT} from '@doist/react-interpolate';
import LoadingPage from './LoadingPage';

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

async function updateMemberNewsletters({api, memberUuid, key, newsletters, enableCommentNotifications}) {
    try {
        return await api.member.updateNewsletters({uuid: memberUuid, key, newsletters, enableCommentNotifications});
    } catch (e) {
        // ignore auto unsubscribe error
    }
}

// NOTE: This modal is available even if not logged in, but because it's possible to also be logged in while making modifications,
//  we need to update the member data in the context if logged in.
export default function UnsubscribePage() {
    const {site, api, pageData, member: loggedInMember, onAction, t} = useContext(AppContext);
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
    const {enable_comment_notifications: enableCommentNotifications = false} = member || {};

    const updateNewsletters = async (newsletters) => {
        if (loggedInMember) {
            // when we have a member logged in, we need to update the newsletters in the context
            onAction('updateNewsletterPreference', {newsletters});
        } else {
            await updateMemberNewsletters({api, memberUuid: pageData.uuid, key: pageData.key, newsletters});
        }
        setSubscribedNewsletters(newsletters);
    };

    const updateCommentNotifications = async (enabled) => {
        let updatedData;
        if (loggedInMember) {
            // when we have a member logged in, we need to update the newsletters in the context
            await onAction('updateNewsletterPreference', {enableCommentNotifications: enabled});
            updatedData = {...loggedInMember, enable_comment_notifications: enabled};
        } else {
            updatedData = await updateMemberNewsletters({api, memberUuid: pageData.uuid, key: pageData.key, enableCommentNotifications: enabled});
        }
        setMember(updatedData);
    };

    const unsubscribeAll = async () => {
        let updatedMember;
        if (loggedInMember) {
            await onAction('updateNewsletterPreference', {newsletters: [], enableCommentNotifications: false});
            updatedMember = {...loggedInMember};
            updatedMember.newsletters = [];
            updatedMember.enable_comment_notifications = false;
        } else {
            updatedMember = await api.member.updateNewsletters({uuid: pageData.uuid, key: pageData.key, newsletters: [], enableCommentNotifications: false});
        }
        setSubscribedNewsletters([]);
        setMember(updatedMember);
        onAction('showPopupNotification', {
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
            }
        })();
    }, [commentsEnabled, pageData.uuid, pageData.newsletterUuid, pageData.comments, site.url, siteNewsletters?.length]);

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
                    onClick = {() => onAction('closePopup')}
                    disabled={false}
                    brandColor='#000000'
                    label={t('Close')}
                    isRunning={false}
                    tabindex='3'
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
                            syntax={SYNTAX_I18NEXT}
                            string={t('{{memberEmail}} will no longer receive this newsletter.')}
                            mapping={{
                                memberEmail: <strong>{member?.email}</strong>
                            }}
                        />
                    </p>
                    <p className='gh-portal-text-center'>
                        <Interpolate
                            syntax={SYNTAX_I18NEXT}
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
                            syntax={SYNTAX_I18NEXT}
                            string={t('{{memberEmail}} will no longer receive emails when someone replies to your comments.')}
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
                        syntax={SYNTAX_I18NEXT}
                        string={t('{{memberEmail}} will no longer receive {{newsletterName}} newsletter.')}
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
