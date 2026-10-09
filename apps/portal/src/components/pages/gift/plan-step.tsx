import clsx from 'clsx';
import type { ChangeEvent } from 'react';
import InputField from '../../common/input-field';
import CheckmarkIcon from '../../../images/icons/checkmark.svg?react';
import { getGiftDurationLabel } from '../../../utils/gift-redemption-notification';
import { t } from '../../../utils/i18n';
import type { GiftDuration, GiftInputField, GiftProduct } from './types';
import {
  getGiftSwitchButtonClass,
  giftSubtitleClass,
  giftSwitchClass,
  giftTitleClass,
} from './classes';
import { tw } from '../../../utils/tw';

type TypedInputFieldProps = GiftInputField & {
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const TypedInputField = InputField as unknown as (props: TypedInputFieldProps) => JSX.Element;

interface GiftDurationSwitchProps {
  activeDuration: GiftDuration;
  offeredDurations: GiftDuration[];
  onSelectDuration: (duration: GiftDuration) => void;
}

function GiftDurationSwitch({
  activeDuration,
  offeredDurations,
  onSelectDuration,
}: GiftDurationSwitchProps) {
  if (offeredDurations.length < 2) {
    return null;
  }

  return (
    <div aria-label={t('Gift duration')} className={giftSwitchClass} role="radiogroup">
      {offeredDurations.map((months) => {
        const isActive = months === activeDuration;
        return (
          <button
            key={months}
            aria-checked={isActive}
            className={getGiftSwitchButtonClass(isActive)}
            data-test-button={`switch-duration-${months}`}
            role="radio"
            type="button"
            onClick={() => onSelectDuration(months)}
          >
            {getGiftDurationLabel({ cadence: 'month', duration: months })}
          </button>
        );
      })}
    </div>
  );
}

interface GiftPlanStepProps {
  activeDuration: GiftDuration;
  activeDurationLabel: string;
  activeProduct: GiftProduct;
  buyerEmailField: GiftInputField;
  buyerNameField: GiftInputField;
  isSingleTier: boolean;
  offeredDurations: GiftDuration[];
  onBuyerEmailChange: (value: string) => void;
  onBuyerNameChange: (value: string) => void;
  onSelectDuration: (duration: GiftDuration) => void;
  onSelectProduct: (productId: string) => void;
  products: GiftProduct[];
  showBuyerEmail: boolean;
  showBuyerName: boolean;
  siteTitle: string;
  tierPriceLabel: (product: GiftProduct, duration: GiftDuration) => string;
}

function GiftPlanStep({
  activeDuration,
  activeDurationLabel,
  activeProduct,
  buyerEmailField,
  buyerNameField,
  isSingleTier,
  offeredDurations,
  onBuyerEmailChange,
  onBuyerNameChange,
  onSelectDuration,
  onSelectProduct,
  products,
  showBuyerEmail,
  showBuyerName,
  siteTitle,
  tierPriceLabel,
}: GiftPlanStepProps) {
  return (
    <>
      <header className="mb-3">
        <h1 className={giftTitleClass}>{t('Gift a membership')}</h1>
        <p className={giftSubtitleClass}>
          {t('Share a full membership to {siteTitle} with a friend or colleague', {
            siteTitle,
          })}
        </p>
      </header>

      {(showBuyerName || showBuyerEmail) && (
        <div className="mt-6">
          {showBuyerName && (
            <TypedInputField
              {...buyerNameField}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onBuyerNameChange(event.target.value)
              }
            />
          )}
          {showBuyerEmail && (
            <TypedInputField
              {...buyerEmailField}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onBuyerEmailChange(event.target.value)
              }
            />
          )}
        </div>
      )}

      <div className="mt-6">
        <div className="mb-2 text-14 font-semibold text-gray-750">
          {isSingleTier ? t('Membership details') : t('Tier')}
        </div>
        {offeredDurations.length > 1 ? (
          <GiftDurationSwitch
            activeDuration={activeDuration}
            offeredDurations={offeredDurations}
            onSelectDuration={onSelectDuration}
          />
        ) : (
          <div
            className="text-16 leading-[1.3] font-semibold text-gray-950"
            data-test-single-duration
          >
            {t('{duration} membership', { duration: activeDurationLabel })}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div
          aria-label={isSingleTier ? undefined : t('Choose a tier')}
          className="flex flex-col gap-3"
          role={isSingleTier ? undefined : 'radiogroup'}
        >
          {products.map((product) => {
            const isSelected = product.id === activeProduct.id;
            const benefits = product.benefits || [];
            return (
              <div
                key={product.id}
                className={clsx(
                  tw`overflow-hidden rounded-[10px] border border-solid [transition:border-color_0.2s_ease,background-color_0.2s_ease]`,
                  isSelected && !isSingleTier
                    ? tw`border-brand bg-[color:color-mix(in_srgb,var(--brandcolor)_6%,var(--color-white))] [box-shadow:0_0_0_1px_var(--brandcolor)_inset]`
                    : ['border-gray-200 bg-white', !isSingleTier && 'hover:border-gray-300'],
                )}
              >
                <button
                  aria-checked={isSingleTier ? undefined : isSelected}
                  className={clsx(
                    tw`flex w-full items-start gap-2.5 border-none bg-transparent px-5 py-4 text-start [color:inherit] [font:inherit] focus-visible:[box-shadow:0_0_0_2px_var(--brandcolor)_inset] focus-visible:outline-none`,
                    isSingleTier ? 'cursor-default' : 'cursor-pointer',
                  )}
                  data-test-tier={product.name}
                  role={isSingleTier ? undefined : 'radio'}
                  type="button"
                  onClick={() => onSelectProduct(product.id)}
                >
                  {!isSingleTier && (
                    <span
                      aria-hidden="true"
                      className={clsx(
                        tw`relative mt-[3px] size-4.5 shrink-0 rounded-[50%] border-[1.5px] border-solid`,
                        isSelected
                          ? tw`border-brand bg-brand after:absolute after:top-1/2 after:left-1/2 after:size-1.5 after:-translate-1/2 after:rounded-[50%] after:bg-white after:content-['']`
                          : 'border-gray-300 bg-white',
                      )}
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-baseline gap-2.5">
                      <span className="flex-1 text-15 font-medium text-gray-950">
                        {product.name}
                      </span>
                      <span className="gh-portal-gift-checkout-tier-price text-15 font-semibold text-gray-950">
                        {tierPriceLabel(product, activeDuration)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="-mt-0.5 mb-0 text-14 leading-[1.4] text-gray-750">
                        {product.description}
                      </p>
                    )}
                  </div>
                </button>
                {benefits.length > 0 && (
                  <div
                    aria-hidden={!isSelected}
                    className="grid grid-rows-[0fr] overflow-hidden [transition:grid-template-rows_0.3s_ease] data-[open=true]:grid-rows-[1fr]"
                    data-open={isSelected}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="flex flex-col gap-2 pr-5 pb-5 pl-5.5">
                        {benefits.map((benefit, idx) => {
                          const key = benefit.id || `benefit-${idx}`;
                          return (
                            <div
                              key={key}
                              className="gh-portal-gift-checkout-benefit flex items-start gap-2.5 text-14.5 leading-[1.4] text-gray-900"
                            >
                              <CheckmarkIcon
                                aria-hidden="true"
                                className="mt-[3px] size-3.5 shrink-0 text-gray-900"
                                focusable="false"
                              />
                              <span>{benefit.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default GiftPlanStep;
