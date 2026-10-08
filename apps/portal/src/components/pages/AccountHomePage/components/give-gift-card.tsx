import AppContext from '../../../../app-context';
import GiftIcon from '../../../../images/icons/gift.svg?react';
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
    <div className="gh-portal-list gh-portal-gift-card mt-4 overflow-hidden rounded-lg border border-solid border-grey-12 bg-white p-0 [&_section:first-of-type]:rounded-t-lg [&_section:last-of-type]:rounded-b-lg [&_section:last-of-type]:border-none [&_section]:m-0 [&_section]:flex [&_section]:items-center [&_section]:p-5 [&_section]:[border-bottom:1px_solid_var(--grey12)]">
      <section
        className="gh-portal-list-clickable cursor-pointer focus-visible:[box-shadow:inset_0_0_0_2px_var(--brandcolor)] focus-visible:[outline:none]"
        role="button"
        tabIndex={0}
        onClick={openGiftPage}
        onKeyDown={handleKeyDown}
      >
        <div className="gh-portal-list-detail grow [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-0 [&_p]:me-2 [&_p]:ms-0 [&_p]:mt-[5px] [&_p]:text-[1.45rem] [&_p]:leading-[1.3em] [&_p]:tracking-[0.3px] [&_p]:text-grey-6 [&_p]:[word-break:break-word]">
          <h3>{t('Gift membership')}</h3>
          <p>{t('For a friend or colleague')}</p>
        </div>
        <span
          aria-hidden="true"
          className="gh-portal-list-action -mx-1 my-0 flex min-h-[38px] select-none items-center justify-center whitespace-nowrap px-1 py-0 text-base font-medium leading-[1em] tracking-[0.2px] text-brand"
          data-test-button="give-gift-subscription"
        >
          <GiftIcon className="gh-portal-gift-card-icon me-1 size-4 stroke-2" />
          {t('Buy')}
        </span>
      </section>
    </div>
  );
}

export default GiveGiftCard;
