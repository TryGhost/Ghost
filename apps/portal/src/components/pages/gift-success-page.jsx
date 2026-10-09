import clsx from 'clsx';
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
import {
  giftCardStageClass,
  giftCheckoutRightClass,
  giftInnerClass,
  giftLeftClass,
  giftPreviewClass,
  giftSubtitleClass,
  giftTitleClass,
} from './gift/classes';
import { tw } from '../../utils/tw';

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
      <div className="relative scrollbar-none min-h-screen p-0">
        <CloseButton placement="gift" tone="light" />
        <div className="grid min-h-screen w-full grid-cols-[1fr_1fr] max-md:min-h-0 max-md:grid-cols-[1fr]">
          <div className={giftLeftClass}>
            <div className={giftInnerClass}>
              <header className="mb-3">
                <span
                  className="mb-5 inline-flex size-13 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--brandcolor)_12%,var(--color-white))] text-brand [&_svg]:size-6.5"
                  aria-hidden="true"
                >
                  <CheckIcon />
                </span>
                <h1 className={giftTitleClass}>{titleText}</h1>
                <p className={giftSubtitleClass}>{subtitleText}</p>
              </header>

              <div className="mt-6">
                {isEmailed && (
                  <p className="mb-2 text-13 font-medium tracking-[0.3px] text-gray-700 uppercase">
                    {t('Share it yourself')}
                  </p>
                )}
                <div className="flex h-14 items-center gap-2 rounded-full bg-[color:color-mix(in_srgb,var(--brandcolor)_8%,var(--color-white))] py-1 pr-2 pl-6">
                  <span
                    className="flex-1 truncate text-16 font-normal text-brand select-all"
                    data-testid="gift-redeem-link"
                  >
                    {redeemUrl}
                  </span>
                  <button
                    className={clsx(
                      tw`flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-none px-4.5 py-0 text-14 font-semibold text-white [will-change:opacity] [transition:opacity_0.15s_ease] hover:opacity-90 focus-visible:[outline:2px_solid_var(--color-black)] [&_svg]:size-3.5`,
                      copied ? 'bg-green' : 'bg-brand',
                    )}
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
                <p className="mt-6 mb-0 text-14 leading-[1.5] text-gray-700">
                  {t("Not ready to share? We've also emailed a copy to your inbox.")}
                </p>
              )}
            </div>
          </div>

          <div className={giftCheckoutRightClass} {...cardTiltProps}>
            <div className={giftPreviewClass}>
              <div className={giftCardStageClass} data-revealing={showDetails}>
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
