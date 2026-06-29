import AppContext from '../../../../app-context';
import {useContext} from 'react';
import {hasCommentsEnabled, hasMultipleNewsletters, isEmailSuppressed, hasNewsletterSendingEnabled} from '../../../../utils/helpers';

import PaidAccountActions from './paid-account-actions';
import TransistorPodcastsAction from './transistor-podcasts-action';
import EmailNewsletterAction from './email-newsletter-action';
import EmailPreferencesAction from './email-preferences-action';
import useIntegrations from './use-integrations';
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
    const {transistor} = useIntegrations();

    const openEditProfile = () => {
        doAction('switchPage', {
            page: 'accountProfile',
            lastPage: 'accountHome'
        });
    };

    const showEmailPreferences = shouldShowEmailPreferences(site, member);
    const showEmailNewsletterAction = shouldShowEmailNewsletterAction(site);

    return (
        <div>
            <div className='gh-portal-list'>
                <section
                    className='gh-portal-list-clickable'
                    role="button"
                    tabIndex={0}
                    onClick={openEditProfile}
                    onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) {
                            return;
                        }
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openEditProfile();
                        }
                    }}
                >
                    <div className='gh-portal-list-detail'>
                        <h3>{(name ? name : t('Account'))}</h3>
                        <p>{email}</p>
                    </div>
                    <span
                        data-test-button='edit-profile'
                        className='gh-portal-list-action'
                        aria-hidden="true"
                    >
                        {t('Edit')}
                    </span>
                </section>

                <PaidAccountActions />
                {showEmailPreferences && <EmailPreferencesAction />}
                {showEmailNewsletterAction && <EmailNewsletterAction />}
                {transistor.enabled && (
                    <TransistorPodcastsAction
                        hasPodcasts={transistor.hasPodcasts}
                        memberUuid={transistor.memberUuid}
                        settings={transistor.settings}
                    />
                )}
            </div>

        </div>
    );
};

export default AccountActions;
