import type { ChangeEvent } from 'react';
import DatePicker from '../../common/date-picker';
import InputField from '../../common/input-field';
import { t } from '../../../utils/i18n';
import type { GiftDeliveryMethod, GiftInputField } from './types';

interface TypedDatePickerProps {
  ariaLabel: string;
  hasError: boolean;
  id: string;
  max: string;
  min: string;
  minLabel: string;
  onChange: (value: string) => void;
  value: string;
}

type TypedInputFieldProps = GiftInputField & {
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const TypedDatePicker = DatePicker as unknown as (props: TypedDatePickerProps) => JSX.Element;
const TypedInputField = InputField as unknown as (props: TypedInputFieldProps) => JSX.Element;

interface GiftDeliveryStepProps {
  deliveryDateError: string;
  deliveryMethod: GiftDeliveryMethod;
  effectiveDeliveryDate: string;
  giftMessage: string;
  maxDeliveryDate: string;
  maxMessageLength: number;
  minDeliveryDate: string;
  onChangeDeliveryDate: (value: string) => void;
  onChangeDeliveryMethod: (method: GiftDeliveryMethod) => void;
  onChangeGiftMessage: (value: string) => void;
  onChangeRecipientEmail: (value: string) => void;
  onChangeRecipientName: (value: string) => void;
  recipientEmailField: GiftInputField;
  recipientNameField: GiftInputField;
}

function GiftDeliveryStep({
  deliveryDateError,
  deliveryMethod,
  effectiveDeliveryDate,
  giftMessage,
  maxDeliveryDate,
  maxMessageLength,
  minDeliveryDate,
  onChangeDeliveryDate,
  onChangeDeliveryMethod,
  onChangeGiftMessage,
  onChangeRecipientEmail,
  onChangeRecipientName,
  recipientEmailField,
  recipientNameField,
}: GiftDeliveryStepProps) {
  return (
    <>
      <div className="gh-portal-gift-checkout-section">
        {/* Same voice and spacing as every other field label on the form — the toggle is just
        this label's input. */}
        <div className="gh-portal-gift-checkout-label">
          {t('How would you like to share this gift?')}
        </div>
        <div
          aria-label={t('Delivery method')}
          className="gh-portal-gift-duration-switch"
          role="radiogroup"
        >
          <button
            aria-checked={deliveryMethod === 'email'}
            className={'gh-portal-btn' + (deliveryMethod === 'email' ? ' active' : '')}
            data-test-button="delivery-method-email"
            role="radio"
            type="button"
            onClick={() => onChangeDeliveryMethod('email')}
          >
            {t('Email it to them')}
          </button>
          <button
            aria-checked={deliveryMethod === 'link'}
            className={'gh-portal-btn' + (deliveryMethod === 'link' ? ' active' : '')}
            data-test-button="delivery-method-link"
            role="radio"
            type="button"
            onClick={() => onChangeDeliveryMethod('link')}
          >
            {t("I'll share it myself")}
          </button>
        </div>
      </div>

      <div
        aria-hidden={deliveryMethod !== 'email'}
        className="gh-portal-gift-checkout-reveal"
        data-open={deliveryMethod === 'email'}
      >
        <div className="gh-portal-gift-checkout-reveal-inner">
          <div className="gh-portal-gift-checkout-section">
            <TypedInputField
              {...recipientNameField}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onChangeRecipientName(event.target.value)
              }
            />
            <TypedInputField
              {...recipientEmailField}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onChangeRecipientEmail(event.target.value)
              }
            />
            {/* Part of the recipient's details rather than a section of its own, so it takes
            InputField's label markup to sit flush with the fields above. */}
            <div className="gh-portal-input-labelcontainer">
              <label className="gh-portal-input-label" htmlFor="gift-message">
                {t('Optional message')}
              </label>
            </div>
            <textarea
              className="gh-portal-input gh-portal-gift-checkout-textarea"
              data-test-input="gift-message"
              id="gift-message"
              maxLength={maxMessageLength}
              placeholder={t('Add a short note to go with your gift')}
              value={giftMessage}
              onChange={(event) => onChangeGiftMessage(event.target.value)}
            />
            <div
              aria-hidden={giftMessage.length === 0}
              className="gh-portal-gift-checkout-reveal"
              data-open={giftMessage.length > 0}
            >
              <div className="gh-portal-gift-checkout-reveal-inner">
                <p className="gh-portal-gift-checkout-message-count">
                  {giftMessage.length}/{maxMessageLength}
                </p>
              </div>
            </div>
            <div className="gh-portal-gift-checkout-delivery-date">
              <div className="gh-portal-input-labelcontainer">
                <label className="gh-portal-input-label" htmlFor="gift-delivery-date">
                  {t('Delivery date')}
                </label>
              </div>
              <TypedDatePicker
                ariaLabel={t('Delivery date')}
                hasError={!!deliveryDateError}
                id="gift-delivery-date"
                max={maxDeliveryDate}
                min={minDeliveryDate}
                minLabel={t('Now')}
                value={effectiveDeliveryDate}
                onChange={onChangeDeliveryDate}
              />
              {deliveryDateError && (
                <p className="gh-portal-gift-checkout-delivery-error">{deliveryDateError}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default GiftDeliveryStep;
