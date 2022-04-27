import AppContext from '../../AppContext';

import {useContext, useEffect, useState} from 'react';
import {getSiteNewsletters} from '../../utils/helpers';
import setupGhostApi from '../../utils/api';
import NewsletterManagement from '../common/NewsletterManagement';

const React = require('react');

function AccountHeader() {
    return (
        <header className='gh-portal-detail-header'>
            <h3 className='gh-portal-main-title'>Email preferences</h3>
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

    useEffect(() => {
        const ghostApi = setupGhostApi({siteUrl: site.url});
        (async () => {
            const memberData = await ghostApi.member.newsletters({uuid: pageData.uuid});

            setMember(memberData);
            setSubscribedNewsletters(memberData?.newsletters || []);
        })();
    }, [pageData.uuid, site.url]);

    // Case: Email not found
    if (member === null) {
        return (
            <div className='gh-portal-content with-footer'>
                <AccountHeader />
                <p className="gh-portal-text-center">
                    <h4>Unsubscribe Failed</h4>
                </p>
                <div className='gh-portal-section'>
                    <p>Email address not found.</p>
                </div>
            </div>
        );
    }

    // Case: Single active newsletter
    if (siteNewsletters?.length === 1) {
        return (
            <div className='gh-portal-content with-footer'>
                <AccountHeader />
                <p className="gh-portal-text-center">
                    <h4>Successfully unsubscribed</h4>
                </p>
                <div className='gh-portal-section'>
                    <p><strong>{member?.email}</strong> will no longer receive this newsletter.</p>
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
