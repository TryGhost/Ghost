import { useContext } from 'react';
import AppContext from '../../app-context';
import ConfettiIcon from '../../images/icons/confetti.svg?react';
import CloseButton from '../common/close-button';
import ActionButton from '../common/action-button';
import { t } from '../../utils/i18n';
import { signupMessageButtonClass } from '../shared-classes';

const SupportSuccess = () => {
  const { doAction, brandColor, site } = useContext(AppContext);
  const successTitle = t('Thank you for your support');
  const successDescription = t(
    'To continue to stay up to date, subscribe to {publication} below.',
    { publication: site?.title },
  );
  const buttonLabel = t('Sign up');

  return (
    <div className="relative scrollbar-none">
      <CloseButton />

      <div className="mb-3 flex flex-col items-center p-0">
        {site.icon ? (
          <img
            className="gh-portal-signup-logo relative mx-0 mt-3 mb-2.5 block size-15 rounded-sm bg-cover bg-center max-sm:size-12"
            src={site.icon}
            alt={site.title}
          />
        ) : (
          <div className="mx-auto mt-6 mb-4 size-12 text-center text-brand [&_svg]:size-12">
            <ConfettiIcon />
          </div>
        )}
        <h1 className="mt-3 text-center text-[32px] leading-[1.1em] text-pretty text-gray-950 [.gh-portal-signup-logo+&]:mt-1">
          {successTitle}
        </h1>
      </div>
      <p className="px-8 pt-4 pb-3 text-center text-pretty">{successDescription}</p>

      <ActionButton
        style={{ width: '100%' }}
        retry={false}
        onClick={() => doAction('switchPage', { page: 'signup' })}
        disabled={false}
        brandColor={brandColor}
        label={buttonLabel}
        isRunning={false}
        tabIndex={3}
      />

      <div className="z-[9999] mx-0 mt-1 mb-0 flex flex-wrap justify-center text-15 text-gray-750 [&_*]:z-[9999]">
        <div>{t('Already a member?')}</div>
        <button
          data-test-button="signin-switch"
          data-testid="signin-switch"
          className={`${signupMessageButtonClass} disabled:cursor-auto disabled:opacity-50!`}
          style={{ color: brandColor }}
          onClick={() => doAction('switchPage', { page: 'signin' })}
        >
          <span className="-mb-0.5 inline-block pb-0.5">{t('Sign in')}</span>
        </button>
      </div>
    </div>
  );
};

export default SupportSuccess;
