import AppContext from '../../app-context';
import { useContext } from 'react';
import BackButton from '../common/back-button';
import CloseButton from '../common/close-button';
import { getSupportAddress } from '../../utils/helpers';
import { t } from '../../utils/i18n';

export default function EmailSuppressedPage() {
  const { brandColor, doAction, site, pageData } = useContext(AppContext);

  const supportAddress = `mailto:${getSupportAddress({ site })}`;
  const directAccess = (pageData && pageData.direct) || false;

  return (
    <div className="gh-email-suppression-faq">
      {!directAccess && (
        <header className="gh-portal-detail-header relative mx-0 mb-10 mt-[-2px] flex items-center justify-center px-[60px] max-sm:mt-1">
          <BackButton
            brandColor={brandColor}
            onClick={() => {
              doAction('switchPage', { page: 'emailSuppressed', lastPage: 'accountHome' });
            }}
          />
          <CloseButton />
        </header>
      )}

      <div className="gh-longform px-[6vmin] pb-[6vmin] pt-14 max-sm:px-7 max-sm:py-[10vmin] [&_a]:font-medium [&_a]:text-brand [&_h3]:mb-[0.25em] [&_h3]:mt-0 [&_h3]:text-balance [&_h3]:text-[27px] [&_h4]:mb-[0.4em] [&_h4]:mt-[1.85em] [&_h4]:text-[17.5px] [&_p:last-of-type]:mb-[0.2em] [&_p]:mb-[1.2em] [&_p]:text-gray-900 [&_strong]:text-gray-950">
        <h3>{t('Why has my email been disabled?')}</h3>
        <p>
          {t(
            'Newsletters can be disabled on your account for two reasons: A previous email was marked as spam, or attempting to send an email resulted in a permanent failure (bounce).',
          )}
        </p>
        <h4>{t('Spam complaints')}</h4>
        <p>
          {t(
            'If a newsletter is flagged as spam, emails are automatically disabled for that address to make sure you no longer receive any unwanted messages.',
          )}
        </p>
        <p>
          {t(
            'If the spam complaint was accidental, or you would like to begin receiving emails again, you can resubscribe to emails by clicking the button on the previous screen.',
          )}
        </p>
        <p>
          {t(
            "Once resubscribed, if you still don't see emails in your inbox, check your spam folder. Some inbox providers keep a record of previous spam complaints and will continue to flag emails. If this happens, mark the latest newsletter as 'Not spam' to move it back to your primary inbox.",
          )}
        </p>
        <h4>{t('Permanent failure (bounce)')}</h4>
        <p>
          {t(
            'When an inbox fails to accept an email it is commonly called a bounce. In many cases, this can be temporary. However, in some cases, a bounced email can be returned as a permanent failure when an email address is invalid or non-existent.',
          )}
        </p>
        <p>
          {t(
            'In the event a permanent failure is received when attempting to send a newsletter, emails will be disabled on the account.',
          )}
        </p>
        <p>
          {t(
            'If you would like to start receiving emails again, the best next steps are to check your email address on file for any issues and then click resubscribe on the previous screen.',
          )}
        </p>
        <p>
          <a
            className="gh-portal-btn gh-portal-btn-branded no-margin-right relative mt-[4rem] flex h-11 w-full min-w-[80px] cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md border border-solid border-gray-200 bg-white px-[1.8rem] py-0 text-center text-base font-medium leading-[1em] tracking-[0.2px] text-brand no-underline [outline:none] [transition:all_0.25s_ease] hover:border-gray-300"
            href={supportAddress}
            onClick={() => {
              supportAddress && window.open(supportAddress);
            }}
          >
            {t('Need more help? Contact support')}
          </a>
        </p>
      </div>
    </div>
  );
}
