import type { ChangeEvent } from 'react';
import InputField from '../../common/input-field';
import CheckmarkIcon from '../../../images/icons/checkmark.svg?react';
import { getGiftDurationLabel } from '../../../utils/gift-redemption-notification';
import { t } from '../../../utils/i18n';
import type { GiftDuration, GiftInputField, GiftProduct } from './types';

type TypedInputFieldProps = GiftInputField & {
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const TypedInputField = InputField as unknown as (props: TypedInputFieldProps) => JSX.Element;

export const GIFT_SWITCH_CLASSES =
  'gh-portal-gift-duration-switch flex h-11 w-full rounded-[999px] bg-gray-200 p-1';

export function getGiftSwitchButtonClasses(isActive: boolean) {
  return (
    'gh-portal-btn relative flex h-full min-w-0 flex-1 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-[999px] border-0 border-none px-2 py-0 text-center text-md font-medium leading-[1em] tracking-[0.2px] text-black no-underline [outline:none] [transition:background-color_150ms_cubic-bezier(0.25,1,0.5,1),box-shadow_150ms_cubic-bezier(0.25,1,0.5,1),color_150ms_cubic-bezier(0.25,1,0.5,1)] focus-visible:rounded-[999px] focus-visible:[outline:none] focus-visible:[box-shadow:0_0_0_2px_var(--brandcolor)] focus-visible:[transition:background-color_150ms_cubic-bezier(0.25,1,0.5,1),box-shadow_150ms_cubic-bezier(0.25,1,0.5,1),color_150ms_cubic-bezier(0.25,1,0.5,1)] motion-reduce:[transition:none] motion-reduce:focus-visible:[transition:none]' +
    (isActive
      ? ' active bg-white [box-shadow:0px_1px_3px_rgba(var(--blackrgb),0.08)]'
      : ' bg-transparent')
  );
}

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
    <div aria-label={t('Gift duration')} className={GIFT_SWITCH_CLASSES} role="radiogroup">
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
      <header className="gh-portal-gift-checkout-header mb-3">
        <h1 className="gh-portal-main-title mb-2 text-pretty text-start text-4xl leading-[1.15] text-black max-sm:text-[2.6rem]">
          {t('Gift a membership')}
        </h1>
        <p className="gh-portal-gift-checkout-subtitle m-0 text-pretty text-base leading-[1.45em] text-gray-900">
          {t('Share a full membership to {siteTitle} with a friend or colleague', {
            siteTitle,
          })}
        </p>
      </header>

      {(showBuyerName || showBuyerEmail) && (
        <div className="gh-portal-gift-checkout-section mt-6">
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

      <div className="gh-portal-gift-checkout-section mt-6">
        <div className="gh-portal-gift-checkout-label mb-2 text-md font-semibold text-gray-900">
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
            className="gh-portal-gift-checkout-single-duration text-lg font-semibold leading-[1.3] text-black"
            data-test-single-duration
          >
            {t('{duration} membership', { duration: activeDurationLabel })}
          </div>
        )}
      </div>

      <div className="gh-portal-gift-checkout-section mt-6">
        <div
          aria-label={isSingleTier ? undefined : t('Choose a tier')}
          className={
            'gh-portal-gift-checkout-tiers flex flex-col gap-3' + (isSingleTier ? ' single' : '')
          }
          role={isSingleTier ? undefined : 'radiogroup'}
        >
          {products.map((product) => {
            const isSelected = product.id === activeProduct.id;
            const benefits = product.benefits || [];
            return (
              <div
                key={product.id}
                className={
                  'gh-portal-gift-checkout-tier-item overflow-hidden rounded-[10px] border border-solid [transition:border-color_0.2s_ease,background-color_0.2s_ease]' +
                  (isSelected && !isSingleTier
                    ? ' selected border-brand bg-[color:color-mix(in_srgb,var(--brandcolor)_6%,theme(colors.white))] [box-shadow:0_0_0_1px_var(--brandcolor)_inset]'
                    : ' border-gray-300 bg-white' + (isSingleTier ? '' : ' hover:border-gray-400'))
                }
              >
                <button
                  aria-checked={isSingleTier ? undefined : isSelected}
                  className={
                    'gh-portal-gift-checkout-tier flex w-full items-start gap-2.5 border-none bg-transparent px-5 py-4 text-start [color:inherit] [font:inherit] focus-visible:[outline:none] focus-visible:[box-shadow:0_0_0_2px_var(--brandcolor)_inset]' +
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
                        'gh-portal-gift-checkout-tier-radio relative mt-[3px] size-[18px] shrink-0 rounded-[50%] border-[1.5px] border-solid' +
                        (isSelected
                          ? " border-brand bg-brand after:absolute after:left-1/2 after:top-1/2 after:size-[6px] after:rounded-[50%] after:bg-white after:content-[''] after:-translate-x-1/2 after:-translate-y-1/2"
                          : ' border-gray-400 bg-white')
                      }
                    />
                  )}
                  <div className="gh-portal-gift-checkout-tier-content flex min-w-0 flex-1 flex-col gap-1">
                    <div className="gh-portal-gift-checkout-tier-heading flex items-baseline gap-2.5">
                      <span className="gh-portal-gift-checkout-tier-name flex-1 text-base font-medium text-black">
                        {product.name}
                      </span>
                      <span className="gh-portal-gift-checkout-tier-price text-base font-semibold text-black">
                        {tierPriceLabel(product, activeDuration)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="gh-portal-gift-checkout-tier-description -mt-0.5 mb-0 text-md leading-[1.4] text-gray-900">
                        {product.description}
                      </p>
                    )}
                  </div>
                </button>
                {benefits.length > 0 && (
                  <div
                    aria-hidden={!isSelected}
                    className="gh-portal-gift-checkout-tier-benefits grid grid-rows-[0fr] overflow-hidden [transition:grid-template-rows_0.3s_ease] data-[open=true]:grid-rows-[1fr]"
                    data-open={isSelected}
                  >
                    <div className="gh-portal-gift-checkout-tier-benefits-inner min-h-0 overflow-hidden">
                      <div className="gh-portal-gift-checkout-benefits flex flex-col gap-2 pb-5 pl-[22px] pr-5">
                        {benefits.map((benefit, idx) => {
                          const key = benefit.id || `benefit-${idx}`;
                          return (
                            <div
                              key={key}
                              className="gh-portal-gift-checkout-benefit flex items-start gap-2.5 text-[1.45rem] leading-[1.4] text-gray-950"
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
