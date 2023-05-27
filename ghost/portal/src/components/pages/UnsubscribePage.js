import AppContext from '../../AppContext';
import ActionButton from '../common/ActionButton';
import React, {useContext, useEffect, useState} from 'react';
import {getSiteNewsletters} from '../../utils/helpers';
import setupGhostApi from '../../utils/api';
import NewsletterManagement from '../common/NewsletterManagement';
import CloseButton from '../common/CloseButton';
import {ReactComponent as WarningIcon} from '../../images/icons/warning-fill.svg';
import Interpolate from '@doist/react-interpolate';
import {SYNTAX_I18NEXT} from '@doist/react-interpolate';

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

async function updateMemberNewsletters({api, memberUuid, newsletters, enableCommentNotifications}) {
    try {
        return await api.member.updateNewsletters({uuid: memberUuid, newsletters, enableCommentNotifications});
    } catch (e) {
        // ignore auto unsubscribe error
    }
}

export default function UnsubscribePage() {
    const {site, pageData, onAction, t} = useContext(AppContext);
    const api = setupGhostApi({siteUrl: site.url});
    const [member, setMember] = useState();
    const siteNewsletters = getSiteNewsletters({site});
    const defaultNewsletters = siteNewsletters.filter((d) => {
        return d.subscribe_on_signup;
    });
    const [hasInteracted, setHasInteracted] = useState(false);
    const [subscribedNewsletters, setSubscribedNewsletters] = useState(defaultNewsletters);
    const [showPrefs, setShowPrefs] = useState(false);
    const {comments_enabled: commentsEnabled} = site;
    const {enable_comment_notifications: enableCommentNotifications = false} = member || {};

    useEffect(() => {
        const ghostApi = setupGhostApi({siteUrl: site.url});
        (async () => {
            const memberData = await ghostApi.member.newsletters({uuid: pageData.uuid});

            setMember(memberData);
            const memberNewsletters = memberData?.newsletters || [];
            setSubscribedNewsletters(memberNewsletters);
            if (siteNewsletters?.length === 1 && !commentsEnabled) {
                // Unsubscribe from all the newsletters, because we only have one
                const updatedData = await updateMemberNewsletters({
                    api: ghostApi,
                    memberUuid: pageData.uuid,
                    newsletters: []
                });
                setSubscribedNewsletters(updatedData.newsletters);
            } else if (pageData.newsletterUuid) {
                // Unsubscribe link for a specific newsletter
                const updatedData = await updateMemberNewsletters({
                    api: ghostApi,
                    memberUuid: pageData.uuid,
                    newsletters: memberNewsletters?.filter((d) => {
                        return d.uuid !== pageData.newsletterUuid;
                    })
                });
                setSubscribedNewsletters(updatedData.newsletters);
            } else if (pageData.comments && commentsEnabled) {
                // Unsubscribe link for comments
                const updatedData = await updateMemberNewsletters({
                    api: ghostApi,
                    memberUuid: pageData.uuid,
                    enableCommentNotifications: false
                });

                setMember(updatedData);
            }
        })();
    }, [commentsEnabled, pageData.uuid, pageData.newsletterUuid, pageData.comments, site.url, siteNewsletters?.length]);

    // Case: Email not found
    if (member === null) {
        return (
            <div className='gh-portal-content gh-portal-feedback with-footer'>
                <CloseButton />
                <div class="gh-feedback-icon gh-feedback-icon-error">
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
                setSubscribedNewsletters(newsletters);
                setHasInteracted(true);
                await api.member.updateNewsletters({uuid: pageData.uuid, newsletters});
            }}
            updateCommentNotifications={async (enabled) => {
                const updatedMember = await api.member.updateNewsletters({uuid: pageData.uuid, enableCommentNotifications: enabled});
                setMember(updatedMember);
            }}
            unsubscribeAll={async () => {
                setHasInteracted(true);
                setSubscribedNewsletters([]);
                onAction('showPopupNotification', {
                    action: 'updated:success',
                    message: t(`Email preference updated.`)
                });
                const updatedMember = await api.member.updateNewsletters({uuid: pageData.uuid, newsletters: [], enableCommentNotifications: false});
                setMember(updatedMember);
            }}
            isPaidMember={member?.status !== 'free'}
            isCommentsEnabled={commentsEnabled !== 'off'}
            enableCommentNotifications={enableCommentNotifications}
        />
    );
}
