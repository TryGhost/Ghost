import { useContext } from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import ActionButton from '../common/action-button';
import WarningIcon from '../../images/icons/warning-outline.svg?react';
import * as Sentry from '@sentry/react';
import { t } from '../../utils/i18n';

const SupportError = ({ error }) => {
  const { doAction } = useContext(AppContext);
  const errorTitle = t('Sorry, that didn’t work.');
  const errorMessage = error || t('There was an error processing your payment. Please try again.');
  const buttonLabel = t('Close');

  if (error) {
    // Log error to Sentry
    Sentry.captureException(error);
  }

  return (
    <div className="relative scrollbar-none">
      <CloseButton />

      <div className="mx-auto my-0 w-12 px-0 py-2.5 text-center text-[#f50b23]">
        <WarningIcon />
      </div>
      <h1 className="text-center text-[32px] leading-[1.1em] text-pretty text-gray-950">
        {errorTitle}
      </h1>
      <p className="px-8 pt-4 pb-3 text-center text-pretty">{errorMessage}</p>
      <ActionButton
        style={{ width: '100%' }}
        retry={true}
        onClick={() => doAction('closePopup')}
        disabled={false}
        brandColor="#000000"
        label={buttonLabel}
        isDestructive={true}
        isRunning={false}
        tabIndex={3}
      />
    </div>
  );
};

export default SupportError;
