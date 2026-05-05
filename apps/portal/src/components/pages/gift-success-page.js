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
                        <div className='gh-portal-gift-checkout-card-stack' data-revealing={showDetails}>
                            <div className='gh-portal-gift-checkout-card-frame'>
                                <div ref={cardRef} className='gh-portal-gift-checkout-card' aria-hidden='true'>
                                    <div className='gh-portal-gift-checkout-card-site'>
                                        {siteIcon && (
                                            <img className='gh-portal-gift-checkout-card-site-icon' src={siteIcon} alt='' />
                                        )}
                                        <span className='gh-portal-gift-checkout-card-site-name'>{siteTitle}</span>
                                    </div>
                                    {tier && cadence && (
                                        <div className='gh-portal-gift-checkout-card-meta'>
                                            <div className='gh-portal-gift-checkout-card-duration'>{getDurationLabel(cadence)}</div>
                                            <div className='gh-portal-gift-checkout-card-tier'>{tier.name}</div>
                                        </div>
                                    )}
                                    <div className='gh-portal-gift-checkout-card-ribbon-h' />
                                    <div className='gh-portal-gift-checkout-card-ribbon-v' />
                                    <svg className='gh-portal-gift-checkout-card-bow' viewBox='78 -2 90 86' xmlns='http://www.w3.org/2000/svg' aria-hidden='true' fill='currentColor' fillRule='evenodd' clipRule='evenodd'>
                                        <path d='M144.97 1.01186C147.471 0.122129 150.26 -0.292891 153.133 0.229636C156.058 0.761757 158.682 2.19718 160.872 4.38686C165.524 9.03938 166.185 14.9291 164.582 20.2384C163.08 25.217 159.616 29.8398 155.649 33.6447C150.07 38.996 142.324 43.8128 134.494 46.1457L156.801 73.8234L147.457 81.3546L122.879 50.8595L98.3012 81.3546L88.9574 73.8234L111.19 46.2384C103.253 43.9422 95.374 39.0677 89.7201 33.6447C85.7534 29.8398 82.2893 25.2169 80.7865 20.2384C79.1841 14.9291 79.8451 9.03938 84.4975 4.38686C86.6872 2.19723 89.3105 0.761751 92.2358 0.229636C95.1087 -0.292854 97.8981 0.122143 100.399 1.01186C105.26 2.74162 109.666 6.47713 113.237 10.6242C116.925 14.9077 120.297 20.3226 122.684 25.9962C125.071 20.3224 128.444 14.9078 132.132 10.6242C135.703 6.4771 140.109 2.74161 144.97 1.01186ZM96.3764 12.3175C95.3995 11.97 94.7641 11.9671 94.3832 12.0363C94.0547 12.0961 93.5929 12.2622 92.9828 12.8722C92.0356 13.8195 91.6948 14.8501 92.2748 16.7716C92.9549 19.0242 94.8576 21.9447 98.0268 24.9845C102.298 29.0813 107.807 32.4111 112.93 34.1994C111.244 28.8435 108.061 23.0037 104.144 18.4542C101.24 15.0821 98.471 13.063 96.3764 12.3175ZM150.986 12.0363C150.605 11.9671 149.97 11.9699 148.993 12.3175C146.898 13.063 144.129 15.082 141.225 18.4542C137.308 23.0037 134.125 28.8434 132.439 34.1994C137.562 32.4111 143.071 29.0813 147.342 24.9845C150.511 21.9446 152.414 19.0242 153.094 16.7716C153.674 14.8501 153.333 13.8195 152.386 12.8722C151.776 12.2622 151.314 12.0961 150.986 12.0363Z' />
                                    </svg>
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
        </>
    );
};

export default GiftSuccessPage;
