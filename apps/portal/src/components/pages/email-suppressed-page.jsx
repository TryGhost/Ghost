import AppContext from '../../app-context';
import { useContext, useEffect } from 'react';
import { hasCommentsEnabled, hasMultipleNewsletters } from '../../utils/helpers';
import CloseButton from '../common/close-button';
import BackButton from '../common/back-button';
import ActionButton from '../common/action-button';
import EmailDeliveryFailedIcon from '../../images/icons/email-delivery-failed.svg?react';
import { t } from '../../utils/i18n';

export default function EmailSuppressedPage() {
  const { brandColor, lastPage, doAction, action, site } = useContext(AppContext);

  useEffect(() => {
    if (['removeEmailFromSuppressionList:success'].includes(action)) {
      doAction('refreshMemberData');
    }

    if (['removeEmailFromSuppressionList:failed', 'refreshMemberData:failed'].includes(action)) {
      doAction('back');
    }

    if (['refreshMemberData:success'].includes(action)) {
      const showEmailPreferences = hasMultipleNewsletters({ site }) || hasCommentsEnabled({ site });
      if (showEmailPreferences) {
        doAction('switchPage', {
          page: 'accountEmail',
          lastPage: 'accountHome',
        });
        doAction('showPopupNotification', {
          message: t('You have been successfully resubscribed'),
        });
      } else {
        doAction('back');
      }
    }
  }, [action, doAction, site, t]);

  const isRunning = [
    'removeEmailFromSuppressionList:running',
    'refreshMemberData:running',
  ].includes(action);

  const handleSubmit = () => {
    doAction('removeEmailFromSuppressionList');
  };

  return (
    <div className="gh-email-suppressed-page">
      <header className="gh-portal-detail-header relative mx-0 mb-10 mt-[-2px] flex items-center justify-center px-[60px] max-sm:mt-1">
        <BackButton
          brandColor={brandColor}
          hidden={!lastPage}
          onClick={() => {
            doAction('back');
          }}
        />
        <CloseButton />
      </header>

      <EmailDeliveryFailedIcon className="gh-email-suppressed-page-icon mx-auto mb-[18px] mt-0 block size-[38px]" />

      <div className="gh-email-suppressed-page-text px-[14px] py-0 text-center text-gray-700">
        <h3 className="gh-portal-main-title gh-email-suppressed-page-title mb-[14px] text-pretty text-center leading-[1.1em] text-black">
          {t('Emails disabled')}
        </h3>
        <p>
          {t(
            "You're not receiving emails because you either marked a recent message as spam, or because messages could not be delivered to your provided email address.",
          )}
        </p>
      </div>

      <ActionButton
        dataTestId={'resubscribe-email'}
        classes="gh-portal-confirm-button mt-[3.6rem] w-full max-sm:mt-7"
        onClick={handleSubmit}
        disabled={isRunning}
        brandColor={brandColor}
        label={t('Re-enable emails')}
        isRunning={isRunning}
      />
    </div>
  );
}
