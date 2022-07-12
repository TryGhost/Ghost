import AppContext from '../../AppContext';

import {useContext, useEffect, useState} from 'react';
import {getSiteNewsletters} from '../../utils/helpers';
import setupGhostApi from '../../utils/api';
import NewsletterManagement from '../common/NewsletterManagement';
import CloseButton from '../common/CloseButton';

const React = require('react');

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

async function updateMemberNewsletters({api, memberUuid, newsletters}) {
    try {
        return await api.member.updateNewsletters({uuid: memberUuid, newsletters});
    } catch (e) {
        // ignore auto unsubscribe error
    }
}

export default function UnsubscribePage() {
    const {site, pageData, onAction} = useContext(AppContext);
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
            if (siteNewsletters?.length === 1) {
                const updatedData = await updateMemberNewsletters({
                    api: ghostApi,
                    memberUuid: pageData.uuid,
                    newsletters: []
                });
                setSubscribedNewsletters(updatedData.newsletters);
            } else if (pageData.newsletterUuid) {
                const updatedData = await updateMemberNewsletters({
                    api: ghostApi,
                    memberUuid: pageData.uuid,
                    newsletters: memberNewsletters?.filter((d) => {
                        return d.uuid !== pageData.newsletterUuid;
                    })
                });
                setSubscribedNewsletters(updatedData.newsletters);
            }
        })();
    }, [pageData.uuid, pageData.newsletterUuid, site.url, siteNewsletters?.length]);

    // Case: Email not found
    if (member === null) {
        return (
            <div className='gh-portal-content gh-portal-unsubscribe with-footer'>
                <CloseButton />
                <AccountHeader />
                <h1 className="gh-portal-main-title">Unsubscribe failed</h1>
                <div>
                    <p className="gh-portal-text-center">Email address not found.</p>
                </div>
            </div>
        );
    }

    // Case: Single active newsletter
    if (siteNewsletters?.length === 1 && !showPrefs) {
        return (
            <div className='gh-portal-content gh-portal-unsubscribe with-footer'>
                <CloseButton />
                <AccountHeader />
                <h1 className="gh-portal-main-title">Successfully unsubscribed</h1>
                <div>
                    <p className='gh-portal-text-center'><strong>{member?.email}</strong> will no longer receive this newsletter.</p>
                    <p className='gh-portal-text-center'>Didn't mean to do this? Manage your preferences
                        <button
                            className="gh-portal-btn-link gh-portal-btn-branded gh-portal-btn-inline"
                            onClick={() => {
                                setShowPrefs(true);
                            }}
                        >
                        here
                        </button>.
                    </p>
                </div>
            </div>
        );
    }

    const HeaderNotification = () => {
        const unsubscribedNewsletter = siteNewsletters?.find((d) => {
            return d.uuid === pageData.newsletterUuid;
        });
        const hideClassName = hasInteracted ? 'gh-portal-hide' : '';
        return (
            <>
                <p className={`gh-portal-text-center gh-portal-header-message ${hideClassName}`}><strong>{member?.email}</strong> will no longer receive <strong>{unsubscribedNewsletter?.name}</strong> newsletter.</p>
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
                    message: `Email preference updated.`
                });
                await api.member.updateNewsletters({uuid: pageData.uuid, newsletters: [], enableCommentNotifications: false});
            }}
            isPaidMember={member?.status !== 'free'}
            isCommentsEnabled={commentsEnabled !== 'off'}
            enableCommentNotifications={enableCommentNotifications}
        />
    );
}
