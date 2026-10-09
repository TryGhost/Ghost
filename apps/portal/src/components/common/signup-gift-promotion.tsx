import AppContext from '../../app-context';
import GiftIcon from '../../images/icons/gift.svg?react';
import { useContext } from 'react';
import { type Site, canShowSignupGiftPromotion } from '../../utils/gift-subscriptions';
import { t } from '../../utils/i18n';

interface SignupGiftPromotionProps {
  className?: string;
  lastPage: string;
}

interface SignupGiftPromotionContext {
  brandColor: string;
  doAction: (action: string, data: { page: string; lastPage: string }) => unknown;
  site: Site | null;
}

const SignupGiftPromotion = ({ className, lastPage }: SignupGiftPromotionProps) => {
  const { brandColor, doAction, site } = useContext(AppContext) as SignupGiftPromotionContext;

  if (!canShowSignupGiftPromotion({ site })) {
    return null;
  }

  const promotion = (
    <>
      <div>{t('Buying for someone else?')}</div>
      <button
        className="gh-portal-btn relative ms-1! -mb-px flex cursor-pointer items-center justify-center rounded-md bg-transparent p-0 text-center text-14 leading-none font-semibold tracking-[0.2px] whitespace-nowrap text-black no-underline outline-none select-none [border:none] transition-control hover:border-gray-300 hover:opacity-[0.85]"
        data-test-button="gift-switch"
        data-testid="gift-switch"
        style={{ color: brandColor }}
        type="button"
        onClick={() => doAction('switchPage', { page: 'gift', lastPage })}
      >
        <GiftIcon aria-hidden="true" className="me-1 size-4 [stroke-width:2]" />
        <span className="-mb-0.5 inline-block pb-0.5">{t('Gift a membership')}</span>
      </button>
    </>
  );

  if (className) {
    return <div className={className}>{promotion}</div>;
  }

  return promotion;
};

export default SignupGiftPromotion;
