import AppContext from '../../AppContext';

import {useContext, useEffect, useState} from 'react';
import {getSiteNewsletters} from '../../utils/helpers';
import setupGhostApi from '../../utils/api';
import NewsletterManagement from '../common/NewsletterManagement';
import CloseButton from '../common/CloseButton';

const React = require('react');

// function AccountHeader() {
//     return (
//         <header className='gh-portal-detail-header'>
//             <h3 className='gh-portal-main-title'>Publication title</h3>
//         </header>
//     );
// }

export default function UnsubscribePage() {
    const {site, pageData, onAction} = useContext(AppContext);
    const api = setupGhostApi({siteUrl: site.url});
    const [member, setMember] = useState();
    const siteNewsletters = getSiteNewsletters({site});
    const siteTitle = site.title || '';
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
                <CloseButton />
                {/* <AccountHeader /> */}
                {/* The header below should be in AccountHeader */}
                <header className='gh-portal-signup-header'>
                    <img className='gh-portal-signup-logo' src="https://static.ghost.org/v4.0.0/images/ghost-orb-1.png" alt="fdfkld" />
                    <h1 className="gh-portal-main-title">{siteTitle}</h1>
                </header>
                <h4 className="gh-portal-text-center gh-portal-text-large" style={{marginBottom: '8px', fontSize: '2rem'}}>Unsubscribe failed</h4>
                <div className='gh-portal-section'>
                    <p className="gh-portal-text-center">Email address not found.</p>
                </div>
            </div>
        );
    }

    // Case: Single active newsletter
    if (siteNewsletters?.length === 1) {
        return (
            <div className='gh-portal-content with-footer'>
                <CloseButton />
                {/* <AccountHeader /> */}
                <header className='gh-portal-signup-header'>
                    <img className='gh-portal-signup-logo' src="https://static.ghost.org/v4.0.0/images/ghost-orb-1.png" alt="fdfkld" />
                    <h1 className="gh-portal-main-title">{siteTitle}</h1>
                </header>
                <h4 className="gh-portal-text-center gh-portal-text-large" style={{marginBottom: '8px', fontSize: '2rem'}}>Successfully unsubscribed</h4>
                <div className='gh-portal-section'>
                    <p className='gh-portal-text-center'><strong>{member?.email}</strong> will no longer receive this newsletter.</p>
                    <div style={{display: 'flex', justifyContent: 'center'}}>
                        <p className='gh-portal-text-center' style={{marginBottom: '0px'}}>Didn't mean to do this? Manage your account </p>
                        <button className="gh-portal-btn gh-portal-btn-link">here.</button>
                    </div>
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
