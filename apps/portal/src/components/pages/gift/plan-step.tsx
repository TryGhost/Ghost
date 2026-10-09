import type { ChangeEvent } from 'react';
import InputField from '../../common/input-field';
import CheckmarkIcon from '../../../images/icons/checkmark.svg?react';
import { getGiftDurationLabel } from '../../../utils/gift-redemption-notification';
import { t } from '../../../utils/i18n';
import type { GiftDuration, GiftInputField, GiftProduct } from './types';
import { getGiftSwitchButtonClasses, giftSwitchClasses } from '../../shared-classes';
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
    <div aria-label={t('Gift duration')} className={giftSwitchClasses} role="radiogroup">
      {offeredDurations.map((months) => {
        const isActive = months === activeDuration;
        return (
          <button
            key={months}
            aria-checked={isActive}
            className={getGiftSwitchButtonClasses(isActive)}
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
        <h1 className="mb-2 text-start text-32 leading-[1.15] text-pretty text-black max-sm:text-26">
          {t('Gift a membership')}
        </h1>
        <p className="gh-portal-gift-checkout-subtitle m-0 text-15 leading-[1.45em] text-pretty text-gray-900">
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
        <div className="mb-2 text-14 font-semibold text-gray-900">
          {isSingleTier ? t('Membership details') : t('Tier')}
        </div>
        {offeredDurations.length > 1 ? (
          <GiftDurationSwitch
            activeDuration={activeDuration}
            offeredDurations={offeredDurations}
            onSelectDuration={onSelectDuration}
          />
        ) : (
          <div className="text-16 leading-[1.3] font-semibold text-black" data-test-single-duration>
            {t('{duration} membership', { duration: activeDurationLabel })}
          </div>
        )}
      </div>

      <div className="mt-6">
        <div
          aria-label={isSingleTier ? undefined : t('Choose a tier')}
          className={tw`flex flex-col gap-3` + (isSingleTier ? ' single' : '')}
          role={isSingleTier ? undefined : 'radiogroup'}
        >
          {products.map((product) => {
            const isSelected = product.id === activeProduct.id;
            const benefits = product.benefits || [];
            return (
              <div
                key={product.id}
                className={
                  tw`overflow-hidden rounded-[10px] border border-solid [transition:border-color_0.2s_ease,background-color_0.2s_ease]` +
                  (isSelected && !isSingleTier
                    ? tw` selected border-brand bg-[color:color-mix(in_srgb,var(--brandcolor)_6%,var(--color-white))] [box-shadow:0_0_0_1px_var(--brandcolor)_inset]`
                    : ' border-gray-300 bg-white' + (isSingleTier ? '' : ' hover:border-gray-400'))
                }
              >
                <button
                  aria-checked={isSingleTier ? undefined : isSelected}
                  className={
                    tw`flex w-full items-start gap-2.5 border-none bg-transparent px-5 py-4 text-start [color:inherit] [font:inherit] focus-visible:[box-shadow:0_0_0_2px_var(--brandcolor)_inset] focus-visible:outline-none` +
                    (isSingleTier ? ' cursor-default' : ' cursor-pointer')
                  }
                  data-test-tier={product.name}
                  role={isSingleTier ? undefined : 'radio'}
                  type="button"
                  onClick={() => onSelectProduct(product.id)}
                >
                  {!isSingleTier && (
                    <span
                      aria-hidden="true"
                      className={
                        tw`relative mt-[3px] size-[18px] shrink-0 rounded-[50%] border-[1.5px] border-solid` +
                        (isSelected
                          ? tw` border-brand bg-brand after:absolute after:top-1/2 after:left-1/2 after:size-[6px] after:-translate-1/2 after:rounded-[50%] after:bg-white after:content-['']`
                          : ' border-gray-400 bg-white')
                      }
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-baseline gap-2.5">
                      <span className="flex-1 text-15 font-medium text-black">{product.name}</span>
                      <span className="gh-portal-gift-checkout-tier-price text-15 font-semibold text-black">
                        {tierPriceLabel(product, activeDuration)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="-mt-0.5 mb-0 text-14 leading-[1.4] text-gray-900">
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
                      <div className="flex flex-col gap-2 pr-5 pb-5 pl-[22px]">
                        {benefits.map((benefit, idx) => {
                          const key = benefit.id || `benefit-${idx}`;
                          return (
                            <div
                              key={key}
                              className="gh-portal-gift-checkout-benefit flex items-start gap-2.5 text-14.5 leading-[1.4] text-gray-950"
                            >
                              <CheckmarkIcon
                                aria-hidden="true"
                                className="mt-[3px] size-[14px] shrink-0 text-gray-950"
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
