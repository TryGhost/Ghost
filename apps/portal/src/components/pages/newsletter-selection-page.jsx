import AppContext from '../../app-context';
import { useContext, useState } from 'react';
import Switch from '../common/switch';
import { getSiteNewsletters, hasOnlyFreePlan } from '../../utils/helpers';
import ActionButton from '../common/action-button';
import LockIcon from '../../images/icons/lock.svg?react';
import { t } from '../../utils/i18n';

const listSectionClass =
  'gh-portal-list-toggle-wrapper flex items-start justify-between p-5 [border-bottom:1px_solid_var(--grey12)] first-of-type:rounded-t-lg last-of-type:rounded-b-lg last-of-type:[border:none]';

const listDetailClass =
  'gh-portal-list-detail gh-portal-list-big grow py-1 pl-0 pr-6 rtl:pl-6 rtl:pr-0';

const listDetailTitleClass = 'text-lg font-semibold';

const listDetailTextClass =
  'mb-0 mr-2 mt-[5px] text-base leading-[1.3em] tracking-[0.3px] text-grey-6 [word-break:break-word] rtl:ml-2 rtl:mr-0';

function NewsletterPrefSection({ newsletter, subscribedNewsletters, setSubscribedNewsletters }) {
  const isChecked = subscribedNewsletters.some((d) => {
    return d.id === newsletter?.id;
  });
  if (newsletter.paid) {
    return (
      <section className={listSectionClass} data-testid="toggle-wrapper">
        <div className={listDetailClass}>
          <h3 className={listDetailTitleClass}>{newsletter.name}</h3>
          <p className={listDetailTextClass}>{newsletter.description}</p>
        </div>
        <div className="gh-portal-lock-icon-container flex justify-center pt-1.5 [flex:44px_0_0]">
          <LockIcon
            className="gh-portal-lock-icon size-[14px] overflow-visible [&_path]:text-grey-2"
            alt=""
            title={t('Unlock access to all newsletters by becoming a paid subscriber.')}
          />
        </div>
      </section>
    );
  }

  const handleToggle = () => {
    let updatedNewsletters = [];
    if (isChecked) {
      updatedNewsletters = subscribedNewsletters.filter((d) => {
        return d.id !== newsletter.id;
      });
    } else {
      updatedNewsletters = subscribedNewsletters
        .filter((d) => {
          return d.id !== newsletter.id;
        })
        .concat(newsletter);
    }
    setSubscribedNewsletters(updatedNewsletters);
  };

  return (
    <section
      className={`${listSectionClass} gh-portal-list-clickable cursor-pointer focus-visible:[box-shadow:inset_0_0_0_2px_var(--brandcolor)] focus-visible:[outline:none]`}
      data-testid="toggle-wrapper"
      role="button"
      tabIndex={0}
      aria-pressed={isChecked}
      onClick={handleToggle}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleToggle();
        }
      }}
    >
      <div className={listDetailClass}>
        <h3 className={listDetailTitleClass}>{newsletter.name}</h3>
        <p className={listDetailTextClass}>{newsletter.description}</p>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <Switch
          id={newsletter.id}
          label={newsletter.name}
          onToggle={handleToggle}
          checked={isChecked}
          presentational={true}
        />
      </div>
    </section>
  );
}

function NewsletterPrefs({ subscribedNewsletters, setSubscribedNewsletters }) {
  const { site } = useContext(AppContext);
  const newsletters = getSiteNewsletters({ site });
  return newsletters.map((newsletter) => {
    return (
      <NewsletterPrefSection
        key={newsletter?.id}
        newsletter={newsletter}
        subscribedNewsletters={subscribedNewsletters}
        setSubscribedNewsletters={setSubscribedNewsletters}
      />
    );
  });
}

export default function NewsletterSelectionPage({ pageData, onBack }) {
  const { brandColor, site, doAction, action } = useContext(AppContext);
  const siteNewsletters = getSiteNewsletters({ site });
  const defaultNewsletters = siteNewsletters.filter((d) => {
    return d.subscribe_on_signup;
  });
  // const tier = getProductFromPrice({site, priceId: pageData.plan});
  // const tierName = tier?.name;
  let isRunning = false;
  if (action === 'signup:running') {
    isRunning = true;
  }
  let label = t('Continue');
  let retry = false;
  if (action === 'signup:failed') {
    label = t('Retry');
    retry = true;
  }

  const disabled = action === 'signup:running' ? true : false;

  const [subscribedNewsletters, setSubscribedNewsletters] = useState(defaultNewsletters);
  return (
    <div className="gh-portal-content with-footer gh-portal-newsletter-selection relative mx-auto max-w-[460px] animate-[fadeIn_0.5s_ease-in-out] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <p className="gh-portal-text-center gh-portal-text-large text-pretty text-center text-xl font-semibold">
        {t('Choose your newsletters')}
      </p>
      <div className="gh-portal-section mb-10">
        <div className="gh-portal-list mb-10 overflow-hidden rounded-lg border border-solid border-grey-12 bg-white p-0">
          <NewsletterPrefs
            subscribedNewsletters={subscribedNewsletters}
            setSubscribedNewsletters={setSubscribedNewsletters}
          />
        </div>
      </div>
      <footer className="gh-portal-action-footer flex flex-col items-center justify-between gap-[12px]">
        <div style={{ width: '100%' }}>
          <div style={{ marginBottom: '20px' }}>
            <ActionButton
              isRunning={isRunning}
              retry={retry}
              disabled={disabled}
              onClick={() => {
                const newsletters = subscribedNewsletters.map((d) => {
                  return {
                    id: d.id,
                    name: d.name,
                  };
                });
                const { name, email, plan, phonenumber, offerId } = pageData;
                doAction('signup', { name, email, plan, phonenumber, newsletters, offerId });
              }}
              brandColor={brandColor}
              label={label}
              style={{ width: '100%' }}
            />
          </div>
          {!hasOnlyFreePlan({ site }) ? (
            <div>
              <button
                className="gh-portal-btn gh-portal-btn-link gh-portal-btn-different-plan relative mx-auto mb-6 mt-0 flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md bg-transparent p-0 text-center text-base font-normal leading-none tracking-[0.2px] text-grey-6 no-underline [border:none] [outline:none] [transition:all_0.25s_ease] hover:border-grey-10 hover:opacity-[0.85]"
                onClick={() => {
                  onBack();
                }}
              >
                <span>{t('Choose a different plan')}</span>
              </button>
            </div>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
