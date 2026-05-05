import {useContext, useEffect, useState} from 'react';
import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import InputForm from '../common/input-form';
import {ValidateInputForm} from '../../utils/form';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {getGiftDurationLabel, getGiftRedemptionErrorMessage} from '../../utils/gift-redemption-notification';
import {t} from '../../utils/i18n';
import {hasGiftSubscriptions, removePortalLinkFromUrl} from '../../utils/helpers';
import useCardTilt from '../../utils/use-card-tilt';

export const GiftRedemptionStyles = `
.gh-portal-gift-redemption-form {
    margin-top: 24px;
}

.gh-portal-gift-redemption-form + .gh-portal-gift-checkout-cta {
    margin-top: 16px;
}
`;

const ChevronIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"/>
    </svg>
);

// TODO: Add translation strings once copy has been finalised
const GiftRedemptionPage = () => {
    const {action, brandColor, doAction, member, pageData, site} = useContext(AppContext);
    const gift = pageData?.gift;
    const isLoggedIn = !!member;
    const giftSubscriptionsEnabled = hasGiftSubscriptions({site});
    const [name, setName] = useState(member?.name || '');
    const [email, setEmail] = useState(member?.email || '');
    const [errors, setErrors] = useState({});
    const [showDetails, setShowDetails] = useState(false);
    const {cardRef, containerProps: cardTiltProps} = useCardTilt();

    useEffect(() => {
        setName(member?.name || '');
        setEmail(member?.email || '');
        setErrors({});
    }, [member?.email, member?.name]);

    useEffect(() => {
        if (giftSubscriptionsEnabled) {
            return;
        }

        removePortalLinkFromUrl();
        doAction('closePopup');
    }, [doAction, giftSubscriptionsEnabled]);

    useEffect(() => {
        if (!giftSubscriptionsEnabled || gift) {
            return;
        }

        doAction('openNotification', {
            action: 'giftRedemption:failed',
            status: 'error',
            autoHide: false,
            closeable: true,
            message: getGiftRedemptionErrorMessage()
        });
        doAction('closePopup');
    }, [doAction, gift, giftSubscriptionsEnabled]);

    if (!giftSubscriptionsEnabled || !gift) {
        return null;
    }

    const formFields = [
        {
            type: 'text',
            value: name,
            placeholder: t('Jamie Larson'),
            label: t('Your name'),
            name: 'name',
            required: false,
            errorMessage: errors.name || '',
            tabIndex: 1,
            autoFocus: !email
        },
        {
            type: 'email',
            value: email,
            placeholder: t('jamie@example.com'),
            label: t('Your email'),
            name: 'email',
            required: true,
            errorMessage: errors.email || '',
            tabIndex: 2,
            autoFocus: !!email
        }
    ];

    const handleFieldChange = (event, field) => {
        setErrors(currentErrors => ({
            ...currentErrors,
            [field.name]: ''
        }));

        if (field.name === 'name') {
            setName(event.target.value);
        }

        if (field.name === 'email') {
            setEmail(event.target.value);
        }
    };

    const handleKeyDown = (event) => {
        if (event.keyCode === 13) {
            if (isRedeeming) {
                return;
            }

            handleRedeemClick(event);
        }
    };

    const handleRedeemClick = (event) => {
        event.preventDefault();

        if (isRedeeming) {
            return;
        }

        if (isLoggedIn) {
            doAction('redeemGift', {
                giftToken: pageData?.token
            });
            return;
        }

        const formErrors = ValidateInputForm({fields: formFields});
        const hasErrors = Object.values(formErrors).some(errorMessage => !!errorMessage);

        setErrors(formErrors);

        if (hasErrors) {
            return;
        }

        doAction('redeemGift', {
            email,
            name,
            giftToken: pageData?.token
        });
    };

    const isRedeeming = action === 'redeemGift:running';
    const buttonLabel = isRedeeming
        ? 'Redeeming gift...' // TODO: Add translation strings once copy has been finalised
        : 'Redeem your membership'; // TODO: Add translation strings once copy has been finalised
    const siteIcon = site?.icon;
    const siteTitle = site?.title || '';
    const headerText = siteTitle
        ? `You've been gifted a membership to ${siteTitle}`
        : 'You\'ve been gifted a membership';
    const benefits = gift.tier.benefits || [];

    return (
        <>
            <CloseButton />
            <div className='gh-portal-content giftRedemption'>
                <div className='gh-portal-gift-checkout'>
                    <div className='gh-portal-gift-checkout-left'>
                        <div className='gh-portal-gift-checkout-bg' aria-hidden='true' />
                        <div className='gh-portal-gift-checkout-inner'>
                            <header className='gh-portal-gift-checkout-header'>
                                {/* eslint-disable-next-line i18next/no-literal-string -- copy not yet finalised */}
                                <h1 className='gh-portal-main-title'>A gift, just for you</h1>
                                <p className='gh-portal-gift-checkout-subtitle'>{headerText}</p>
                            </header>

                            {!isLoggedIn && (
                                <div className='gh-portal-gift-redemption-form'>
                                    <InputForm fields={formFields} onChange={handleFieldChange} onKeyDown={handleKeyDown} />
                                </div>
                            )}

                            <ActionButton
                                brandColor={brandColor}
                                classes='gh-portal-gift-checkout-cta'
                                label={buttonLabel}
                                onClick={handleRedeemClick}
                                style={{width: '100%'}}
                                disabled={isRedeeming}
                                isRunning={isRedeeming}
                            />
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
                                    <div className='gh-portal-gift-checkout-card-meta'>
                                        <div className='gh-portal-gift-checkout-card-duration'>{getGiftDurationLabel(gift)}</div>
                                        <div className='gh-portal-gift-checkout-card-tier'>{gift.tier.name}</div>
                                    </div>
                                    <div className='gh-portal-gift-checkout-card-ribbon-h' />
                                    <div className='gh-portal-gift-checkout-card-ribbon-v' />
                                    <svg className='gh-portal-gift-checkout-card-bow' viewBox='78 -2 90 86' xmlns='http://www.w3.org/2000/svg' aria-hidden='true' fill='currentColor' fillRule='evenodd' clipRule='evenodd'>
                                        <path d='M144.97 1.01186C147.471 0.122129 150.26 -0.292891 153.133 0.229636C156.058 0.761757 158.682 2.19718 160.872 4.38686C165.524 9.03938 166.185 14.9291 164.582 20.2384C163.08 25.217 159.616 29.8398 155.649 33.6447C150.07 38.996 142.324 43.8128 134.494 46.1457L156.801 73.8234L147.457 81.3546L122.879 50.8595L98.3012 81.3546L88.9574 73.8234L111.19 46.2384C103.253 43.9422 95.374 39.0677 89.7201 33.6447C85.7534 29.8398 82.2893 25.2169 80.7865 20.2384C79.1841 14.9291 79.8451 9.03938 84.4975 4.38686C86.6872 2.19723 89.3105 0.761751 92.2358 0.229636C95.1087 -0.292854 97.8981 0.122143 100.399 1.01186C105.26 2.74162 109.666 6.47713 113.237 10.6242C116.925 14.9077 120.297 20.3226 122.684 25.9962C125.071 20.3224 128.444 14.9078 132.132 10.6242C135.703 6.4771 140.109 2.74161 144.97 1.01186ZM96.3764 12.3175C95.3995 11.97 94.7641 11.9671 94.3832 12.0363C94.0547 12.0961 93.5929 12.2622 92.9828 12.8722C92.0356 13.8195 91.6948 14.8501 92.2748 16.7716C92.9549 19.0242 94.8576 21.9447 98.0268 24.9845C102.298 29.0813 107.807 32.4111 112.93 34.1994C111.244 28.8435 108.061 23.0037 104.144 18.4542C101.24 15.0821 98.471 13.063 96.3764 12.3175ZM150.986 12.0363C150.605 11.9671 149.97 11.9699 148.993 12.3175C146.898 13.063 144.129 15.082 141.225 18.4542C137.308 23.0037 134.125 28.8434 132.439 34.1994C137.562 32.4111 143.071 29.0813 147.342 24.9845C150.511 21.9446 152.414 19.0242 153.094 16.7716C153.674 14.8501 153.333 13.8195 152.386 12.8722C151.776 12.2622 151.314 12.0961 150.986 12.0363Z' />
                                    </svg>
                                </div>
                            </div>

                            {benefits.length > 0 && (
                                <>
                                    <div
                                        className='gh-portal-gift-checkout-details'
                                        data-open={showDetails}
                                        aria-hidden={!showDetails}
                                    >
                                        <div className='gh-portal-gift-checkout-details-inner'>
                                            <div className='gh-portal-gift-checkout-benefits'>
                                                {benefits.map((benefit, index) => {
                                                    const benefitName = typeof benefit === 'string' ? benefit : benefit?.name;
                                                    const benefitKey = typeof benefit === 'string' ? benefit : benefit?.id || `gift-benefit-${index}`;

                                                    if (!benefitName) {
                                                        return null;
                                                    }

                                                    return (
                                                        <div className='gh-portal-gift-checkout-benefit' key={benefitKey}>
                                                            <CheckmarkIcon alt='' />
                                                            <span>{benefitName}</span>
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
                                        {/* eslint-disable-next-line i18next/no-literal-string -- copy not yet finalised */}
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

export default GiftRedemptionPage;
