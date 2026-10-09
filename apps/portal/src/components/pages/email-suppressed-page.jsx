import AppContext from '../../app-context';
import { useContext, useEffect } from 'react';
import { hasCommentsEnabled, hasMultipleNewsletters } from '../../utils/helpers';
import CloseButton from '../common/close-button';
import BackButton from '../common/back-button';
import ActionButton from '../common/action-button';
import EmailDeliveryFailedIcon from '../../images/icons/email-delivery-failed.svg?react';
import { t } from '../../utils/i18n';
import { popupHeaderClass } from '../shared-classes';

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
    <div>
      <header className={popupHeaderClass}>
        <BackButton
          brandColor={brandColor}
          hidden={!lastPage}
          onClick={() => {
            doAction('back');
          }}
        />
        <CloseButton />
      </header>

      <EmailDeliveryFailedIcon className="mx-auto mt-0 mb-4.5 block size-9.5" />

      <div className="px-3.5 py-0 text-center text-gray-600">
        <h3 className="mb-3.5 text-center leading-[1.1em] text-pretty text-gray-950">
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
        classes="mt-[3.6rem] w-full max-sm:mt-7"
        onClick={handleSubmit}
        disabled={isRunning}
        brandColor={brandColor}
        label={t('Re-enable emails')}
        isRunning={isRunning}
      />
    </div>
  );
}
