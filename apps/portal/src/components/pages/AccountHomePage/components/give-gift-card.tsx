import AppContext from '../../../../app-context';
import { type KeyboardEvent, useContext } from 'react';
import { isGiftMember, isPaidMember } from '../../../../utils/helpers';
import { type Site, canShowAccountGiftPromotion } from '../../../../utils/gift-subscriptions';
import { t } from '../../../../utils/i18n';

interface Member {
  paid?: boolean;
  status?: string;
}

interface GiftCardContext {
  member: Member | null;
  site: Site | null;
  doAction: (action: string, data: { page: string; lastPage: string }) => unknown;
}

function canGiveGift({ site, member }: { site: Site | null; member: Member | null }) {
  return (
    canShowAccountGiftPromotion({ site }) &&
    isPaidMember({ member: member ?? undefined }) &&
    !isGiftMember({ member: member ?? undefined })
  );
}

function GiveGiftCard() {
  const { member, site, doAction } = useContext(AppContext) as GiftCardContext;

  if (!canGiveGift({ site, member })) {
    return null;
  }

  const openGiftPage = () => {
    doAction('switchPage', {
      page: 'gift',
      lastPage: 'accountHome',
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openGiftPage();
    }
  };

  return (
    <div className="gh-portal-list gh-portal-gift-card">
      <section
        className="gh-portal-list-clickable"
        role="button"
        tabIndex={0}
        onClick={openGiftPage}
        onKeyDown={handleKeyDown}
      >
        <div className="gh-portal-list-detail">
          <h3>{t('Gift membership')}</h3>
          <p>{t('For a friend or colleague')}</p>
        </div>
        <span
          aria-hidden="true"
          className="gh-portal-list-action"
          data-test-button="give-gift-subscription"
        >
          {t('Buy')}
        </span>
      </section>
    </div>
  );
}

export default GiveGiftCard;
