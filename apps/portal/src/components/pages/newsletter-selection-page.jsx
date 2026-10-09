import AppContext from '../../app-context';
import { useContext, useState } from 'react';
import Switch from '../common/switch';
import { getSiteNewsletters, hasOnlyFreePlan } from '../../utils/helpers';
import ActionButton from '../common/action-button';
import LockIcon from '../../images/icons/lock.svg?react';
import { t } from '../../utils/i18n';
import { tw } from '../../utils/tw';

const listSectionClass = tw`flex items-start justify-between p-5 [border-bottom:1px_solid_var(--color-gray-150)] first-of-type:rounded-t-lg last-of-type:rounded-b-lg last-of-type:[border:none]`;

const listDetailClass = tw`grow py-1 pr-6 pl-0 rtl:pr-0 rtl:pl-6`;

const listDetailTitleClass = 'text-16 font-semibold';

const listDetailTextClass = tw`mt-[5px] mr-2 mb-0 text-15 leading-[1.3em] tracking-[0.3px] [word-break:break-word] text-gray-600 rtl:mr-0 rtl:ml-2`;

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
        <div className="flex [flex:44px_0_0] justify-center pt-1.5">
          <LockIcon
            className="size-3.5 overflow-visible [&_path]:text-gray-850"
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
      className={`${listSectionClass} cursor-pointer focus-visible:shadow-focus-brand focus-visible:outline-none`}
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
    <div className="relative mx-auto scrollbar-none max-w-[460px] animate-fade-in">
      <p className="text-center text-18 font-semibold text-pretty">
        {t('Choose your newsletters')}
      </p>
      <div className="gh-portal-section mb-10">
        <div className="gh-portal-list mb-10 overflow-hidden rounded-lg border border-solid border-gray-150 bg-white p-0">
          <NewsletterPrefs
            subscribedNewsletters={subscribedNewsletters}
            setSubscribedNewsletters={setSubscribedNewsletters}
          />
        </div>
      </div>
      <footer className="flex flex-col items-center justify-between gap-3">
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
                className="gh-portal-btn relative mx-auto mt-0 mb-6 flex cursor-pointer items-center justify-center rounded-md bg-transparent p-0 text-center text-15 leading-none font-normal tracking-[0.2px] whitespace-nowrap text-gray-600 no-underline outline-none select-none [border:none] transition-control hover:border-gray-250 hover:opacity-[0.85]"
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
