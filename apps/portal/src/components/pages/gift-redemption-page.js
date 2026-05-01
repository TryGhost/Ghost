import {useContext, useEffect, useState} from 'react';
import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import InputForm from '../common/input-form';
import {ValidateInputForm} from '../../utils/form';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {ReactComponent as GiftIcon} from '../../images/icons/gift.svg';
import {getGiftDurationLabel, getGiftRedemptionErrorMessage} from '../../utils/gift-redemption-notification';
import {t} from '../../utils/i18n';
import {hasGiftSubscriptions, removePortalLinkFromUrl} from '../../utils/helpers';

export const GiftRedemptionStyles = `
    .gh-portal-popup-container.giftRedemption {
        width: calc(100vw - 24px);
        max-width: 500px;
        padding: 0;
        overflow: hidden;
        flex-shrink: 0;
    }

    .gh-portal-popup-container.giftRedemption .gh-portal-closeicon-container {
        position: absolute;
        top: 16px;
        right: 16px;
        z-index: 5;
    }

    html[dir="rtl"] .gh-portal-popup-container.giftRedemption .gh-portal-closeicon-container {
        right: unset;
        left: 18px;
    }

    .gh-portal-popup-container.giftRedemption .gh-portal-closeicon {
        color: rgba(24, 32, 38, 0.14);
    }

    .gh-portal-popup-container.giftRedemption .gh-portal-closeicon:hover {
        color: rgba(24, 32, 38, 0.28);
    }

    .gh-portal-gift-redemption {
        position: relative;
        overflow: hidden;
    }

    .gh-gift-redemption-bg {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 400px;
        background: linear-gradient(180deg, var(--brandcolor), transparent);
        opacity: 0.08;
        pointer-events: none;
        z-index: 0;
    }

    .gh-gift-redemption-panel {
        position: relative;
        z-index: 1;
        padding: 40px 32px 32px;
    }

    .gh-gift-redemption-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        margin: -8px 0 0 -3px;
        color: var(--brandcolor);
    }

    html[dir="rtl"] .gh-gift-redemption-icon {
        margin: -8px -3px 0 0;
    }

    .gh-gift-redemption-icon svg {
        width: 52px;
        height: 52px;
    }

    .gh-gift-redemption-kicker {
        margin-top: 0;
        font-size: 1.3rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        color: var(--brandcolor);
    }

    .gh-gift-redemption-title {
        max-width: none;
        margin: 20px 0 0;
        font-size: 2.4rem;
        font-weight: 700;
        line-height: 1.3;
        letter-spacing: -0.015em;
        text-wrap: pretty;
        color: var(--grey0);
    }

    .gh-gift-redemption-plan {
        margin-top: 8px;
        font-size: 1.5rem;
        color: var(--grey3);
    }

    .gh-gift-redemption-tier {
        font-weight: 700;
    }

    .gh-gift-redemption-cadence {
        font-weight: 400;
    }

    .gh-gift-redemption-benefits {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 20px;
    }

    .gh-gift-redemption-form {
        margin-top: 36px;
    }

    .gh-gift-redemption-inline-cta {
        margin-top: 36px;
    }

    .gh-gift-redemption-benefit {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        color: var(--grey2);
        font-size: 1.45rem;
        line-height: 1.35;
        text-align: left;
    }

    .gh-gift-redemption-benefit svg {
        width: 14px;
        height: 14px;
        margin-top: 3px;
        color: var(--grey1);
        flex-shrink: 0;
    }

    html[dir="rtl"] .gh-gift-redemption-benefit {
        text-align: right;
        flex-direction: row-reverse;
    }

    .gh-gift-redemption-submit {
        width: 100%;
        height: 44px;
        margin-top: 20px;
        font-size: 1.5rem;
        font-weight: 600;
    }

    @media (max-width: 480px) {
        .gh-portal-popup-container.giftRedemption {
            padding: 0 !important;
        }

        .gh-gift-redemption-panel {
            padding: 32px 24px 24px;
        }

        .gh-gift-redemption-title {
            font-size: 2.1rem;
        }

        .gh-gift-redemption-benefit {
            font-size: 1.4rem;
        }

        html[dir="rtl"] .gh-gift-redemption-benefit {
            text-align: right;
        }

        .gh-gift-redemption-bg {
            height: 300px;
        }
    }
`;

// TODO: Add translation strings once copy has been finalised
const GiftRedemptionPage = () => {
    const {action, brandColor, doAction, member, pageData, site} = useContext(AppContext);
    const gift = pageData?.gift;
    const isLoggedIn = !!member;
    const giftSubscriptionsEnabled = hasGiftSubscriptions({site});
    const [name, setName] = useState(member?.name || '');
    const [email, setEmail] = useState(member?.email || '');
    const [errors, setErrors] = useState({});

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
    const siteTitle = site?.title;
    const headerText = siteTitle
        ? `You've been gifted a membership to ${siteTitle}`
        : 'You\'ve been gifted a membership';

    return (
        <div className='gh-portal-content gh-portal-gift-redemption'>
            <CloseButton />
            <div className='gh-gift-redemption-bg' />

            <div className='gh-gift-redemption-panel'>
                <div className='gh-gift-redemption-icon'><GiftIcon /></div>
                <div className='gh-gift-redemption-kicker'>{'Gift membership'}</div>
                <h1 className='gh-gift-redemption-title'>{headerText}</h1>

                <div className='gh-gift-redemption-plan'>
                    <span className='gh-gift-redemption-tier'>{gift.tier.name}</span>
                    <span>&nbsp;&middot;&nbsp;</span>
                    <span className='gh-gift-redemption-cadence'>{getGiftDurationLabel(gift)}</span>
                </div>

                {gift.tier.benefits.length > 0 && (
                    <div className='gh-gift-redemption-benefits'>
                        {gift.tier.benefits.map((benefit, index) => {
                            const benefitName = typeof benefit === 'string' ? benefit : benefit?.name;
                            const benefitKey = typeof benefit === 'string' ? benefit : benefit?.id || `gift-benefit-${index}`;

                            if (!benefitName) {
                                return null;
                            }

                            return (
                                <div className='gh-gift-redemption-benefit' key={benefitKey}>
                                    <CheckmarkIcon />
                                    <span>{benefitName}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {isLoggedIn ? (
                    <div className='gh-gift-redemption-inline-cta'>
                        <ActionButton
                            brandColor={brandColor}
                            classes='gh-gift-redemption-submit'
                            label={buttonLabel}
                            onClick={handleRedeemClick}
                            style={{width: '100%'}}
                            disabled={isRedeeming}
                            isRunning={isRedeeming}
                        />
                    </div>
                ) : (
                    <div className='gh-gift-redemption-form'>
                        <InputForm fields={formFields} onChange={handleFieldChange} onKeyDown={handleKeyDown} />
                        <ActionButton
                            brandColor={brandColor}
                            classes='gh-gift-redemption-submit'
                            label={buttonLabel}
                            onClick={handleRedeemClick}
                            style={{width: '100%'}}
                            disabled={isRedeeming}
                            isRunning={isRedeeming}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default GiftRedemptionPage;
