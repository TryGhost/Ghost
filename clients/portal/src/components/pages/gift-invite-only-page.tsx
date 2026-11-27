import { useContext } from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import SiteTitleBackButton from '../common/site-title-back-button';
import InvitationIcon from '../../images/icons/invitation.svg?react';
import { t } from '../../utils/i18n';
import type { Site } from '../../utils/gift-subscriptions';

interface GiftInviteOnlyPageContext {
  doAction: (action: string, data?: Record<string, unknown>) => void;
  site: Site;
}

// Shown for the gift link on invite-only sites, which block new members, so a gift recipient who
// isn't already a member couldn't redeem. Same small popup as the invite-only signup screen.
const GiftInviteOnlyPage = () => {
  const { doAction, site } = useContext(AppContext) as unknown as GiftInviteOnlyPageContext;
  const siteTitle = site.title || '';

  const handleClose = () => {
    doAction('closePopup');
  };

  return (
    <>
      <div className="gh-portal-back-sitetitle">
        <SiteTitleBackButton onBack={handleClose} />
      </div>
      <CloseButton />
      <div className="gh-portal-content signup invite-only">
        <header className="gh-portal-signup-header">
          {site.icon ? (
            <img alt={siteTitle} className="gh-portal-signup-logo" src={site.icon} />
          ) : (
            <InvitationIcon className="gh-portal-icon gh-portal-icon-invitation" />
          )}
          <h1 className="gh-portal-main-title">{siteTitle}</h1>
        </header>
        <section>
          <div className="gh-portal-section">
            <p className="gh-portal-invite-only-notification">
              {t('This site is invite-only, contact the owner for access.')}
            </p>
          </div>
        </section>
      </div>
    </>
  );
};

export default GiftInviteOnlyPage;
