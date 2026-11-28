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
    <div
      aria-label={t('Gift duration')}
      className="gh-portal-gift-duration-switch"
      role="radiogroup"
    >
      {offeredDurations.map((months) => {
        const isActive = months === activeDuration;
        return (
          <button
            key={months}
            aria-checked={isActive}
            className={'gh-portal-btn' + (isActive ? ' active' : '')}
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
      <header className="gh-portal-gift-checkout-header">
        <h1 className="gh-portal-main-title">{t('Gift a membership')}</h1>
        <p className="gh-portal-gift-checkout-subtitle">
          {t('Share a full membership to {siteTitle} with a friend or colleague', {
            siteTitle,
          })}
        </p>
      </header>

      {(showBuyerName || showBuyerEmail) && (
        <div className="gh-portal-gift-checkout-section">
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

      <div className="gh-portal-gift-checkout-section">
        <div className="gh-portal-gift-checkout-label">
          {isSingleTier ? t('Membership details') : t('Tier')}
        </div>
        {offeredDurations.length > 1 ? (
          <GiftDurationSwitch
            activeDuration={activeDuration}
            offeredDurations={offeredDurations}
            onSelectDuration={onSelectDuration}
          />
        ) : (
          <div className="gh-portal-gift-checkout-single-duration" data-test-single-duration>
            {t('{duration} membership', { duration: activeDurationLabel })}
          </div>
        )}
      </div>

      <div className="gh-portal-gift-checkout-section">
        <div
          aria-label={isSingleTier ? undefined : t('Choose a tier')}
          className={'gh-portal-gift-checkout-tiers' + (isSingleTier ? ' single' : '')}
          role={isSingleTier ? undefined : 'radiogroup'}
        >
          {products.map((product) => {
            const isSelected = product.id === activeProduct.id;
            const benefits = product.benefits || [];
            return (
              <div
                key={product.id}
                className={
                  'gh-portal-gift-checkout-tier-item' +
                  (isSelected && !isSingleTier ? ' selected' : '')
                }
              >
                <button
                  aria-checked={isSingleTier ? undefined : isSelected}
                  className="gh-portal-gift-checkout-tier"
                  data-test-tier={product.name}
                  role={isSingleTier ? undefined : 'radio'}
                  type="button"
                  onClick={() => onSelectProduct(product.id)}
                >
                  {!isSingleTier && (
                    <span aria-hidden="true" className="gh-portal-gift-checkout-tier-radio" />
                  )}
                  <div className="gh-portal-gift-checkout-tier-content">
                    <div className="gh-portal-gift-checkout-tier-heading">
                      <span className="gh-portal-gift-checkout-tier-name">{product.name}</span>
                      <span className="gh-portal-gift-checkout-tier-price">
                        {tierPriceLabel(product, activeDuration)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="gh-portal-gift-checkout-tier-description">
                        {product.description}
                      </p>
                    )}
                  </div>
                </button>
                {benefits.length > 0 && (
                  <div
                    aria-hidden={!isSelected}
                    className="gh-portal-gift-checkout-tier-benefits"
                    data-open={isSelected}
                  >
                    <div className="gh-portal-gift-checkout-tier-benefits-inner">
                      <div className="gh-portal-gift-checkout-benefits">
                        {benefits.map((benefit, idx) => {
                          const key = benefit.id || `benefit-${idx}`;
                          return (
                            <div key={key} className="gh-portal-gift-checkout-benefit">
                              <CheckmarkIcon aria-hidden="true" focusable="false" />
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
