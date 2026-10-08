import type { ChangeEvent } from 'react';
import DatePicker from '../../common/date-picker';
import InputField from '../../common/input-field';
import { REVEAL_CLASSES, REVEAL_INNER_CLASSES } from '../../common/gift-email-preview';
import { t } from '../../../utils/i18n';
import { GIFT_SWITCH_CLASSES, getGiftSwitchButtonClasses } from './plan-step';
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
      <div className="gh-portal-gift-checkout-section mt-6">
        {/* Same voice and spacing as every other field label on the form — the toggle is just
        this label's input. */}
        <div className="gh-portal-gift-checkout-label mb-2 text-md font-semibold text-grey-4">
          {t('How would you like to share this gift?')}
        </div>
        <div aria-label={t('Delivery method')} className={GIFT_SWITCH_CLASSES} role="radiogroup">
          <button
            aria-checked={deliveryMethod === 'email'}
            className={getGiftSwitchButtonClasses(deliveryMethod === 'email')}
            data-test-button="delivery-method-email"
            role="radio"
            type="button"
            onClick={() => onChangeDeliveryMethod('email')}
          >
            {t('Email it to them')}
          </button>
          <button
            aria-checked={deliveryMethod === 'link'}
            className={getGiftSwitchButtonClasses(deliveryMethod === 'link')}
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
        className={REVEAL_CLASSES}
        data-open={deliveryMethod === 'email'}
      >
        <div className={REVEAL_INNER_CLASSES}>
          <div className="gh-portal-gift-checkout-section mt-6">
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
            <div className="gh-portal-input-labelcontainer flex w-full justify-between">
              <label
                className="gh-portal-input-label mb-0.5 text-sm font-semibold tracking-[0px] text-grey-1"
                htmlFor="gift-message"
              >
                {t('Optional message')}
              </label>
            </div>
            <textarea
              className="gh-portal-input gh-portal-gift-checkout-textarea mb-0 block min-h-24 w-full resize-none appearance-none rounded-md border border-solid border-grey-11 bg-transparent px-3 py-2.5 text-base leading-[1.5em] tracking-[0.2px] [-webkit-appearance:none] [color:inherit] [font-family:inherit] [outline:none] [transition:border-color_0.25s_ease-in-out] placeholder:text-grey-8 focus:border-grey-8"
              data-test-input="gift-message"
              id="gift-message"
              maxLength={maxMessageLength}
              placeholder={t('Add a short note to go with your gift')}
              value={giftMessage}
              onChange={(event) => onChangeGiftMessage(event.target.value)}
            />
            <div
              aria-hidden={giftMessage.length === 0}
              className={REVEAL_CLASSES}
              data-open={giftMessage.length > 0}
            >
              <div className={REVEAL_INNER_CLASSES}>
                <p className="gh-portal-gift-checkout-message-count mb-0 mt-1.5 text-right text-xs tracking-[0.02em] text-grey-8">
                  {giftMessage.length}/{maxMessageLength}
                </p>
              </div>
            </div>
            <div className="gh-portal-gift-checkout-delivery-date mt-4 [&_.gh-portal-input]:mb-0 [&_.gh-portal-input]:box-border">
              <div className="gh-portal-input-labelcontainer flex w-full justify-between">
                <label
                  className="gh-portal-input-label mb-0.5 text-sm font-semibold tracking-[0px] text-grey-1"
                  htmlFor="gift-delivery-date"
                >
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
                <p className="gh-portal-gift-checkout-delivery-error mb-0 mt-2 text-sm leading-[1.6em] tracking-[0.35px] text-red">
                  {deliveryDateError}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default GiftDeliveryStep;
