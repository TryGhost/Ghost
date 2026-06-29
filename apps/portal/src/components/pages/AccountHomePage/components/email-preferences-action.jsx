import AppContext from '../../../../app-context';
import {useContext} from 'react';
import {isEmailSuppressed, hasNewsletterSendingEnabled, hasCommentsEnabled} from '../../../../utils/helpers';
import EmailDeliveryFailedIcon from '../../../../images/icons/email-delivery-failed.svg?react';
import {t} from '../../../../utils/i18n';

function DisabledEmailNotice() {
    return (
        <p className="gh-portal-email-notice">
            <EmailDeliveryFailedIcon className="gh-portal-email-notice-icon" />
            <span className="gh-mobile-only">{t('You\'re not receiving emails')}</span>
            <span className="gh-desktop-only">{t('You\'re currently not receiving emails')}</span>
        </p>
    );
}

function EmailPreferencesAction() {
    const {doAction, member, site} = useContext(AppContext);

    const emailSuppressed = isEmailSuppressed({member});
    const hasNewslettersEnabled = hasNewsletterSendingEnabled({site});
    const commentsEnabled = hasCommentsEnabled({site});
    const page = emailSuppressed ? 'emailSuppressed' : 'accountEmail';

    const hasNewslettersAndCommentsDisabled = !hasNewslettersEnabled && !commentsEnabled;

    const renderEmailNotice = () => {
        if (emailSuppressed || hasNewslettersAndCommentsDisabled) {
            return <DisabledEmailNotice />;
        }
        return <p>{t('Update your preferences')}</p>;
    };

    const handleClick = () => {
        doAction('switchPage', {
            page,
            lastPage: 'accountHome'
        });
    };

    return (
        <section
            className="gh-portal-list-clickable"
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.target !== e.currentTarget) {
                    return;
                }
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
        >
            <div className="gh-portal-list-detail">
                <h3>{t('Emails')}</h3>
                {renderEmailNotice()}
            </div>
            <span
                className="gh-portal-list-action"
                data-test-button="manage-newsletters"
                aria-hidden="true"
            >
                {t('Manage')}
            </span>
        </section>
    );
}

export default EmailPreferencesAction;
