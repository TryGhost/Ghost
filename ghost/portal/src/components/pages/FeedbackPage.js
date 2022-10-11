import ActionButton from '../common/ActionButton';
import AppContext from '../../AppContext';
import {useContext, useEffect, useState} from 'react';
import setupGhostApi from '../../utils/api';
import CloseButton from '../common/CloseButton';
import LoadingPage from './LoadingPage';
import {HumanReadableError} from '../../utils/errors';
import {ReactComponent as ThumbUpIcon} from '../../images/icons/thumbs-up.svg';
import {ReactComponent as ThumbDownIcon} from '../../images/icons/thumbs-down.svg';

const React = require('react');

export const FeedbackPageStyles = `
    .gh-portal-feedback {

    }

    .gh-portal-feedback .gh-feedback-icon {
        padding: 10px 0;
        text-align: center;
        color: var(--brandcolor);
    }

    .gh-portal-feedback .gh-portal-text-center {
        padding: 15px 0;
    }
`;

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

function ErrorPage({error}) {
    return (
        <div className='gh-portal-content gh-portal-feedback with-footer'>
            <CloseButton />
            <AccountHeader />
            <h1 className="gh-portal-main-title">Saving failed.</h1>
            <div>
                <p className="gh-portal-text-center">{error}</p>
            </div>
        </div>
    );
}

export default function FeedbackPage() {
    const {site, pageData, brandColor, onAction} = useContext(AppContext);
    const {uuid, postId, score} = pageData;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const ghostApi = setupGhostApi({siteUrl: site.url});
        (async () => {
            await ghostApi.feedback.add({uuid, postId, score});

            // Clear query params once finished
            setLoading(false);
        })().catch((e) => {
            const text = HumanReadableError.getMessageFromError(e, 'There was a problem submitting your feedback');
            setError(text);
        });
    }, [uuid, postId, score, site.url]);
    
    // Case: failed
    if (error) {
        return <ErrorPage error={error} />;
    }

    // Case: still loading
    if (loading) {
        return <LoadingPage />;
    }

    const positive = score === 1;
    const icon = positive ? <ThumbUpIcon /> : <ThumbDownIcon />;
    const text = positive ? 'It has been noted that you want to see more posts like this.' : 'It has been noted that you want to see less posts like this.';

    return (
        <div className='gh-portal-content gh-portal-feedback'>
            <CloseButton />
        
            <div class="gh-feedback-icon">
                {icon}
            </div>
            <h1 className="gh-portal-main-title">Thanks for the feedback!</h1>
            <p className="gh-portal-text-center">{text}</p>
            <ActionButton
                style={{width: '100%'}}
                retry={false}
                onClick = {() => onAction('closePopup')}
                disabled={false}
                brandColor={brandColor}
                label={'Close'}
                isRunning={false}
                tabindex='3'
                classes={'sticky bottom'}
            />
        </div>
    );
}
