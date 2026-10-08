import AppContext from '../../app-context';
import CloseButton from './close-button';
import BackButton from './back-button';
import { useContext, useRef } from 'react';
import Switch from './switch';
import { getSiteNewsletters, hasMemberGotEmailSuppression } from '../../utils/helpers';
import ActionButton from './action-button';
import { t } from '../../utils/i18n';

function AccountHeader() {
  const { brandColor, lastPage, doAction } = useContext(AppContext);
  return (
    <header className="gh-portal-detail-header relative mx-0 mb-10 mt-[-2px] flex items-center justify-center px-[60px] max-sm:mt-1">
      <BackButton
        brandColor={brandColor}
        hidden={!lastPage}
        onClick={() => {
          doAction('back');
        }}
      />
      <h3 className="gh-portal-main-title text-pretty text-center leading-[1.1em] text-grey-0 max-[390px]:mt-px max-[390px]:text-[2.1rem]">
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
      className="gh-portal-list-toggle-wrapper gh-portal-list-clickable cursor-pointer !items-start justify-between focus-visible:[box-shadow:inset_0_0_0_2px_var(--brandcolor)] focus-visible:[outline:none]"
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
      <div className="gh-portal-list-detail grow py-1 pe-6 ps-0 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-0 [&_p]:me-2 [&_p]:ms-0 [&_p]:mt-[5px] [&_p]:text-[1.45rem] [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:text-grey-6 [&_p]:[word-break:break-word]">
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
      className="gh-portal-list-toggle-wrapper gh-portal-list-clickable cursor-pointer !items-start justify-between focus-visible:[box-shadow:inset_0_0_0_2px_var(--brandcolor)] focus-visible:[outline:none]"
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
      <div className="gh-portal-list-detail grow py-1 pe-6 ps-0 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-0 [&_p]:me-2 [&_p]:ms-0 [&_p]:mt-[5px] [&_p]:text-[1.45rem] [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:text-grey-6 [&_p]:[word-break:break-word]">
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
      className="gh-portal-list-toggle-wrapper gh-portal-list-clickable cursor-pointer !items-start justify-between focus-visible:[box-shadow:inset_0_0_0_2px_var(--brandcolor)] focus-visible:[outline:none]"
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
      <div className="gh-portal-list-detail grow py-1 pe-6 ps-0 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-0 [&_p]:me-2 [&_p]:ms-0 [&_p]:mt-[5px] [&_p]:text-[1.45rem] [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:text-grey-6 [&_p]:[word-break:break-word]">
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
    <section className="gh-portal-list-help justify-between gap-4 bg-grey-13 text-md">
      <span className="gh-portal-list-help-label text-grey-5">{t('Not receiving emails?')}</span>
      <button
        className="gh-portal-btn-text gh-email-faq-page-button h-auto shrink-0 cursor-pointer self-stretch border-none bg-transparent p-0 text-md font-medium text-brand [transition:color_linear_100ms]"
        onClick={() =>
          doAction('switchPage', { page: 'emailReceivingFAQ', pageData: { direct: false } })
        }
      >
        {t('Get help')} <span className="right-arrow rtl:inline-flex rtl:-scale-x-100">&rarr;</span>
      </button>
    </section>
  );
}

function ShowPaidMemberMessage({ site, isPaid }) {
  if (isPaid) {
    return (
      <p className="gh-portal-btn-unsubscribe-note m-0 text-balance text-center text-md leading-[1.4] text-grey-6">
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
    <div className="gh-portal-content with-footer relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="gh-portal-email-preferences-header">
        <AccountHeader />
        <FinalNotification />
      </div>
      <CloseButton brandColor={brandColor} />
      <div className="gh-portal-section mb-10 flex flex-col gap-5">
        <div className="gh-portal-list overflow-hidden rounded-lg border border-solid border-grey-12 bg-white p-0 [&_.gh-portal-list-help]:px-5 [&_.gh-portal-list-help]:py-2 [&_section:first-of-type]:rounded-t-lg [&_section:last-of-type]:rounded-b-lg [&_section:last-of-type]:border-none [&_section]:m-0 [&_section]:flex [&_section]:items-center [&_section]:p-5 [&_section]:[border-bottom:1px_solid_var(--grey12)]">
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
      <div className="gh-portal-btn-unsubscribe mt-10 flex flex-col gap-3 [&_.gh-portal-btn]:w-full">
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
