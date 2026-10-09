import { useContext } from 'react';
import AppContext from '../../app-context';
import ConfettiIcon from '../../images/icons/confetti.svg?react';
import CloseButton from '../common/close-button';
import ActionButton from '../common/action-button';
import { t } from '../../utils/i18n';

const SupportSuccess = () => {
  const { doAction, brandColor, site } = useContext(AppContext);
  const successTitle = t('Thank you for your support');
  const successDescription = t(
    'To continue to stay up to date, subscribe to {publication} below.',
    { publication: site?.title },
  );
  const buttonLabel = t('Sign up');

  return (
    <div className="gh-portal-content gh-portal-tips-and-donations relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <CloseButton />

      <div className="gh-portal-signup-header mb-3 flex flex-col items-center p-0">
        {site.icon ? (
          <img
            className="gh-portal-signup-logo relative mx-0 mt-3 mb-2.5 block size-[60px] rounded-sm bg-cover bg-center max-sm:size-12"
            src={site.icon}
            alt={site.title}
          />
        ) : (
          <div className="gh-tips-and-donations-icon-success mx-auto mt-6 mb-4 size-12 text-center text-brand [&_svg]:size-12">
            <ConfettiIcon />
          </div>
        )}
        <h1 className="gh-portal-main-title mt-3 text-center text-[32px] leading-[1.1em] text-pretty text-black [.gh-portal-signup-logo+&]:mt-1">
          {successTitle}
        </h1>
      </div>
      <p className="gh-portal-text-center px-8 pt-4 pb-3 text-center text-pretty">
        {successDescription}
      </p>

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

      <div className="gh-portal-signup-message z-[9999] mx-0 mt-1 mb-0 flex flex-wrap justify-center text-15 text-gray-900 [&_*]:z-[9999]">
        <div>{t('Already a member?')}</div>
        <button
          data-test-button="signin-switch"
          data-testid="signin-switch"
          className="gh-portal-btn gh-portal-btn-link relative ms-1! -mb-px flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-0 text-center text-14 leading-none font-semibold tracking-[0.2px] whitespace-nowrap text-black no-underline outline-none select-none transition-control hover:border-gray-300 hover:opacity-85 disabled:cursor-auto disabled:opacity-50!"
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
