import {t} from '../../utils/i18n';

const GiftCard = ({cardRef, duration, tierName, name, giftValue, siteIcon, siteTitle}) => {
    const hasMeta = duration && tierName;
    const hasDetails = name || giftValue;

    return (
        <div className='gh-portal-gift-checkout-card-frame'>
            <div ref={cardRef} className='gh-portal-gift-checkout-card'>
                <div className='gh-portal-gift-checkout-card-notch' aria-hidden='true' />
                {hasMeta && (
                    <div className='gh-portal-gift-checkout-card-meta'>
                        <div className='gh-portal-gift-checkout-card-duration'>{duration}</div>
                        <div className='gh-portal-gift-checkout-card-tier'>{t('{tierName} membership', {tierName})}</div>
                    </div>
                )}
                {hasDetails && (
                    <div className='gh-portal-gift-checkout-card-details'>
                        {name && (
                            <div className='gh-portal-gift-checkout-card-detail'>
                                <div className='gh-portal-gift-checkout-card-detail-label'>{t('Name')}</div>
                                <div className='gh-portal-gift-checkout-card-detail-value'>{name}</div>
                            </div>
                        )}
                        {giftValue && (
                            <div className='gh-portal-gift-checkout-card-detail'>
                                <div className='gh-portal-gift-checkout-card-detail-label'>{t('Gift value')}</div>
                                <div className='gh-portal-gift-checkout-card-detail-value'>{giftValue}</div>
                            </div>
                        )}
                    </div>
                )}
                <div className='gh-portal-gift-checkout-card-site'>
                    {siteIcon && (
                        <img className='gh-portal-gift-checkout-card-site-icon' src={siteIcon} alt='' />
                    )}
                    <span className='gh-portal-gift-checkout-card-site-name'>{siteTitle}</span>
                </div>
            </div>
        </div>
    );
};

export default GiftCard;
