import AppContext from 'AppContext';
import {useContext} from 'react';
import {isEmailSuppressed} from 'utils/helpers';
import {ReactComponent as EmailDeliveryFailedIcon} from 'images/icons/email-delivery-failed.svg';

function EmailPreferencesAction() {
    const {onAction, member} = useContext(AppContext);
    const emailSuppressed = isEmailSuppressed({member});
    const page = emailSuppressed ? 'emailSuppressed' : 'accountEmail';

    return (
        <section>
            <div className='gh-portal-list-detail'>
                <h3>Emails</h3>
                {
                    emailSuppressed
                        ? (
                            <p className="gh-portal-email-notice">
                                <EmailDeliveryFailedIcon className="gh-portal-email-notice-icon" />
                                <span>You're <span className="gh-mobile-shortener">currently </span>not receiving emails</span>
                            </p>
                        )
                        : <p>Update your preferences</p>
                }
            </div>
            <button className='gh-portal-btn gh-portal-btn-list' onClick={(e) => {
                onAction('switchPage', {
                    page,
                    lastPage: 'accountHome'
                });
            }}>Manage</button>
        </section>
    );
}

export default EmailPreferencesAction;
