import AppContext from '../../../../AppContext';
import {useContext} from 'react';
import {hasCommentsEnabled, hasMultipleNewsletters, isEmailSuppressed, hasNewsletterSendingEnabled} from '../../../../utils/helpers';

import PaidAccountActions from './PaidAccountActions';
import EmailNewsletterAction from './EmailNewsletterAction';
import EmailPreferencesAction from './EmailPreferencesAction';
import {t} from '../../../../utils/i18n';

const shouldShowEmailPreferences = (site, member) => {
    return (
        hasMultipleNewsletters({site}) && hasNewsletterSendingEnabled({site}) ||
    hasCommentsEnabled({site}) ||
    isEmailSuppressed({member})
    );
};

const shouldShowEmailNewsletterAction = (site) => {
    return (
        !hasMultipleNewsletters({site}) &&
    hasNewsletterSendingEnabled({site}) &&
    !hasCommentsEnabled({site})
    );
};

const AccountActions = () => {
    const {member, doAction, site} = useContext(AppContext);
    const {name, email} = member;

    const openEditProfile = () => {
        doAction('switchPage', {
            page: 'accountProfile',
            lastPage: 'accountHome'
        });
    };

    // Extract helper functions for complex conditions

    const showEmailPreferences = shouldShowEmailPreferences(site, member);
    const showEmailNewsletterAction = shouldShowEmailNewsletterAction(site);

    return (
        <div>
            <div className='gh-portal-list'>
                <section>
                    <div className='gh-portal-list-detail'>
                        <h3>{(name ? name : t('Account'))}</h3>
                        <p>{email}</p>
                    </div>
                    <button
                        data-test-button='edit-profile'
                        className='gh-portal-btn gh-portal-btn-list'
                        onClick={e => openEditProfile(e)}
                    >
                        {t('Edit')}
                    </button>
                </section>

                <PaidAccountActions />
                {showEmailPreferences && <EmailPreferencesAction />}
                {showEmailNewsletterAction && <EmailNewsletterAction />}
            </div>

        </div>
    );
};

export default AccountActions;
