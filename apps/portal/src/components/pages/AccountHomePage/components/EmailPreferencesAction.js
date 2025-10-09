import AppContext from '../../../../AppContext';
import {useContext} from 'react';
import {isEmailSuppressed, hasNewsletterSendingEnabled, hasCommentsEnabled} from '../../../../utils/helpers';
import {ReactComponent as EmailDeliveryFailedIcon} from '../../../../images/icons/email-delivery-failed.svg';
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

    return (
        <section>
            <div className="gh-portal-list-detail">
                <h3>{t('Emails')}</h3>
                {renderEmailNotice()}
            </div>
            <button
                className="gh-portal-btn gh-portal-btn-list"
                onClick={() => {
                    doAction('switchPage', {
                        page,
                        lastPage: 'accountHome'
                    });
                }}
                data-test-button="manage-newsletters"
            >
                {t('Manage')}
            </button>
        </section>
    );
}

export default EmailPreferencesAction;
