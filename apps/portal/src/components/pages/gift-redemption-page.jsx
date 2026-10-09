import Interpolate from '@doist/react-interpolate';
import { useContext, useEffect, useState } from 'react';
import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import GiftCard from '../common/gift-card';
import GiftDetailsToggle from '../common/gift-details-toggle';
import InputForm from '../common/input-form';
import { ValidateInputForm } from '../../utils/form';
import { getSiteDateString } from '../../utils/date-time';
import {
  getGiftDurationLabel,
  getGiftIntroduction,
  getGiftRedemptionErrorMessage,
} from '../../utils/gift-redemption-notification';
import { t } from '../../utils/i18n';
import useCardTilt from '../../utils/use-card-tilt';
import { giftCheckoutRightClasses } from '../shared-classes';

const GiftRedemptionPage = () => {
  const { action, brandColor, doAction, member, pageData, site } = useContext(AppContext);
  const gift = pageData?.gift;
  const isLoggedIn = !!member;
  const [name, setName] = useState(gift?.recipient_name || member?.name || '');
  const [email, setEmail] = useState(member?.email || gift?.recipient_email || '');
  const [errors, setErrors] = useState({});
  const [showDetails, setShowDetails] = useState(false);
  const { cardRef, containerProps: cardTiltProps } = useCardTilt();

  useEffect(() => {
    // Prefill with the recipient name the buyer entered, so the gift card
    // is personal before the recipient types anything.
    setName(gift?.recipient_name || member?.name || '');
    setEmail(member?.email || gift?.recipient_email || '');
    setErrors({});
  }, [member?.email, member?.name, gift?.recipient_email, gift?.recipient_name]);

  useEffect(() => {
    if (gift) {
      return;
    }

    doAction('openNotification', {
      action: 'giftRedemption:failed',
      status: 'error',
      autoHide: false,
      closeable: true,
      message: getGiftRedemptionErrorMessage({ code: 'GIFT_NOT_FOUND' }),
    });
    doAction('closePopup');
  }, [doAction, gift]);

  if (!gift) {
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
      // If the buyer already supplied the recipient's name, land the cursor
      // on the email — the one field they still need to fill.
      autoFocus: !name && !email,
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
      autoFocus: !!email || (!!name && !email),
    },
  ];

  const handleFieldChange = (event, field) => {
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field.name]: '',
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
        giftToken: pageData?.token,
      });
      return;
    }

    const formErrors = ValidateInputForm({ fields: formFields });
    const hasErrors = Object.values(formErrors).some((errorMessage) => !!errorMessage);

    setErrors(formErrors);

    if (hasErrors) {
      return;
    }

    doAction('redeemGift', {
      email,
      name,
      giftToken: pageData?.token,
    });
  };

  const isRedeeming = action === 'redeemGift:running';
  const buttonLabel = isRedeeming ? t('Redeeming...') : t('Redeem your gift');
  const siteIcon = site?.icon;
  const siteTitle = site?.title || '';
  const buyerName = gift.buyer_name || '';
  const tierName = gift.tier.name;
  const giftDetails = {
    buyerName: <strong>{buyerName}</strong>,
    duration: gift.duration,
    strong: <strong />,
    tierName: <strong>{tierName}</strong>,
    siteTitle,
  };
  const headerText = getGiftIntroduction({
    buyerName,
    cadence: gift.cadence,
    duration: gift.duration,
    siteTitle,
  });
  const expiryLabel = gift.expires_at
    ? getSiteDateString(gift.expires_at, { locale: site?.locale, timezone: site?.timezone })
    : '';
  const benefits = gift.tier.benefits || [];
  const tierDescription = gift.tier.description || '';

  return (
    <>
      <div className="giftRedemption relative scrollbar-none min-h-screen p-0 ">
        <CloseButton placement="gift" />
        <div className="grid min-h-screen w-full grid-cols-[1fr_1fr] max-md:min-h-0 max-md:grid-cols-[1fr] [&_.gh-portal-btn-primary]:rounded-full [&_.gh-portal-input]:h-12 [&_.gh-portal-input-label]:mb-0 [&_.gh-portal-input-label]:text-14 [&_.gh-portal-input-label]:font-semibold [&_.gh-portal-input-label]:text-gray-900 [&_.gh-portal-input-labelcontainer]:mb-2 [&_.gh-portal-input-labelcontainer]:items-baseline">
          <div className="relative flex items-center justify-center bg-white p-12 max-md:px-6 max-md:pt-8 max-md:pb-6">
            <div className="hidden" aria-hidden="true" />
            <div className="relative z-[1] my-auto flex w-full max-w-[496px] flex-col [&_.gh-portal-gift-checkout-cta]:h-12 [&_.gh-portal-gift-checkout-cta]:font-semibold [&_.gh-portal-gift-redemption-form+.gh-portal-gift-checkout-cta]:mt-4 [&_.gh-portal-gift-redemption-message+.gh-portal-gift-checkout-cta]:mt-6">
              <header className="mb-3">
                <h1 className="mb-2 text-start text-32 leading-[1.15] text-pretty text-black max-sm:text-26">
                  {t('A gift, just for you')}
                </h1>
                <p className="gh-portal-gift-checkout-subtitle m-0 text-15 leading-[1.45em] text-pretty text-gray-900 [&_strong]:font-semibold [&_strong]:text-black">
                  <Interpolate mapping={giftDetails} string={headerText} />
                </p>
              </header>

              {gift.message && (
                <div
                  className="gh-portal-gift-redemption-message mt-6 rounded-lg bg-gray-50 px-5 py-4"
                  data-testid="gift-message"
                >
                  <p className="gh-portal-gift-redemption-message-text mb-0 text-16 leading-[1.5em] [overflow-wrap:anywhere] whitespace-pre-line text-gray-950 italic">
                    &ldquo;{gift.message}&rdquo;
                  </p>
                  {buyerName && (
                    <p className="gh-portal-gift-redemption-message-from mt-2 mb-0 text-14 text-gray-700">
                      &mdash; {buyerName}
                    </p>
                  )}
                </div>
              )}

              {!isLoggedIn && (
                <div className="gh-portal-gift-redemption-form mt-6">
                  <InputForm
                    fields={formFields}
                    onChange={handleFieldChange}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              )}

              <ActionButton
                brandColor={brandColor}
                classes="gh-portal-gift-checkout-cta"
                label={buttonLabel}
                onClick={handleRedeemClick}
                style={{ width: '100%' }}
                disabled={isRedeeming}
                isRunning={isRedeeming}
              />

              {expiryLabel && (
                <p className="gh-portal-gift-checkout-cta-note mt-3 mb-0 text-center text-13 leading-[1.4em] text-gray-700">
                  {t('This gift can only be redeemed once and expires on {expiryDate}.', {
                    expiryDate: expiryLabel,
                  })}
                </p>
              )}
            </div>
          </div>

          <div className={giftCheckoutRightClasses} {...cardTiltProps}>
            <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-[32px] px-12 py-16 [background:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0)_100%),var(--brandcolor)] max-md:rounded-t-none max-md:px-6 max-md:pt-14 max-md:pb-8">
              <div
                className="my-auto flex w-full max-w-[280px] shrink-0 flex-col items-center max-md:max-w-[240px] [&[data-revealing=true]_.gh-portal-gift-checkout-card-frame]:[transform:rotate(3deg)]"
                data-revealing={showDetails}
              >
                <GiftCard
                  cardRef={cardRef}
                  duration={getGiftDurationLabel(gift)}
                  tierName={gift.tier.name}
                  toName={name.trim() || null}
                  fromName={buyerName || null}
                  siteIcon={siteIcon}
                  siteTitle={siteTitle}
                />

                <GiftDetailsToggle
                  description={tierDescription}
                  benefits={benefits}
                  showDetails={showDetails}
                  onToggle={() => setShowDetails((s) => !s)}
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
