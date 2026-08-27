import { useContext, useEffect, useRef, useState } from 'react';
import AppContext from '../../app-context';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import SiteTitleBackButton from '../common/site-title-back-button';
import LoadingPage from './loading-page';
import { isCookiesDisabled } from '../../utils/helpers';
import { addCalendarDays, getDateInputValue } from '../../utils/date-time';
import {
  type GiftDuration,
  type GiftProduct,
  type Site,
  getActiveGiftDuration,
  getAvailableGiftDurations,
  getGiftPrice,
  getGiftProducts,
} from '../../utils/gift-subscriptions';
import { getGiftDurationAttributiveLabel } from '../../utils/gift-redemption-notification';
import { ValidateInputForm } from '../../utils/form';
import { t } from '../../utils/i18n';
import useCardTilt from '../../utils/use-card-tilt';
import { formatGiftValue } from './gift-page';
import GiftDeliveryStep from './beta-gift/delivery-step';
import GiftPlanStep from './beta-gift/plan-step';
import GiftPreviewPanel from './beta-gift/preview-panel';
import type {
  GiftDeliveryMethod,
  GiftCadenceDuration,
  GiftFormErrors,
  GiftInputField,
  GiftStep,
} from './beta-gift/types';

const validateInputForm = ValidateInputForm as unknown as (data: {
  fields: GiftInputField[];
}) => GiftFormErrors;

const GIFT_EMAIL_MAX_LENGTH = 191;
const GIFT_NAME_MAX_LENGTH = 191;
const GIFT_MESSAGE_MAX_LENGTH = 250;
// Mirrors GIFT_MAX_SCHEDULE_DAYS in ghost/core's gifts constants — change them together.
const GIFT_MAX_SCHEDULE_DAYS = 365;

interface GiftPageMember {
  name?: string;
}

interface GiftPageContext {
  action: string;
  brandColor: string | undefined;
  doAction: (action: string, data?: Record<string, unknown>) => void;
  lastPage: string | null;
  member: GiftPageMember | null;
  site: Site | null;
}

function getTierPriceLabel(product: GiftProduct, months: GiftDuration) {
  return formatGiftValue(getGiftPrice(product, months));
}

const BetaGiftPage = () => {
  const { site, member, brandColor, action, doAction, lastPage } = useContext(
    AppContext,
  ) as GiftPageContext;
  const [step, setStep] = useState<GiftStep>('plan');
  const [selectedDuration, setSelectedDuration] = useState<GiftDuration | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [buyerName, setBuyerName] = useState(member?.name || '');
  const [giftMessage, setGiftMessage] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<GiftDeliveryMethod>('email');
  // null means untouched: the effective date then tracks "today" in the site's timezone on every
  // render, so an untouched form still means "send now" after the page sits open across midnight.
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);
  const [errors, setErrors] = useState<GiftFormErrors>({});
  const { cardRef, containerProps: cardTiltProps } = useCardTilt();

  // Prefill the "from" name once the logged-in member loads, without clobbering anything the buyer
  // has already typed.
  useEffect(() => {
    setBuyerName((current) => current || member?.name || '');
  }, [member?.name]);

  // Anchors us to the popup's real (iframe) document for scroll control.
  const contentRef = useRef<HTMLDivElement>(null);

  // Moving between the plan and delivery steps swaps a full screen of content, so reset the popup
  // scroll to the top. Portal renders inside a react-frame-component iframe, so the global document
  // here is the parent; reach the popup via the rendered node's own document instead.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const node = contentRef.current;
      const doc = node?.ownerDocument;
      if (!doc) {
        return;
      }
      const view = doc.defaultView;
      doc
        .querySelectorAll<HTMLElement>('.gh-portal-popup-wrapper, .gh-portal-popup-container')
        .forEach((element) => {
          element.scrollTop = 0;
        });
      // Fallback: walk ancestors and reset whichever one actually scrolls.
      for (let element = node.parentElement; element; element = element.parentElement) {
        const overflowY = view?.getComputedStyle(element).overflowY;
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          element.scrollHeight > element.clientHeight
        ) {
          element.scrollTop = 0;
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [step]);

  if (!site) {
    return <LoadingPage />;
  }

  const { portal_default_plan: portalDefaultPlan } = site;
  const offeredDurations = getAvailableGiftDurations({ site });
  const activeDuration = getActiveGiftDuration({
    availableDurations: offeredDurations,
    portalDefaultPlan: portalDefaultPlan ?? null,
    selectedDuration,
  });
  const products = activeDuration ? getGiftProducts({ site, duration: activeDuration }) : [];

  const siteIcon = site.icon;
  const siteTitle = site.title || '';
  if (!activeDuration || products.length === 0) {
    return (
      <div className="gh-portal-content gift">
        <CloseButton />
        <div className="gh-portal-gift-checkout">
          <div className="gh-portal-gift-checkout-left">
            <div aria-hidden="true" className="gh-portal-gift-checkout-bg" />
            <div className="gh-portal-gift-checkout-inner">
              <header className="gh-portal-gift-checkout-header">
                <h1 className="gh-portal-main-title">{t('Gift a membership')}</h1>
                <p className="gh-portal-gift-checkout-subtitle">
                  {t('Gift subscriptions are not available right now.')}
                </p>
              </header>
            </div>
          </div>
          <div aria-hidden="true" className="gh-portal-gift-checkout-right" />
        </div>
      </div>
    );
  }

  const activeProduct = products.find((product) => product.id === selectedProductId) || products[0];
  if (!activeProduct) {
    return null;
  }

  const isSingleTier = products.length === 1;
  const emailDuration: GiftCadenceDuration =
    activeDuration === 12
      ? { cadence: 'year', duration: 1 }
      : { cadence: 'month', duration: activeDuration };
  // This use sits in front of a noun ("6 month membership"), so this is the attributive form. The
  // picker and the gift card face use the standalone one ("6 months").
  const activeDurationLabel = getGiftDurationAttributiveLabel(emailDuration);
  const isPurchasing = action === 'checkoutGift:running';
  const hasErrors =
    step === 'plan'
      ? !!(errors.email || errors.buyerName)
      : !!(errors.recipientEmail || errors.deliveryDate);
  const isDisabled = isCookiesDisabled() || isPurchasing || hasErrors;
  const isLoggedIn = !!member;
  const showBuyerName = !(member?.name || '').trim();
  const showBuyerEmail = !isLoggedIn;
  // On the delivery step the email being composed is the more useful thing to show than the gift
  // card. The card stays for the plan step and for "I'll share it myself".
  const showEmailPreview = step === 'delivery' && deliveryMethod === 'email';
  const minDeliveryDate = getDateInputValue(new Date(), site.timezone);
  const maxDeliveryDate = addCalendarDays(minDeliveryDate, GIFT_MAX_SCHEDULE_DAYS);
  const effectiveDeliveryDate = deliveryDate ?? minDeliveryDate;

  const emailField: GiftInputField = {
    type: 'email',
    value: email,
    placeholder: t('jamie@example.com'),
    label: t('Your email'),
    name: 'email',
    required: true,
    maxLength: GIFT_EMAIL_MAX_LENGTH,
    errorMessage: errors.email || '',
  };

  const recipientEmailField: GiftInputField = {
    type: 'email',
    value: recipientEmail,
    placeholder: t('taylor@example.com'),
    label: t("Recipient's email"),
    name: 'recipientEmail',
    required: false,
    maxLength: GIFT_EMAIL_MAX_LENGTH,
    errorMessage: errors.recipientEmail || '',
  };

  const buyerNameField: GiftInputField = {
    type: 'text',
    value: buyerName,
    placeholder: t('Jamie Larson'),
    label: t('Your name'),
    name: 'buyerName',
    required: false,
    maxLength: GIFT_NAME_MAX_LENGTH,
    errorMessage: errors.buyerName || '',
  };

  const recipientNameField: GiftInputField = {
    type: 'text',
    value: recipientName,
    placeholder: t('Taylor Reid'),
    label: t("Recipient's name"),
    name: 'recipientName',
    required: false,
    maxLength: GIFT_NAME_MAX_LENGTH,
    errorMessage: '',
  };

  const handleEmailChange = (value: string) => {
    setErrors((currentErrors) => ({ ...currentErrors, email: '' }));
    setEmail(value);
  };

  const handleBuyerNameChange = (value: string) => {
    setErrors((currentErrors) => ({ ...currentErrors, buyerName: '' }));
    setBuyerName(value);
  };

  const handleRecipientEmailChange = (value: string) => {
    setErrors((currentErrors) => ({
      ...currentErrors,
      recipientEmail: '',
      deliveryDate: '',
    }));
    setRecipientEmail(value);
  };

  const handleDeliveryMethodChange = (method: GiftDeliveryMethod) => {
    setErrors((currentErrors) => ({
      ...currentErrors,
      recipientEmail: '',
      deliveryDate: '',
    }));
    setDeliveryMethod(method);
  };

  const handleDeliveryDateChange = (nextDate: string) => {
    setErrors((currentErrors) => ({ ...currentErrors, deliveryDate: '' }));
    // Store today as null so "send now" keeps tracking the site day across midnight; a typed past
    // date stays put for validation to call out.
    setDeliveryDate(nextDate === minDeliveryDate ? null : nextDate);
  };

  const handleContinueToDelivery = () => {
    if (!isLoggedIn) {
      const formErrors = validateInputForm({
        fields: [{ ...emailField, value: email.trim() }],
      });
      const formHasErrors = Object.values(formErrors).some((errorMessage) => !!errorMessage);

      setErrors(formErrors);

      if (formHasErrors) {
        return;
      }
    }
    setStep('delivery');
  };

  const handleBackToPlan = () => {
    setErrors({});
    setStep('plan');
  };

  const handlePurchase = () => {
    if (isPurchasing) {
      return;
    }

    const customerEmail = email.trim();
    const trimmedRecipientEmail = recipientEmail.trim();
    const trimmedRecipientName = recipientName.trim();
    const trimmedBuyerName = buyerName.trim();
    const trimmedGiftMessage = giftMessage.trim();
    const isEmailDelivery = deliveryMethod === 'email';
    const isScheduled = isEmailDelivery && effectiveDeliveryDate > minDeliveryDate;

    const fieldsToValidate: GiftInputField[] = [];
    if (!isLoggedIn) {
      fieldsToValidate.push({ ...emailField, value: customerEmail });
    }
    if (isEmailDelivery && trimmedRecipientEmail) {
      fieldsToValidate.push({ ...recipientEmailField, value: trimmedRecipientEmail });
    }

    const formErrors = validateInputForm({ fields: fieldsToValidate });

    if (isEmailDelivery && !trimmedBuyerName) {
      formErrors.buyerName = t('Enter your name');
    }

    // No confirm-email field: the buyer gets a confirmation copy, which covers the unlikely
    // mistyped-recipient case.
    if (isEmailDelivery && !trimmedRecipientEmail) {
      formErrors.recipientEmail = t("Enter the recipient's email address");
    }

    if (isEmailDelivery) {
      if (!effectiveDeliveryDate) {
        formErrors.deliveryDate = t('Choose a delivery date');
      } else if (effectiveDeliveryDate < minDeliveryDate) {
        formErrors.deliveryDate = t('Choose a date from today onwards');
      } else if (effectiveDeliveryDate > maxDeliveryDate) {
        formErrors.deliveryDate = t('Choose a date within the next year');
      }
    }

    const formHasErrors = Object.values(formErrors).some((errorMessage) => !!errorMessage);

    setErrors(formErrors);

    if (formHasErrors) {
      if (formErrors.buyerName) {
        setStep('plan');
      }
      return;
    }

    doAction('checkoutGift', {
      tierId: activeProduct.id,
      duration: activeDuration,
      ...(!isLoggedIn ? { email: customerEmail } : {}),
      deliveryMethod,
      ...(isEmailDelivery ? { recipientEmail: trimmedRecipientEmail } : {}),
      ...(isEmailDelivery && trimmedRecipientName ? { recipientName: trimmedRecipientName } : {}),
      ...(trimmedBuyerName ? { buyerName: trimmedBuyerName } : {}),
      ...(isEmailDelivery && trimmedGiftMessage ? { personalMessage: trimmedGiftMessage } : {}),
      ...(isScheduled ? { deliveryDate: effectiveDeliveryDate } : {}),
    });
  };

  return (
    <div ref={contentRef} className="gh-portal-content gift">
      <CloseButton />
      <div className="gh-portal-gift-checkout">
        <div className="gh-portal-gift-checkout-left" data-step={step}>
          <div aria-hidden="true" className="gh-portal-gift-checkout-bg" />
          {/* One back button in the corner for both jobs, as the other Portal modals do it. */}
          {(step === 'delivery' || lastPage) && (
            <SiteTitleBackButton
              onBack={() => (step === 'delivery' ? handleBackToPlan() : doAction('back'))}
            />
          )}
          <div className="gh-portal-gift-checkout-inner">
            {step === 'plan' ? (
              <GiftPlanStep
                activeDuration={activeDuration}
                activeDurationLabel={activeDurationLabel}
                activeProduct={activeProduct}
                buyerEmailField={emailField}
                buyerNameField={buyerNameField}
                isSingleTier={isSingleTier}
                offeredDurations={offeredDurations}
                products={products}
                showBuyerEmail={showBuyerEmail}
                showBuyerName={showBuyerName}
                siteTitle={siteTitle}
                tierPriceLabel={getTierPriceLabel}
                onBuyerEmailChange={handleEmailChange}
                onBuyerNameChange={handleBuyerNameChange}
                onSelectDuration={setSelectedDuration}
                onSelectProduct={setSelectedProductId}
              />
            ) : (
              <GiftDeliveryStep
                deliveryDateError={errors.deliveryDate || ''}
                deliveryMethod={deliveryMethod}
                effectiveDeliveryDate={effectiveDeliveryDate}
                giftMessage={giftMessage}
                maxDeliveryDate={maxDeliveryDate}
                maxMessageLength={GIFT_MESSAGE_MAX_LENGTH}
                minDeliveryDate={minDeliveryDate}
                recipientEmailField={recipientEmailField}
                recipientNameField={recipientNameField}
                onChangeDeliveryDate={handleDeliveryDateChange}
                onChangeDeliveryMethod={handleDeliveryMethodChange}
                onChangeGiftMessage={setGiftMessage}
                onChangeRecipientEmail={handleRecipientEmailChange}
                onChangeRecipientName={setRecipientName}
              />
            )}
            <div className="gh-portal-gift-checkout-cta-wrapper">
              <ActionButton
                brandColor={brandColor}
                classes="gh-portal-gift-checkout-cta"
                dataTestId={step === 'plan' ? 'gift-continue' : 'purchase-gift'}
                disabled={isDisabled}
                isRunning={step === 'delivery' && isPurchasing}
                label={
                  step === 'plan' ? t('Continue to delivery details') : t('Continue to payment')
                }
                style={{ width: '100%' }}
                onClick={step === 'plan' ? handleContinueToDelivery : handlePurchase}
              />
            </div>
          </div>
        </div>

        <GiftPreviewPanel
          activeDuration={activeDuration}
          activeProduct={activeProduct}
          buyerName={buyerName}
          cardRef={cardRef}
          cardTiltProps={cardTiltProps}
          effectiveDeliveryDate={effectiveDeliveryDate}
          emailDuration={emailDuration}
          giftMessage={giftMessage}
          giftValue={getTierPriceLabel(activeProduct, activeDuration)}
          minDeliveryDate={minDeliveryDate}
          recipientEmail={recipientEmail}
          recipientName={recipientName}
          showEmailPreview={showEmailPreview}
          siteIcon={siteIcon}
          siteTitle={siteTitle}
        />
      </div>
    </div>
  );
};

export default BetaGiftPage;
