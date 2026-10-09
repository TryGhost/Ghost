import AppContext from '../../../../app-context';
import GiftIcon from '../../../../images/icons/gift.svg?react';
import { type KeyboardEvent, useContext } from 'react';
import { isGiftMember, isPaidMember } from '../../../../utils/helpers';
import { type Site, canShowAccountGiftPromotion } from '../../../../utils/gift-subscriptions';
import { t } from '../../../../utils/i18n';
import {
  accountActionButtonClass,
  accountActionClass,
  accountActionTextClass,
} from '../../../shared-classes';

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
    <div className="gh-portal-list mt-4 overflow-hidden rounded-lg border border-solid border-gray-150 bg-white p-0 [&_section]:m-0 [&_section]:flex [&_section]:items-center [&_section]:p-5 [&_section]:[border-bottom:1px_solid_var(--color-gray-150)] [&_section:first-of-type]:rounded-t-lg [&_section:last-of-type]:rounded-b-lg [&_section:last-of-type]:border-none">
      <section
        className={accountActionClass}
        role="button"
        tabIndex={0}
        onClick={openGiftPage}
        onKeyDown={handleKeyDown}
      >
        <div className={accountActionTextClass}>
          <h3>{t('Gift membership')}</h3>
          <p>{t('For a friend or colleague')}</p>
        </div>
        <span
          aria-hidden="true"
          className={accountActionButtonClass}
          data-test-button="give-gift-subscription"
        >
          <GiftIcon className="me-1 size-4 stroke-2" />
          {t('Buy')}
        </span>
      </section>
    </div>
  );
}

export default GiveGiftCard;
