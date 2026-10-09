import giftCardNoiseUrl from '../../images/gift-card-noise.webp';
import giftCardOrbUrl from '../../images/gift-card-orb.webp';
import { t } from '../../utils/i18n';

const GiftCard = ({
  cardRef,
  duration,
  tierName,
  name,
  toName,
  fromName,
  giftValue,
  siteIcon,
  siteTitle,
}) => {
  const hasMeta = duration && tierName;
  const hasDetails = name || toName || fromName || giftValue;

  return (
    <div className="gh-portal-gift-checkout-card-frame sticky top-0 z-[1] w-full [perspective:1200px] [transform-style:preserve-3d] [transition:transform_0.3s_ease]">
      <div
        ref={cardRef}
        style={{
          '--gift-card-orb': `url(${giftCardOrbUrl})`,
          '--gift-card-noise': `url(${giftCardNoiseUrl})`,
        }}
        className="gh-portal-gift-checkout-card relative isolate flex aspect-[1/1.45] w-full max-w-[280px] flex-col overflow-hidden rounded-[24px] shadow-gift-card [will-change:transform] [background:linear-gradient(var(--shine-angle,243.43deg),rgba(255,255,255,0)_3.94%,rgba(255,255,255,0.31)_49.99%,rgba(255,255,255,0)_95.16%),linear-gradient(0deg,rgba(255,255,255,0.07),rgba(255,255,255,0.07)),var(--brandcolor)] [transform-style:preserve-3d] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:bg-[image:var(--gift-card-orb)] before:bg-[length:120%_auto] before:bg-[position:-60%_-180%] before:bg-no-repeat before:opacity-20 before:content-[''] after:pointer-events-none after:absolute after:inset-0 after:z-[2] after:bg-[image:var(--gift-card-noise)] after:bg-[length:192px_192px] after:bg-center after:bg-repeat after:opacity-10 after:content-[''] max-[881px]:max-w-[240px]"
      >
        <div
          className="gh-portal-gift-checkout-card-notch pointer-events-none absolute top-5 left-1/2 z-[3] h-3 w-14 -translate-x-1/2 rounded-xl bg-[color:color-mix(in_srgb,var(--brandcolor)_65%,#000_35%)] [box-shadow:inset_0_1px_2px_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.18)]"
          aria-hidden="true"
        />
        {hasMeta && (
          <div className="gh-portal-gift-checkout-card-meta relative z-[3] flex-1 px-7 pt-14">
            <div
              className="gh-portal-gift-checkout-card-duration text-28 leading-[1.1] font-semibold tracking-[-0.01em] text-white max-sm:text-20"
              data-testid="gift-card-duration"
            >
              {duration}
            </div>
            <div className="gh-portal-gift-checkout-card-tier mt-1.5 text-15 leading-[1.3] [overflow-wrap:anywhere] text-white">
              {t('{tierName} membership', { tierName })}
            </div>
          </div>
        )}
        {hasDetails && (
          <div className="gh-portal-gift-checkout-card-details relative z-[3] flex flex-col gap-2 px-7 pb-6">
            {name && (
              <div className="gh-portal-gift-checkout-card-detail">
                <div className="gh-portal-gift-checkout-card-detail-label mb-[-5px] text-12 text-white/80">
                  {t('Name')}
                </div>
                <div className="gh-portal-gift-checkout-card-detail-value text-13 font-medium [overflow-wrap:anywhere] text-white">
                  {name}
                </div>
              </div>
            )}
            {toName && (
              <div className="gh-portal-gift-checkout-card-detail">
                <div className="gh-portal-gift-checkout-card-detail-label mb-[-5px] text-12 text-white/80">
                  {t('To')}
                </div>
                <div className="gh-portal-gift-checkout-card-detail-value text-13 font-medium [overflow-wrap:anywhere] text-white">
                  {toName}
                </div>
              </div>
            )}
            {fromName && (
              <div className="gh-portal-gift-checkout-card-detail">
                <div className="gh-portal-gift-checkout-card-detail-label mb-[-5px] text-12 text-white/80">
                  {t('From')}
                </div>
                <div className="gh-portal-gift-checkout-card-detail-value text-13 font-medium [overflow-wrap:anywhere] text-white">
                  {fromName}
                </div>
              </div>
            )}
            {giftValue && (
              <div className="gh-portal-gift-checkout-card-detail">
                <div className="gh-portal-gift-checkout-card-detail-label mb-[-5px] text-12 text-white/80">
                  {t('Gift value')}
                </div>
                <div
                  className="gh-portal-gift-checkout-card-detail-value text-13 font-medium [overflow-wrap:anywhere] text-white"
                  data-testid="gift-card-value"
                >
                  {giftValue}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="gh-portal-gift-checkout-card-site relative mt-auto flex items-center justify-center gap-2 px-7 py-4 before:absolute before:inset-0 before:z-[1] before:bg-white before:content-['']">
          {siteIcon && (
            <img
              className="gh-portal-gift-checkout-card-site-icon relative z-[3] size-[22px] object-cover"
              src={siteIcon}
              alt=""
            />
          )}
          <span className="gh-portal-gift-checkout-card-site-name relative z-[3] text-14 font-semibold tracking-[-0.01em] text-black">
            {siteTitle}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GiftCard;
