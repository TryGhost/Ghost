import AppContext from '../../../../app-context';
import { useContext } from 'react';
import {
  hasCommentsEnabled,
  hasMultipleNewsletters,
  isEmailSuppressed,
  hasNewsletterSendingEnabled,
  hasCustomFieldsEnabled,
} from '../../../../utils/helpers';

import PaidAccountActions from './paid-account-actions';
import GiveGiftCard from './give-gift-card';
import TransistorPodcastsAction from './transistor-podcasts-action';
import EmailNewsletterAction from './email-newsletter-action';
import EmailPreferencesAction from './email-preferences-action';
import useIntegrations from './use-integrations';
import { t } from '../../../../utils/i18n';
import {
  accountActionButtonClass,
  accountActionClass,
  accountActionTextClass,
} from '../../../shared-classes';

const shouldShowEmailPreferences = (site, member) => {
  return (
    (hasMultipleNewsletters({ site }) && hasNewsletterSendingEnabled({ site })) ||
    hasCommentsEnabled({ site }) ||
    isEmailSuppressed({ member })
  );
};

const shouldShowEmailNewsletterAction = (site) => {
  return (
    !hasMultipleNewsletters({ site }) &&
    hasNewsletterSendingEnabled({ site }) &&
    !hasCommentsEnabled({ site })
  );
};

const AccountActions = () => {
  const { member, doAction, site } = useContext(AppContext);
  const { name, email } = member;
  const { transistor } = useIntegrations();

  const openEditProfile = () => {
    doAction('switchPage', {
      page: 'accountProfile',
      lastPage: 'accountHome',
    });
  };

  const showEmailPreferences = shouldShowEmailPreferences(site, member);
  const showEmailNewsletterAction = shouldShowEmailNewsletterAction(site);

  return (
    <div>
      <div className="gh-portal-list overflow-hidden rounded-lg border border-solid border-gray-150 bg-white p-0 [&_section]:m-0 [&_section]:flex [&_section]:items-center [&_section]:p-5 [&_section]:[border-bottom:1px_solid_var(--color-gray-150)] [&_section:first-of-type]:rounded-t-lg [&_section:last-of-type]:rounded-b-lg [&_section:last-of-type]:border-none">
        <section
          className={accountActionClass}
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
          <div className={accountActionTextClass}>
            {/* With custom fields, the row is about more than the name, so it is named
                for what it opens rather than for the member. */}
            <h3>{name && !hasCustomFieldsEnabled({ site }) ? name : t('Account')}</h3>
            <p>{email}</p>
          </div>
          <span
            data-test-button="edit-profile"
            className={accountActionButtonClass}
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

      <GiveGiftCard />
    </div>
  );
};

export default AccountActions;
