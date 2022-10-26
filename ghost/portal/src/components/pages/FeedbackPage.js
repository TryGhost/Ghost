import {useContext, useEffect, useState} from 'react';
import AppContext from '../../AppContext';
import {ReactComponent as ThumbDownIcon} from '../../images/icons/thumbs-down.svg';
import {ReactComponent as ThumbUpIcon} from '../../images/icons/thumbs-up.svg';
import {ReactComponent as WarningIcon} from '../../images/icons/warning-fill.svg';
import setupGhostApi from '../../utils/api';
import {HumanReadableError} from '../../utils/errors';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import LoadingPage from './LoadingPage';

const React = require('react');

export const FeedbackPageStyles = `
    .gh-portal-feedback {

    }

    .gh-portal-feedback .gh-feedback-icon {
        padding: 10px 0;
        text-align: center;
        color: var(--brandcolor);
        width: 48px;
        margin: 0 auto;
    }

    .gh-portal-feedback .gh-feedback-icon.gh-feedback-icon-error {
        color: #f50b23;
    }

    .gh-portal-feedback .gh-portal-text-center {
        padding: 15px 0;
    }

    .gh-portal-confirm-title {
        line-height: inherit;
        text-align: left;
        box-sizing: border-box;
        margin: 0;
        margin-bottom: .4rem;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -.018em;
    }

    .gh-portal-confirm-description {
        font-size: 1.5rem;
        text-align: left;
        box-sizing: border-box;
        margin: 0;
        line-height: 2.25rem;
        padding-right: 1.6rem;
        padding-left: 0;
        color: rgb(115, 115, 115);
    }

    .gh-portal-confirm-buttons {
        line-height: inherit;
        font-size: 1.5rem;
        text-align: left;
        box-sizing: border-box;
        margin-top: 4rem;
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 1.6rem;
        flex-direction: row;
    }

    .gh-portal-confirm-button-secundary {
        -webkit-text-size-adjust: 100%;
        tab-size: 4;
        box-sizing: border-box;
        border: 0 solid #e5e7eb;
        line-height: inherit;
        margin: 0;
        padding: 0;
        text-transform: none;
        cursor: pointer;
        -webkit-appearance: button;
        background-color: initial;
        background-image: none;
        font-size: 1.4rem;
        font-weight: 500;
        color: rgb(115, 115, 115);
        border: 0;
    }
`;

function ErrorPage({error}) {
    const {onAction} = useContext(AppContext);

    return (
        <div className='gh-portal-content gh-portal-feedback with-footer'>
            <CloseButton />
            <div class="gh-feedback-icon gh-feedback-icon-error">
                <WarningIcon />
            </div>
            <h1 className="gh-portal-main-title">It's not you, it's us</h1>
            <div>
                <p className="gh-portal-text-center">{error}</p>
            </div>
            <ActionButton
                style={{width: '100%'}}
                retry={false}
                onClick = {() => onAction('closePopup')}
                disabled={false}
                brandColor='#000000'
                label={'Close'}
                isRunning={false}
                tabindex='3'
                classes={'sticky bottom'}
            />
        </div>
    );
}

const ConfirmDialog = ({onConfirm, loading, positive}) => {
    const {onAction, brandColor} = useContext(AppContext);

    const stopPropagation = (event) => {
        event.stopPropagation();
    };

    const close = (event) => {
        onAction('closePopup');
    };

    const submit = async (event) => {
        event.stopPropagation();

        await onConfirm();
    };

    const title = positive ? 'You want more posts like this?' : 'You want less posts like this?';

    return (
        <div className="gh-portal-confirm-dialog" onMouseDown={stopPropagation}>
            <h1 className="gh-portal-confirm-title">{title}</h1>
            <p className="gh-portal-confirm-description">Your feedback will be sent to the owner of this site.</p>
            <div className="gh-portal-confirm-buttons">
                <ActionButton
                    retry={false}
                    onClick = {submit}
                    disabled={false}
                    brandColor={brandColor}
                    label={'Yes!'}
                    isRunning={loading}
                    tabindex='3'
                    classes={'sticky bottom'}
                />

                <button type="button" onClick={close} className="gh-portal-confirm-button-secundary">Cancel</button>
            </div>
            <CloseButton close={() => close(false)} />
        </div>
    );
};

async function sendFeedback({siteUrl, uuid, postId, score}) {
    const ghostApi = setupGhostApi({siteUrl});
    await ghostApi.feedback.add({uuid, postId, score});
}

const LoadingFeedbackView = ({action}) => {
    useEffect(() => {
        action();
    });
    
    return <LoadingPage/>;
};

const ConfirmFeedback = ({positive}) => {
    const {onAction, brandColor} = useContext(AppContext);

    const icon = positive ? <ThumbUpIcon /> : <ThumbDownIcon />;

    return (
        <div className='gh-portal-content gh-portal-feedback'>
            <CloseButton />
        
            <div class="gh-feedback-icon">
                {icon}
            </div>
            <h1 className="gh-portal-main-title">Thanks for the feedback!</h1>
            <p className="gh-portal-text-center">Your input helps shape what gets published.</p>
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
};

export default function FeedbackPage() {
    const {site, pageData, member} = useContext(AppContext);
    const {uuid, postId, score} = pageData;
    const positive = score === 1;

    const isLoggedIn = !!member;

    const [confirmed, setConfirmed] = useState(isLoggedIn);
    const [loading, setLoading] = useState(isLoggedIn);
    const [error, setError] = useState(null);

    const doSendFeedback = async () => {
        setLoading(true);
        try {
            await sendFeedback({siteUrl: site.url, uuid, postId, score});
        } catch (e) {
            const text = HumanReadableError.getMessageFromError(e, 'There was a problem submitting your feedback. Please try again or contact the site owner.');
            setError(text);
        }
        setLoading(false);
    };
    
    const onConfirm = async (event) => {
        await doSendFeedback();
        setConfirmed(true);
    };

    // Case: failed
    if (error) {
        return <ErrorPage error={error} />;
    }

    if (!confirmed) {
        return (<ConfirmDialog onConfirm={onConfirm} loading={loading} positive={positive} />);
    } else {
        if (loading) {
            return <LoadingFeedbackView action={doSendFeedback} />;
        }
    }

    return (<ConfirmFeedback positive={positive} />);
}
