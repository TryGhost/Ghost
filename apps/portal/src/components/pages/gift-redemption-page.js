import {useContext, useEffect, useState} from 'react';
import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import GiftCard from '../common/gift-card';
import GiftDetailsToggle from '../common/gift-details-toggle';
import InputForm from '../common/input-form';
import {ValidateInputForm} from '../../utils/form';
import {getGiftDurationLabel, getGiftRedemptionErrorMessage} from '../../utils/gift-redemption-notification';
import {t} from '../../utils/i18n';
import {hasGiftSubscriptions, removePortalLinkFromUrl} from '../../utils/helpers';
import useCardTilt from '../../utils/use-card-tilt';
import {formatGiftValue} from './gift-page';

export const GiftRedemptionStyles = `
.gh-portal-gift-redemption-form {
    margin-top: 24px;
}

.gh-portal-gift-redemption-form + .gh-portal-gift-checkout-cta {
    margin-top: 16px;
}
`;

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
        ? t('Redeeming...')
        : t('Redeem your membership');
    const siteIcon = site?.icon;
    const siteTitle = site?.title || '';
    const headerText = siteTitle
        ? t('You\'ve been gifted a membership to {siteTitle}', {siteTitle})
        : t('You\'ve been gifted a membership');
    const benefits = gift.tier.benefits || [];
    const tierDescription = gift.tier.description || '';

    return (
        <>
            <CloseButton />
            <div className='gh-portal-content giftRedemption'>
                <div className='gh-portal-gift-checkout'>
                    <div className='gh-portal-gift-checkout-left'>
                        <div className='gh-portal-gift-checkout-bg' aria-hidden='true' />
                        <div className='gh-portal-gift-checkout-inner'>
                            <header className='gh-portal-gift-checkout-header'>
                                <h1 className='gh-portal-main-title'>{t('A gift, just for you')}</h1>
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
                        <div className='gh-portal-gift-checkout-right-panel'>
                            <div className='gh-portal-gift-checkout-card-stack' data-revealing={showDetails}>
                                <GiftCard
                                    cardRef={cardRef}
                                    duration={getGiftDurationLabel(gift)}
                                    tierName={gift.tier.name}
                                    name={name.trim() || null}
                                    giftValue={formatGiftValue(gift)}
                                    siteIcon={siteIcon}
                                    siteTitle={siteTitle}
                                />

                                <GiftDetailsToggle
                                    description={tierDescription}
                                    benefits={benefits}
                                    showDetails={showDetails}
                                    onToggle={() => setShowDetails(s => !s)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default GiftRedemptionPage;
