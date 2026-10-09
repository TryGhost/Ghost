import AppContext from '../../app-context';
import { useContext } from 'react';
import { t } from '../../utils/i18n';

// Served by Ghost rather than bundled: Portal's UMD build inlines every asset.
const getTextureUrls = (siteUrl) => {
  const base = `${siteUrl.replace(/\/$/, '')}/gift/assets`;
  return [`${base}/gift-card-orb.webp`, `${base}/gift-card-noise.webp`];
};

export const preloadGiftCardTextures = (siteUrl) => {
  getTextureUrls(siteUrl).forEach((url) => {
    new Image().src = url;
  });
};

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
  const { site } = useContext(AppContext);
  const [orbUrl, noiseUrl] = getTextureUrls(site.url);
  const hasMeta = duration && tierName;
  const hasDetails = name || toName || fromName || giftValue;

  return (
    <div className="gh-portal-gift-checkout-card-frame">
      <div
        ref={cardRef}
        className="gh-portal-gift-checkout-card"
        style={{ '--gh-gift-orb': `url("${orbUrl}")`, '--gh-gift-noise': `url("${noiseUrl}")` }}
      >
        <div className="gh-portal-gift-checkout-card-notch" aria-hidden="true" />
        {hasMeta && (
          <div className="gh-portal-gift-checkout-card-meta">
            <div className="gh-portal-gift-checkout-card-duration" data-testid="gift-card-duration">
              {duration}
            </div>
            <div className="gh-portal-gift-checkout-card-tier">
              {t('{tierName} membership', { tierName })}
            </div>
          </div>
        )}
        {hasDetails && (
          <div className="gh-portal-gift-checkout-card-details">
            {name && (
              <div className="gh-portal-gift-checkout-card-detail">
                <div className="gh-portal-gift-checkout-card-detail-label">{t('Name')}</div>
                <div className="gh-portal-gift-checkout-card-detail-value">{name}</div>
              </div>
            )}
            {toName && (
              <div className="gh-portal-gift-checkout-card-detail">
                <div className="gh-portal-gift-checkout-card-detail-label">{t('To')}</div>
                <div className="gh-portal-gift-checkout-card-detail-value">{toName}</div>
              </div>
            )}
            {fromName && (
              <div className="gh-portal-gift-checkout-card-detail">
                <div className="gh-portal-gift-checkout-card-detail-label">{t('From')}</div>
                <div className="gh-portal-gift-checkout-card-detail-value">{fromName}</div>
              </div>
            )}
            {giftValue && (
              <div className="gh-portal-gift-checkout-card-detail">
                <div className="gh-portal-gift-checkout-card-detail-label">{t('Gift value')}</div>
                <div
                  className="gh-portal-gift-checkout-card-detail-value"
                  data-testid="gift-card-value"
                >
                  {giftValue}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="gh-portal-gift-checkout-card-site">
          {siteIcon && (
            <img className="gh-portal-gift-checkout-card-site-icon" src={siteIcon} alt="" />
          )}
          <span className="gh-portal-gift-checkout-card-site-name">{siteTitle}</span>
        </div>
      </div>
    </div>
  );
};

export default GiftCard;
