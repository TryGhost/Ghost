import AppContext from 'AppContext';
import {useContext, useEffect} from 'react';
import CloseButton from 'components/common/CloseButton';
import BackButton from 'components/common/BackButton';
import ActionButton from 'components/common/ActionButton';
import {ReactComponent as EmailDeliveryFailedIcon} from 'images/icons/email-delivery-failed.svg';

export default function EmailSuppressedPage() {
    const {brandColor, lastPage, onAction, action} = useContext(AppContext);

    useEffect(() => {
        if (['removeEmailFromSuppressionList:success'].includes(action)) {
            onAction('refreshMemberData');
        }

        if (['removeEmailFromSuppressionList:failed', 'refreshMemberData:success', 'refreshMemberData:failed'].includes(action)) {
            onAction('back');
        }
    }, [action, onAction]);

    const isRunning = ['removeEmailFromSuppressionList:running', 'refreshMemberData:running'].includes(action);

    const handleSubmit = () => {
        onAction('removeEmailFromSuppressionList');
    };

    return (
        <div className="gh-email-suppressed-page">
            <header className='gh-portal-detail-header'>
                <BackButton brandColor={brandColor} hidden={!lastPage} onClick={() => {
                    onAction('back');
                }} />
                <CloseButton />
            </header>

            <EmailDeliveryFailedIcon className="gh-email-suppressed-page-icon" />

            <div className="gh-email-suppressed-page-text">
                <h3 className="gh-portal-main-title gh-email-suppressed-page-title">Email disabled</h3>

                <p>
                    All newsletters have been disabled on your account. <br/> This can happen due to a spam complaint or
                    permanent failure (bounce).
                </p>

                <button
                    className="gh-portal-btn-text gh-email-faq-page-button"
                    onClick={() => onAction('switchPage', {page: 'emailSuppressionFAQ', lastPage: 'emailSuppressed'})}
                >
                    Learn more about why this happens
                </button>
            </div>

            <ActionButton
                classes="gh-portal-confirm-button"
                onClick={handleSubmit}
                disabled={isRunning}
                brandColor={brandColor}
                label="Resubscribe your email"
                isRunning={isRunning}
            />
        </div>
    );
}
