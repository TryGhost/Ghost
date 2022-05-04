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

export default function UnsubscribePage() {
    const {site, pageData, onAction} = useContext(AppContext);
    const api = setupGhostApi({siteUrl: site.url});
    const [member, setMember] = useState();
    const siteNewsletters = getSiteNewsletters({site});
    const defaultNewsletters = siteNewsletters.filter((d) => {
        return d.subscribe_on_signup;
    });
    const [subscribedNewsletters, setSubscribedNewsletters] = useState(defaultNewsletters);
    const [showPrefs, setShowPrefs] = useState(false);

    useEffect(() => {
        const ghostApi = setupGhostApi({siteUrl: site.url});
        (async () => {
            const memberData = await ghostApi.member.newsletters({uuid: pageData.uuid});

            setMember(memberData);
            setSubscribedNewsletters(memberData?.newsletters || []);
            if (siteNewsletters?.length === 1) {
                try {
                    await ghostApi.member.updateNewsletters({uuid: pageData.uuid, newsletters: []});
                } catch (e) {
                    // ignore auto unsubscribe error
                }
            }
        })();
    }, [pageData.uuid, site.url, siteNewsletters?.length]);

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
                    <p className='gh-portal-text-center'><strong>{member?.email}</strong> will no longer receive this newsletter. Didn't mean to do this? Manage your preferences
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
    return (
        <NewsletterManagement
            subscribedNewsletters={subscribedNewsletters}
            updateSubscribedNewsletters={async (newsletters) => {
                setSubscribedNewsletters(newsletters);
                await api.member.updateNewsletters({uuid: pageData.uuid, newsletters});
            }}
            unsubscribeAll={async () => {
                setSubscribedNewsletters([]);
                onAction('showPopupNotification', {
                    action: 'updated:success',
                    message: `Newsletter preference updated.`
                });
                await api.member.updateNewsletters({uuid: pageData.uuid, newsletters: []});
            }}
            isPaidMember={member?.status !== 'free'}
        />
    );
}
