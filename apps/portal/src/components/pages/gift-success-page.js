import {useContext, useState} from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import GiftCard from '../common/gift-card';
import GiftDetailsToggle from '../common/gift-details-toggle';
import copyTextToClipboard from '../../utils/copy-to-clipboard';
import {getAvailableProducts} from '../../utils/helpers';
import {getGiftDurationLabel} from '../../utils/gift-redemption-notification';
import {t} from '../../utils/i18n';
import useCardTilt from '../../utils/use-card-tilt';
import {formatGiftValue} from './gift-page';

export const GiftSuccessStyle = `
.gh-portal-gift-success-link {
    display: flex;
    align-items: center;
    height: 56px;
    background: color-mix(in srgb, var(--brandcolor) 8%, var(--white));
    border-radius: 999px;
    padding: 4px 8px 4px 24px;
    gap: 8px;
}

.gh-portal-gift-success-link-url {
    flex: 1;
    font-size: 1.6rem;
    font-weight: 400;
    color: var(--brandcolor);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: all;
}

.gh-portal-gift-success-copy {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    padding: 0 18px;
    background: var(--brandcolor);
    color: var(--white);
    border: none;
    border-radius: 999px;
    font-size: 1.4rem;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.15s ease;
    will-change: opacity;
}

.gh-portal-gift-success-copy:hover {
    opacity: 0.9;
}

.gh-portal-gift-success-copy svg {
    width: 14px;
    height: 14px;
}

.gh-portal-gift-success-footer {
    margin-top: 24px;
    margin-bottom: 0;
    font-size: 1.4rem;
    color: var(--grey6);
    line-height: 1.5;
}
`;

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

const GiftSuccessPage = () => {
    const {site, pageData} = useContext(AppContext);
    const [copied, setCopied] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const {cardRef, containerProps: cardTiltProps} = useCardTilt();

    const token = pageData?.token;
    const tierId = pageData?.tierId;
    const cadence = pageData?.cadence;
    const siteUrl = site?.url || '';
    const siteIcon = site?.icon;
    const siteTitle = site?.title || '';
    const redeemUrl = `${siteUrl.replace(/\/$/, '')}/gift/${token}`;

    const products = getAvailableProducts({site}).filter(p => p.type === 'paid');
    const tier = tierId ? products.find(p => p.id === tierId) : null;

    const handleCopy = () => {
        copyTextToClipboard(redeemUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            <CloseButton />
            <div className='gh-portal-content giftSuccess'>
                <div className='gh-portal-gift-checkout'>
                    <div className='gh-portal-gift-checkout-left'>
                        <div className='gh-portal-gift-checkout-bg' aria-hidden='true' />
                        <div className='gh-portal-gift-checkout-inner'>
                            <header className='gh-portal-gift-checkout-header'>
                                <h1 className='gh-portal-main-title'>{t('Your gift is ready!')}</h1>
                                <p className='gh-portal-gift-checkout-subtitle'>
                                    {t('Send the link below to share it with whoever you\'d like.')}
                                </p>
                            </header>

                            <div className='gh-portal-gift-checkout-section'>
                                <div className='gh-portal-gift-success-link'>
                                    <span className='gh-portal-gift-success-link-url'>{redeemUrl}</span>
                                    <button className='gh-portal-gift-success-copy' onClick={handleCopy} type='button'>
                                        {copied ? <CheckIcon /> : <CopyIcon />}
                                        {copied ? t('Copied') : t('Copy')}
                                    </button>
                                </div>
                            </div>

                            <p className='gh-portal-gift-success-footer'>
                                {t('Not ready to share? We\'ve also emailed a copy to your inbox.')}
                            </p>
                        </div>
                    </div>

                    <div className='gh-portal-gift-checkout-right' {...cardTiltProps}>
                        <div className='gh-portal-gift-checkout-right-panel'>
                            <div className='gh-portal-gift-checkout-card-stack' data-revealing={showDetails}>
                                <GiftCard
                                    cardRef={cardRef}
                                    duration={tier && cadence ? getGiftDurationLabel({cadence, duration: 1}) : null}
                                    tierName={tier && cadence ? tier.name : null}
                                    giftValue={tier && cadence ? formatGiftValue(cadence === 'month' ? tier.monthlyPrice : tier.yearlyPrice) : null}
                                    siteIcon={siteIcon}
                                    siteTitle={siteTitle}
                                />

                                {tier && (
                                    <GiftDetailsToggle
                                        description={tier.description}
                                        benefits={tier.benefits}
                                        showDetails={showDetails}
                                        onToggle={() => setShowDetails(s => !s)}
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
