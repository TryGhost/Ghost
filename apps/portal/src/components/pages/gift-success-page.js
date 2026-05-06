import {useContext, useState} from 'react';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import copyTextToClipboard from '../../utils/copy-to-clipboard';
import {getAvailableProducts} from '../../utils/helpers';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import useCardTilt from '../../utils/use-card-tilt';

// TODO: wrap strings with t() once copy is finalised
/* eslint-disable i18next/no-literal-string */

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

const ChevronIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"/>
    </svg>
);

function getDurationLabel(cadence) {
    return cadence === 'month' ? '1 month' : '1 year';
}

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
                                <h1 className='gh-portal-main-title'>Your gift is ready!</h1>
                                <p className='gh-portal-gift-checkout-subtitle'>
                                    Send the link below to share it with whoever you&apos;d like.
                                </p>
                            </header>

                            <div className='gh-portal-gift-checkout-section'>
                                <div className='gh-portal-gift-checkout-label'>Shareable link</div>
                                <div className='gh-portal-gift-success-link'>
                                    <span className='gh-portal-gift-success-link-url'>{redeemUrl}</span>
                                    <button className='gh-portal-gift-success-copy' onClick={handleCopy} type='button'>
                                        {copied ? <CheckIcon /> : <CopyIcon />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            <p className='gh-portal-gift-success-footer'>
                                Not ready to share? We&apos;ve also emailed a copy to your inbox.
                            </p>
                        </div>
                    </div>

                    <div className='gh-portal-gift-checkout-right' {...cardTiltProps}>
                        <div className='gh-portal-gift-checkout-right-panel'>
                            <div className='gh-portal-gift-checkout-card-stack' data-revealing={showDetails}>
                                <div className='gh-portal-gift-checkout-card-frame'>
                                    <div ref={cardRef} className='gh-portal-gift-checkout-card'>
                                        <div className='gh-portal-gift-checkout-card-site'>
                                            {siteIcon && (
                                                <img className='gh-portal-gift-checkout-card-site-icon' src={siteIcon} alt='' />
                                            )}
                                            <span className='gh-portal-gift-checkout-card-site-name'>{siteTitle}</span>
                                        </div>
                                        {tier && cadence && (
                                            <div className='gh-portal-gift-checkout-card-meta'>
                                                <div className='gh-portal-gift-checkout-card-duration'>{getDurationLabel(cadence)}</div>
                                                <div className='gh-portal-gift-checkout-card-tier'>{`${tier.name} membership`}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {tier && tier.benefits && tier.benefits.length > 0 && (
                                    <>
                                        <div
                                            className='gh-portal-gift-checkout-details'
                                            data-open={showDetails}
                                            aria-hidden={!showDetails}
                                        >
                                            <div className='gh-portal-gift-checkout-details-inner'>
                                                <div className='gh-portal-gift-checkout-benefits'>
                                                    {tier.benefits.map((benefit, idx) => {
                                                        const key = benefit?.id || `benefit-${idx}`;
                                                        return (
                                                            <div className='gh-portal-gift-checkout-benefit' key={key}>
                                                                <CheckmarkIcon alt='' />
                                                                <span>{benefit.name}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type='button'
                                            className={'gh-portal-gift-checkout-details-toggle' + (showDetails ? ' is-open' : '')}
                                            onClick={() => setShowDetails(s => !s)}
                                            aria-expanded={showDetails}
                                        >
                                            {showDetails ? 'Hide details' : 'Gift details'}
                                            <ChevronIcon />
                                        </button>
                                    </>
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
