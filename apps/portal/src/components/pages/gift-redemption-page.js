import {useContext, useEffect, useState} from 'react';
import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import InputForm from '../common/input-form';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {ReactComponent as GiftIcon} from '../../images/icons/gift.svg';
import {getGiftRedemptionErrorMessage} from '../../utils/gift-redemption-notification';
import {t} from '../../utils/i18n';
import {hasGiftSubscriptions, removePortalLinkFromUrl} from '../../utils/helpers';

export const GiftRedemptionStyles = `
    .gh-portal-popup-container.giftRedemption {
        width: calc(100vw - 24px);
        max-width: 452px;
        padding: 0;
        overflow: hidden;
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
        overflow: hidden;
    }

    .gh-gift-redemption-panel {
        position: relative;
        background: var(--white);
    }

    .gh-gift-redemption-summary {
        padding: 32px 32px 28px;
        text-align: center;
        background: #fff5f5;
        border-bottom: 1px solid #f1e7e4;
    }

    .gh-gift-redemption-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        color: var(--brandcolor);
    }

    .gh-gift-redemption-icon svg {
        width: 40px;
        height: 40px;
    }

    .gh-gift-redemption-kicker {
        font-size: 1.15rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brandcolor);
    }

    .gh-gift-redemption-title {
        max-width: none;
        margin: 16px auto 0;
        font-size: 2.25rem;
        font-weight: 800;
        line-height: 1.08;
        letter-spacing: -0.03em;
        white-space: nowrap;
        color: var(--grey0);
    }

    .gh-gift-redemption-plan {
        margin-top: 10px;
        font-size: 1.65rem;
        color: var(--grey2);
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
        max-width: 302px;
        margin: 20px auto 0;
    }

    .gh-gift-redemption-benefit {
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 10px;
        color: var(--grey2);
        font-size: 1.45rem;
        line-height: 1.35;
        text-align: left;
    }

    .gh-gift-redemption-benefit svg {
        width: 14px;
        height: 14px;
        margin-top: 2px;
        color: var(--grey1);
        flex-shrink: 0;
    }

    html[dir="rtl"] .gh-gift-redemption-benefit {
        text-align: right;
        flex-direction: row-reverse;
    }

    .gh-gift-redemption-benefit span {
        display: block;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .gh-gift-redemption-form {
        padding: 22px 28px 28px;
        background: var(--white);
    }

    .gh-gift-redemption-form .gh-portal-input-label {
        margin-bottom: 5px;
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--grey1);
    }

    .gh-gift-redemption-form .gh-portal-input {
        margin-bottom: 14px;
    }

    .gh-gift-redemption-submit {
        width: 100%;
        height: 44px;
        margin-top: 22px;
        font-size: 1.5rem;
        font-weight: 600;
    }

    @media (max-width: 480px) {
        .gh-gift-redemption-summary {
            padding: 28px 24px 24px;
        }

        .gh-gift-redemption-title {
            font-size: 2.1rem;
            white-space: normal;
        }

        .gh-gift-redemption-benefit {
            font-size: 1.4rem;
        }

        html[dir="rtl"] .gh-gift-redemption-benefit {
            text-align: right;
        }

        .gh-gift-redemption-form {
            padding: 20px 20px 22px;
        }
    }
`;

function getGiftCadenceLabel(gift) {
    const {cadence, duration} = gift;

    if (cadence === 'year') {
        return duration === 1 ? t('1 year') : t('{years} years', {years: duration});
    }

    return duration === 1 ? t('1 month') : t('{months} months', {months: duration});
}

// TODO: Add translation strings once copy has been finalised
const GiftRedemptionPage = () => {
    const {brandColor, doAction, member, pageData, site} = useContext(AppContext);
    const gift = pageData?.gift;
    const giftSubscriptionsEnabled = hasGiftSubscriptions({site});
    const [name, setName] = useState(member?.name || '');
    const [email, setEmail] = useState(member?.email || '');

    useEffect(() => {
        setName(member?.name || '');
        setEmail(member?.email || '');
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
            required: true,
            tabIndex: 1,
            autoFocus: true
        },
        {
            type: 'email',
            value: email,
            placeholder: t('jamie@example.com'),
            label: t('Your email'),
            name: 'email',
            required: true,
            tabIndex: 2
        }
    ];

    const handleFieldChange = (event, field) => {
        if (field.name === 'name') {
            setName(event.target.value);
        }

        if (field.name === 'email') {
            setEmail(event.target.value);
        }
    };

    const handleRedeemClick = (event) => {
        event.preventDefault();
    };

    return (
        <div className='gh-portal-content gh-portal-gift-redemption'>
            <CloseButton />

            <div className='gh-gift-redemption-panel'>
                <div className='gh-gift-redemption-summary'>
                    <div className='gh-gift-redemption-icon'><GiftIcon /></div>
                    <div className='gh-gift-redemption-kicker'>{'Gift membership'}</div>
                    <h1 className='gh-gift-redemption-title'>{'You\'ve been gifted a membership'}</h1>

                    <div className='gh-gift-redemption-plan'>
                        <span className='gh-gift-redemption-tier'>{gift.tier.name}</span>
                        <span>&nbsp;&middot;&nbsp;</span>
                        <span className='gh-gift-redemption-cadence'>{getGiftCadenceLabel(gift)}</span>
                    </div>

                    {gift.tier.benefits.length > 0 && (
                        <div className='gh-gift-redemption-benefits'>
                            {gift.tier.benefits.map((benefit, index) => (
                                <div className='gh-gift-redemption-benefit' key={benefit?.id || `gift-benefit-${index}`}>
                                    <CheckmarkIcon />
                                    <span>{benefit.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                <div className='gh-gift-redemption-form'>
                    <InputForm fields={formFields} onChange={handleFieldChange} />
                    <ActionButton
                        brandColor={brandColor}
                        classes='gh-gift-redemption-submit'
                        label={'Redeem gift membership'}
                        onClick={handleRedeemClick}
                        style={{width: '100%'}}
                    />
                </div>
            </div>
        </div>
    );
};

export default GiftRedemptionPage;
