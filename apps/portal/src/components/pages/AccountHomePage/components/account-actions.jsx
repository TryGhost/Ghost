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
      <div className="gh-portal-list overflow-hidden rounded-lg border border-solid border-gray-200 bg-white p-0 [&_section]:m-0 [&_section]:flex [&_section]:items-center [&_section]:p-5 [&_section]:[border-bottom:1px_solid_var(--color-gray-200)] [&_section:first-of-type]:rounded-t-lg [&_section:last-of-type]:rounded-b-lg [&_section:last-of-type]:border-none">
        <section
          className="gh-portal-list-clickable cursor-pointer focus-visible:shadow-focus-brand focus-visible:outline-none"
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
          <div className="gh-portal-list-detail grow [&_h3]:text-15 [&_h3]:font-semibold [&_p]:ms-0 [&_p]:me-2 [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:text-14.5 [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:[word-break:break-word] [&_p]:text-gray-700">
            {/* With custom fields, the row is about more than the name, so it is named
                for what it opens rather than for the member. */}
            <h3>{name && !hasCustomFieldsEnabled({ site }) ? name : t('Account')}</h3>
            <p>{email}</p>
          </div>
          <span
            data-test-button="edit-profile"
            className="gh-portal-list-action -mx-1 my-0 flex min-h-[38px] items-center justify-center px-1 py-0 text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-brand select-none"
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
