import type { ChangeEvent } from 'react';
import DatePicker from '../../common/date-picker';
import InputField from '../../common/input-field';
import { t } from '../../../utils/i18n';
import type { GiftDeliveryMethod, GiftInputField } from './types';
import {
  getGiftSwitchButtonClass,
  giftRevealClass,
  giftRevealInnerClass,
  giftSwitchClass,
} from './classes';
import { inputLabelClass, inputLabelContainerClass } from '../../shared-classes';

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
      <div className="mt-6">
        {/* Same voice and spacing as every other field label on the form — the toggle is just
        this label's input. */}
        <div className="mb-2 text-14 font-semibold text-gray-900">
          {t('How would you like to share this gift?')}
        </div>
        <div aria-label={t('Delivery method')} className={giftSwitchClass} role="radiogroup">
          <button
            aria-checked={deliveryMethod === 'email'}
            className={getGiftSwitchButtonClass(deliveryMethod === 'email')}
            data-test-button="delivery-method-email"
            role="radio"
            type="button"
            onClick={() => onChangeDeliveryMethod('email')}
          >
            {t('Email it to them')}
          </button>
          <button
            aria-checked={deliveryMethod === 'link'}
            className={getGiftSwitchButtonClass(deliveryMethod === 'link')}
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
        className={giftRevealClass}
        data-open={deliveryMethod === 'email'}
      >
        <div className={giftRevealInnerClass}>
          <div className="mt-6">
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
            <div className={inputLabelContainerClass}>
              <label className={inputLabelClass} htmlFor="gift-message">
                {t('Optional message')}
              </label>
            </div>
            <textarea
              className="gh-portal-input mb-0 block min-h-24 w-full resize-none appearance-none rounded-md border border-solid border-gray-300 bg-transparent px-3 py-2.5 [font-family:inherit] text-15 leading-[1.5em] tracking-[0.2px] [color:inherit] outline-none [-webkit-appearance:none] transition-input placeholder:text-gray-500 focus:border-gray-500"
              data-test-input="gift-message"
              id="gift-message"
              maxLength={maxMessageLength}
              placeholder={t('Add a short note to go with your gift')}
              value={giftMessage}
              onChange={(event) => onChangeGiftMessage(event.target.value)}
            />
            <div
              aria-hidden={giftMessage.length === 0}
              className={giftRevealClass}
              data-open={giftMessage.length > 0}
            >
              <div className={giftRevealInnerClass}>
                <p className="mt-1.5 mb-0 text-right text-12 tracking-[0.02em] text-gray-500">
                  {giftMessage.length}/{maxMessageLength}
                </p>
              </div>
            </div>
            <div className="mt-4 [&_.gh-portal-input]:mb-0 [&_.gh-portal-input]:box-border">
              <div className={inputLabelContainerClass}>
                <label className={inputLabelClass} htmlFor="gift-delivery-date">
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
                <p className="mt-2 mb-0 text-13 leading-[1.6em] tracking-[0.35px] text-red">
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
