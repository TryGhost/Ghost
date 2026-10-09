import AppContext from '../../app-context';
import CloseButton from './close-button';
import BackButton from './back-button';
import { useContext, useRef } from 'react';
import Switch from './switch';
import { getSiteNewsletters, hasMemberGotEmailSuppression } from '../../utils/helpers';
import ActionButton from './action-button';
import { t } from '../../utils/i18n';
import { popupHeaderClass } from '../shared-classes';

function AccountHeader() {
  const { brandColor, lastPage, doAction } = useContext(AppContext);
  return (
    <header className={popupHeaderClass}>
      <BackButton
        brandColor={brandColor}
        hidden={!lastPage}
        onClick={() => {
          doAction('back');
        }}
      />
      <h3 className="text-center leading-[1.1em] text-pretty text-gray-950 max-2xs:mt-px max-2xs:text-21">
        {t('Email preferences')}
      </h3>
    </header>
  );
}

function NewsletterPrefSection({ newsletter, subscribedNewsletters, setSubscribedNewsletters }) {
  const isChecked = subscribedNewsletters.some((d) => {
    return d.id === newsletter?.id;
  });

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
      className="cursor-pointer items-start! justify-between focus-visible:shadow-focus-brand focus-visible:outline-none"
      data-testid="newsletter-toggle"
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
      <div className="grow py-1 ps-0 pe-6 [&_h3]:text-15 [&_h3]:font-semibold [&_p]:ms-0 [&_p]:me-2 [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:text-14.5 [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:[word-break:break-word] [&_p]:text-gray-600">
        <h3>{newsletter.name}</h3>
        <p>{newsletter?.description}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <Switch
          id={newsletter.id}
          label={newsletter.name}
          onToggle={handleToggle}
          checked={isChecked}
          dataTestId="switch-input"
          presentational={true}
        />
      </div>
    </section>
  );
}

function CommentsSection({
  updateCommentNotifications,
  isCommentsEnabled,
  enableCommentNotifications,
}) {
  const { doAction } = useContext(AppContext);
  const isChecked = !!enableCommentNotifications;
  // Ref-based guard so rapid synchronous clicks see the in-flight state
  // immediately — state updates wouldn't be visible until the next render.
  const isUpdatingRef = useRef(false);

  if (!isCommentsEnabled) {
    return null;
  }

  // Guard inside handleToggle so both the row click path and the inner
  // Switch's onToggle path are protected from concurrent updates.
  const handleToggle = async () => {
    if (isUpdatingRef.current) {
      return;
    }
    isUpdatingRef.current = true;
    try {
      await updateCommentNotifications(!isChecked);
      doAction('showPopupNotification', {
        action: 'updated:success',
        message: t('Comment preferences updated.'),
      });
    } finally {
      isUpdatingRef.current = false;
    }
  };

  return (
    <section
      className="cursor-pointer items-start! justify-between focus-visible:shadow-focus-brand focus-visible:outline-none"
      data-testid="comment-toggle"
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
      <div className="grow py-1 ps-0 pe-6 [&_h3]:text-15 [&_h3]:font-semibold [&_p]:ms-0 [&_p]:me-2 [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:text-14.5 [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:[word-break:break-word] [&_p]:text-gray-600">
        <h3>{t('Comments')}</h3>
        <p>{t('Get notified when someone replies to your comment')}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <Switch
          id="comments"
          label={t('Comments')}
          onToggle={handleToggle}
          checked={isChecked}
          dataTestId="switch-input"
          presentational={true}
        />
      </div>
    </section>
  );
}

function UpdatesAndAnnouncementsSection({
  updateUpdatesAndAnnouncements,
  canChangeUpdatesAndAnnouncements,
  enableUpdatesAndAnnouncements,
}) {
  const { doAction, site } = useContext(AppContext);
  // Ref-based guard so rapid synchronous clicks see the in-flight state
  // immediately — state updates wouldn't be visible until the next render.
  const isUpdatingRef = useRef(false);

  if (!canChangeUpdatesAndAnnouncements) {
    return null;
  }

  // Guard inside handleToggle so both the row click path and the inner
  // Switch's onToggle path are protected from concurrent updates.
  const handleToggle = async () => {
    if (isUpdatingRef.current) {
      return;
    }
    isUpdatingRef.current = true;
    try {
      await updateUpdatesAndAnnouncements(!enableUpdatesAndAnnouncements);
      doAction('showPopupNotification', {
        action: 'updated:success',
        message: t('Email preferences updated.'),
      });
    } finally {
      isUpdatingRef.current = false;
    }
  };

  return (
    <section
      className="cursor-pointer items-start! justify-between focus-visible:shadow-focus-brand focus-visible:outline-none"
      data-testid="updates-and-announcements-toggle"
      role="button"
      tabIndex={0}
      aria-pressed={!!enableUpdatesAndAnnouncements}
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
      <div className="grow py-1 ps-0 pe-6 [&_h3]:text-15 [&_h3]:font-semibold [&_p]:ms-0 [&_p]:me-2 [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:text-14.5 [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:[word-break:break-word] [&_p]:text-gray-600">
        <h3>{t('Updates & announcements')}</h3>
        <p>{t('Occasional updates from {siteTitle}', { siteTitle: site?.title })}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        <Switch
          id="updates-and-announcements"
          label={t('Updates & announcements')}
          onToggle={handleToggle}
          checked={enableUpdatesAndAnnouncements}
          dataTestId="switch-input"
          presentational={true}
        />
      </div>
    </section>
  );
}

function NewsletterPrefs({
  subscribedNewsletters,
  setSubscribedNewsletters,
  hasNewslettersEnabled,
}) {
  const { site } = useContext(AppContext);
  const newsletters = getSiteNewsletters({ site });
  if (!hasNewslettersEnabled) {
    return null;
  }
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

function EmailHelpSection() {
  const { doAction } = useContext(AppContext);
  return (
    <section className="gh-portal-list-help justify-between gap-4 bg-gray-100 text-14">
      <span className="text-gray-700">{t('Not receiving emails?')}</span>
      <button
        className="h-auto shrink-0 cursor-pointer self-stretch border-none bg-transparent p-0 text-14 font-medium text-brand [transition:color_linear_100ms]"
        onClick={() =>
          doAction('switchPage', { page: 'emailReceivingFAQ', pageData: { direct: false } })
        }
      >
        {t('Get help')} <span className="rtl:inline-flex rtl:-scale-x-100">&rarr;</span>
      </button>
    </section>
  );
}

function ShowPaidMemberMessage({ site, isPaid }) {
  if (isPaid) {
    return (
      <p className="m-0 text-center text-14 leading-[1.4] text-balance text-gray-600">
        {t('Unsubscribing from emails will not cancel your paid subscription to {title}', {
          title: site?.title,
        })}
      </p>
    );
  }
  return null;
}

export default function NewsletterManagement({
  hasNewslettersEnabled,
  notification,
  subscribedNewsletters,
  updateSubscribedNewsletters,
  updateCommentNotifications,
  updateUpdatesAndAnnouncements,
  unsubscribeAll,
  isPaidMember,
  isCommentsEnabled,
  enableCommentNotifications,
  canChangeUpdatesAndAnnouncements,
  enableUpdatesAndAnnouncements,
}) {
  const { brandColor, member, site } = useContext(AppContext);

  // Snapshot the updates & announcements value when the modal opens. When the member has no
  // explicit preference yet (null), derive it from whether any newsletter is subscribed at open
  // time and keep it fixed while open, so toggling a newsletter doesn't also appear to flip
  // updates & announcements.
  const wasInitiallySubscribedToAnyNewsletters = useRef(!!subscribedNewsletters?.length).current;
  const hasExplicitUpdatesPreference =
    enableUpdatesAndAnnouncements !== null && enableUpdatesAndAnnouncements !== undefined;
  const effectiveEnableUpdatesAndAnnouncements = hasExplicitUpdatesPreference
    ? enableUpdatesAndAnnouncements
    : wasInitiallySubscribedToAnyNewsletters;

  const hasNoCommentSubscription =
    (isCommentsEnabled && !enableCommentNotifications) || !isCommentsEnabled;
  const hasNoUpdatesSubscription =
    (canChangeUpdatesAndAnnouncements && !effectiveEnableUpdatesAndAnnouncements) ||
    !canChangeUpdatesAndAnnouncements;
  const isDisabled =
    !subscribedNewsletters?.length && hasNoCommentSubscription && hasNoUpdatesSubscription;
  const EmptyNotification = () => {
    return null;
  };
  const FinalNotification = notification || EmptyNotification;
  return (
    <div className="relative scrollbar-none">
      <div>
        <AccountHeader />
        <FinalNotification />
      </div>
      <CloseButton brandColor={brandColor} />
      <div className="gh-portal-section mb-10 flex flex-col gap-[2rem]">
        <div className="gh-portal-list overflow-hidden rounded-lg border border-solid border-gray-150 bg-white p-0 [&_.gh-portal-list-help]:px-5 [&_.gh-portal-list-help]:py-2 [&_section]:m-0 [&_section]:flex [&_section]:items-center [&_section]:p-5 [&_section]:[border-bottom:1px_solid_var(--color-gray-150)] [&_section:first-of-type]:rounded-t-lg [&_section:last-of-type]:rounded-b-lg [&_section:last-of-type]:border-none">
          <NewsletterPrefs
            hasNewslettersEnabled={hasNewslettersEnabled}
            subscribedNewsletters={subscribedNewsletters}
            setSubscribedNewsletters={(updatedNewsletters) => {
              const newsletters = updatedNewsletters.map((d) => {
                return {
                  id: d.id,
                };
              });
              if (canChangeUpdatesAndAnnouncements && !hasExplicitUpdatesPreference) {
                updateSubscribedNewsletters(newsletters, effectiveEnableUpdatesAndAnnouncements);
              } else {
                updateSubscribedNewsletters(newsletters);
              }
            }}
          />
          <CommentsSection
            isCommentsEnabled={isCommentsEnabled}
            enableCommentNotifications={enableCommentNotifications}
            updateCommentNotifications={updateCommentNotifications}
          />
          <UpdatesAndAnnouncementsSection
            canChangeUpdatesAndAnnouncements={canChangeUpdatesAndAnnouncements}
            enableUpdatesAndAnnouncements={effectiveEnableUpdatesAndAnnouncements}
            updateUpdatesAndAnnouncements={updateUpdatesAndAnnouncements}
          />
          {hasMemberGotEmailSuppression({ member }) && !isDisabled && <EmailHelpSection />}
        </div>
      </div>
      <div className="mt-10 flex flex-col gap-3 [&_.gh-portal-btn]:w-full">
        <ActionButton
          isRunning={false}
          onClick={() => {
            unsubscribeAll();
          }}
          disabled={isDisabled}
          brandColor={brandColor}
          isPrimary={false}
          label={t('Unsubscribe from all emails')}
          isDestructive={true}
          style={{ width: '100%' }}
          dataTestId="unsubscribe-from-all-emails"
        />
        <ShowPaidMemberMessage isPaid={isPaidMember} site={site} />
      </div>
    </div>
  );
}
