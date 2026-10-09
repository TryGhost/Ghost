import AppContext from '../../../../app-context';
import { useContext } from 'react';
import {
  isEmailSuppressed,
  hasNewsletterSendingEnabled,
  hasCommentsEnabled,
} from '../../../../utils/helpers';
import EmailDeliveryFailedIcon from '../../../../images/icons/email-delivery-failed.svg?react';
import { t } from '../../../../utils/i18n';
import { accountActionButtonClass, accountActionClass } from '../../../shared-classes';

function DisabledEmailNotice() {
  return (
    <p className="gh-portal-email-notice flex items-center gap-[5px]">
      <EmailDeliveryFailedIcon className="size-5" />
      <span className="sm:hidden">{t("You're not receiving emails")}</span>
      <span className="max-sm:hidden">{t("You're currently not receiving emails")}</span>
    </p>
  );
}

function EmailPreferencesAction() {
  const { doAction, member, site } = useContext(AppContext);

  const emailSuppressed = isEmailSuppressed({ member });
  const hasNewslettersEnabled = hasNewsletterSendingEnabled({ site });
  const commentsEnabled = hasCommentsEnabled({ site });
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
      lastPage: 'accountHome',
    });
  };

  return (
    <section
      className={accountActionClass}
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
      <div className="grow [&_.gh-portal-email-notice]:mt-1.5 [&_.gh-portal-email-notice]:text-12.5 [&_.gh-portal-email-notice]:font-medium [&_.gh-portal-email-notice]:tracking-[0.2px] [&_.gh-portal-email-notice]:text-red rtl:[&_.gh-portal-email-notice]:mt-[5px] [&_h3]:text-15 [&_h3]:font-semibold [&_p]:ms-0 [&_p]:me-2 [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:text-14.5 [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:[word-break:break-word] [&_p]:text-gray-700">
        <h3>{t('Emails')}</h3>
        {renderEmailNotice()}
      </div>
      <span
        className={accountActionButtonClass}
        data-test-button="manage-newsletters"
        aria-hidden="true"
      >
        {t('Manage')}
      </span>
    </section>
  );
}

export default EmailPreferencesAction;
