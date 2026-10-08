import { useContext, useState } from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import GiftCard from '../common/gift-card';
import GiftDetailsToggle from '../common/gift-details-toggle';
import copyTextToClipboard from '../../utils/copy-to-clipboard';
import { getAvailableProducts } from '../../utils/helpers';
import { getGiftDurationLabel } from '../../utils/gift-redemption-notification';
import { getGiftPrice } from '../../utils/gift-subscriptions';
import { getDateString, parseDateValue } from '../../utils/date-time';
import { t } from '../../utils/i18n';
import useCardTilt from '../../utils/use-card-tilt';
import { formatGiftValue } from '../../utils/format-gift-value';

const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const GiftSuccessPage = () => {
  const { site, pageData } = useContext(AppContext);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { cardRef, containerProps: cardTiltProps } = useCardTilt();

  const token = pageData?.token;
  const tierId = pageData?.tierId;
  const cadence = pageData?.cadence;
  const duration = pageData?.duration || 1;
  const deliveryMethod = pageData?.deliveryMethod;
  const deliveryDate = pageData?.deliveryDate;
  const scheduledAt = pageData?.scheduledAt;
  const siteUrl = site?.url || '';
  const siteIcon = site?.icon;
  const siteTitle = site?.title || '';
  const redeemUrl = `${siteUrl.replace(/\/$/, '')}/gift/${token}`;

  const products = getAvailableProducts({ site }).filter((p) => p.type === 'paid');
  const tier = tierId ? products.find((p) => p.id === tierId) : null;

  const handleCopy = () => {
    copyTextToClipboard(redeemUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isEmailed = deliveryMethod === 'email';

  // A delivery date without a future gift_scheduled_at means the server
  // already sent the gift.
  const isStillScheduled = isEmailed && deliveryDate && scheduledAt && scheduledAt > Date.now();

  let titleText = t('Your gift is ready');
  let subtitleText = t("Send the link below to share it with whoever you'd like.");
  if (isStillScheduled) {
    const formattedDate = getDateString(parseDateValue(deliveryDate));
    titleText = t('Your gift is scheduled');
    subtitleText = t(
      "We'll email it to the recipient on {deliveryDate}. A copy is in your inbox too.",
      { deliveryDate: formattedDate },
    );
  } else if (isEmailed) {
    titleText = t('Your gift is on its way');
    subtitleText = t("We'll email it to the recipient. A copy will be in your inbox too.");
  }

  return (
    <>
      <div className="gh-portal-content giftSuccess relative min-h-screen p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_.gh-portal-closeicon-container]:absolute group-[.full-size]/popup:[&_.gh-portal-closeicon-container]:right-8 group-[.full-size]/popup:[&_.gh-portal-closeicon-container]:top-8 rtl:group-[.full-size]/popup:[&_.gh-portal-closeicon-container]:right-auto">
        <CloseButton />
        <div className="gh-portal-gift-checkout grid min-h-screen w-full grid-cols-[1fr_1fr] max-[880px]:min-h-0 max-[880px]:grid-cols-[1fr]">
          <div className="gh-portal-gift-checkout-left relative flex items-center justify-center bg-white p-12 max-[880px]:px-6 max-[880px]:pb-6 max-[880px]:pt-8">
            <div className="gh-portal-gift-checkout-bg hidden" aria-hidden="true" />
            <div className="gh-portal-gift-checkout-inner relative z-[1] my-auto flex w-full max-w-[496px] flex-col">
              <header className="gh-portal-gift-checkout-header mb-3">
                <span
                  className="gh-portal-gift-success-badge mb-5 inline-flex size-[52px] items-center justify-center rounded-[999px] bg-[color:color-mix(in_srgb,var(--brandcolor)_12%,var(--white))] text-brand [&_svg]:size-[26px]"
                  aria-hidden="true"
                >
                  <CheckIcon />
                </span>
                <h1 className="gh-portal-main-title mb-2 text-pretty text-start text-4xl leading-[1.15] text-grey-0 max-sm:text-[2.6rem]">
                  {titleText}
                </h1>
                <p className="gh-portal-gift-checkout-subtitle m-0 text-pretty text-base leading-[1.45em] text-grey-3">
                  {subtitleText}
                </p>
              </header>

              <div className="gh-portal-gift-checkout-section mt-6">
                {isEmailed && (
                  <p className="gh-portal-gift-success-share-label mb-2 text-sm font-medium uppercase tracking-[0.3px] text-grey-6">
                    {t('Share it yourself')}
                  </p>
                )}
                <div className="gh-portal-gift-success-link flex h-14 items-center gap-2 rounded-[999px] bg-[color:color-mix(in_srgb,var(--brandcolor)_8%,var(--white))] py-1 pl-6 pr-2">
                  <span
                    className="gh-portal-gift-success-link-url flex-1 select-all truncate text-lg font-normal text-brand"
                    data-testid="gift-redeem-link"
                  >
                    {redeemUrl}
                  </span>
                  <button
                    className={
                      'gh-portal-gift-success-copy flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-[999px] border-none px-[18px] py-0 text-md font-semibold text-white [transition:opacity_0.15s_ease] [will-change:opacity] hover:opacity-90 focus-visible:[outline:2px_solid_var(--grey0)] [&_svg]:size-[14px]' +
                      (copied ? ' is-copied bg-green' : ' bg-brand')
                    }
                    onClick={handleCopy}
                    type="button"
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? t('Copied') : t('Copy')}
                  </button>
                </div>
                <span
                  aria-live="polite"
                  style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    padding: 0,
                    margin: '-1px',
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                  }}
                >
                  {copied ? t('Gift link copied to clipboard') : ''}
                </span>
              </div>

              {!isEmailed && (
                <p className="gh-portal-gift-success-footer mb-0 mt-6 text-md leading-[1.5] text-grey-6">
                  {t("Not ready to share? We've also emailed a copy to your inbox.")}
                </p>
              )}
            </div>
          </div>

          <div
            className="gh-portal-gift-checkout-right top-0 flex h-screen overflow-y-auto py-3 pl-0 pr-3 [align-self:start] [position:sticky] max-[880px]:static max-[880px]:-order-1 max-[880px]:h-auto max-[880px]:overflow-visible max-[880px]:p-0"
            {...cardTiltProps}
          >
            <div className="gh-portal-gift-checkout-right-panel flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-[32px] px-12 py-16 [background:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0)_100%),var(--brandcolor)] max-[880px]:rounded-t-none max-[880px]:px-6 max-[880px]:pb-8 max-[880px]:pt-14">
              <div
                className="gh-portal-gift-checkout-card-stack my-auto flex w-full max-w-[280px] shrink-0 flex-col items-center max-[880px]:max-w-[240px] [&[data-revealing=true]_.gh-portal-gift-checkout-card-frame]:[transform:rotate(3deg)]"
                data-revealing={showDetails}
              >
                <GiftCard
                  cardRef={cardRef}
                  duration={
                    tier && cadence
                      ? getGiftDurationLabel({
                          cadence: pageData?.duration ? 'month' : cadence,
                          duration,
                        })
                      : null
                  }
                  tierName={tier && cadence ? tier.name : null}
                  giftValue={
                    tier && cadence
                      ? formatGiftValue(
                          pageData?.duration
                            ? getGiftPrice(tier, duration)
                            : cadence === 'month'
                              ? tier.monthlyPrice
                              : tier.yearlyPrice,
                          site?.locale,
                        )
                      : null
                  }
                  siteIcon={siteIcon}
                  siteTitle={siteTitle}
                />

                {tier && (
                  <GiftDetailsToggle
                    description={tier.description}
                    benefits={tier.benefits}
                    showDetails={showDetails}
                    onToggle={() => setShowDetails((s) => !s)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default GiftSuccessPage;
