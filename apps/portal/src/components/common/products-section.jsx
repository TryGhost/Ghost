import React, { useContext, useEffect, useState } from 'react';
import LoaderIcon from '../../images/icons/loader.svg?react';
import CheckmarkIcon from '../../images/icons/checkmark.svg?react';
import {
  getCurrencySymbol,
  getPriceString,
  getStripeAmount,
  getMemberActivePrice,
  getProductFromPrice,
  getFreeTierTitle,
  getFreeTierDescription,
  getFreeProduct,
  getFreeProductBenefits,
  getSupportAddress,
  formatNumber,
  isCookiesDisabled,
  hasOnlyFreeProduct,
  isMemberActivePrice,
  hasFreeTrialTier,
  isComplimentaryMember,
  getActiveInterval,
  getProductCadences,
  getProductPriceForInterval,
  getFeaturedOffer,
  getUpdatedOfferPrice,
  getOfferOffAmount,
} from '../../utils/helpers';
import AppContext from '../../app-context';
import calculateDiscount from '../../utils/discount';
import Interpolate from '@doist/react-interpolate';
import { t } from '../../utils/i18n';

export const ProductsSectionStyles = () => {
  // const products = getSiteProducts({site});
  // const noOfProducts = products.length;
  return `
        .gh-portal-products {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .gh-portal-products-pricetoggle {
            position: relative;
            display: flex;
            background: #F3F3F3;
            width: 100%;
            border-radius: 999px;
            padding: 4px;
            height: 44px;
            margin: 0 0 40px;
        }

        .gh-portal-products-pricetoggle:before {
            position: absolute;
            content: "";
            display: block;
            width: 50%;
            top: 4px;
            bottom: 4px;
            right: 4px;
            background: var(--white);
            box-shadow: 0px 1px 3px rgba(var(--blackrgb), 0.08);
            border-radius: 999px;
            transition: all 0.15s ease-in-out;
        }
        html[dir="rtl"] .gh-portal-products-pricetoggle:before {
            left: 4px;
            right: unset;
    }

        .gh-portal-products-pricetoggle.left:before {
            transform: translateX(calc(-100% + 8px));
        }
        html[dir="rtl"] .gh-portal-products-pricetoggle.left:before {
            transform: translateX(calc(100% - 8px));
    }

        .gh-portal-products-pricetoggle .gh-portal-btn {
            border: 0;
            height: 100% !important;
            width: 50%;
            border-radius: 999px;
            background: transparent;
            font-size: 1.5rem;
        }

        .gh-portal-products-pricetoggle .gh-portal-btn.active {
            border: 0;
            height: 100%;
            width: 50%;
            color: var(--grey0);
        }

        .gh-portal-priceoption-label {
            font-size: 1.4rem;
            font-weight: 400;
            letter-spacing: 0.3px;
            margin: 0 6px;
            min-width: 180px;
        }

        .gh-portal-priceoption-label.monthly {
            text-align: right;
        }

        .gh-portal-priceoption-label.inactive {
            color: var(--grey8);
        }

        .gh-portal-maximum-discount {
            font-weight: 400;
            margin-inline-start: 4px;
            opacity: 0.5;
        }

        .gh-portal-products-grid {
            display: flex;
            flex-wrap: wrap;
            align-items: stretch;
            justify-content: center;
            gap: 40px;
            margin: 0 auto;
            padding: 0;
            width: 100%;
        }

        .gh-portal-product-card {
            flex: 1;
            max-width: 420px;
            min-width: 320px;
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: stretch;
            background: var(--white);
            padding: 32px;
            border-radius: 7px;
            border: 1px solid var(--grey11);
            min-height: 200px;
            transition: border-color 0.25s ease-in-out;
        }

        .gh-portal-product-card.top {
            border-bottom: none;
            border-radius: 7px 7px 0 0;
            padding-bottom: 0;
        }

        .gh-portal-product-card.bottom {
            border-top: none;
            border-radius: 0 0 7px 7px;
            padding-top: 0;
        }

        .gh-portal-product-card:not(.disabled):hover {
            border-color: var(--grey9);
        }

        .gh-portal-product-card.checked::before {
            position: absolute;
            display: block;
            top: -2px;
            right: -2px;
            bottom: -2px;
            left: -2px;
            content: "";
            z-index: 999;
            border: 0px solid var(--brandcolor);
            pointer-events: none;
            border-radius: 7px;
        }

        .gh-portal-product-card-header {
            width: 100%;
            min-height: 56px;
        }

        .gh-portal-product-card-name-trial {
            display: flex;
            align-items: center;
        }

        .gh-portal-product-card-name-trial .gh-portal-discount-label {
            margin-top: -4px;
        }

        .gh-portal-product-card-details {
            flex: 1;
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        .gh-portal-product-name {
            font-size: 1.8rem;
            font-weight: 600;
            line-height: 1.3em;
            letter-spacing: 0px;
            margin-top: -4px;
            word-break: break-word;
            width: 100%;
            color: var(--brandcolor);
        }

        .gh-portal-discount-label-trial {
            color: var(--brandcolor);
            font-weight: 600;
            font-size: 1.3rem;
            line-height: 1;
            margin-top: 4px;
        }

        .gh-portal-discount-label {
            position: relative;
            font-size: 1.25rem;
            line-height: 1em;
            font-weight: 600;
            letter-spacing: 0.3px;
            color: var(--grey0);
            padding: 6px 9px;
            text-align: center;
            white-space: nowrap;
            border-radius: 999px;
            margin-inline-end: -4px;
            max-height: 24.5px;
        }

        .gh-portal-discount-label:before {
            position: absolute;
            content: "";
            display: block;
            background: var(--brandcolor);
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            border-radius: 999px;
            opacity: 0.2;
        }

        .gh-portal-product-card-price-trial {
            display: flex;
            flex-direction: row;
            align-items: flex-end;
            justify-content: space-between;
            flex-wrap: wrap;
            row-gap: 10px;
            column-gap: 4px;
            width: 100%;
        }

        .gh-portal-product-card-pricecontainer {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
            margin-top: 16px;
        }

        .gh-portal-product-price {
            display: flex;
            justify-content: center;
            color: var(--grey0);
        }

        .gh-portal-product-price .currency-sign {
            align-self: flex-start;
            font-size: 2.7rem;
            font-weight: 700;
            line-height: 1.135em;
        }

        .gh-portal-product-price .currency-sign.long {
            margin-inline-end: 5px;
        }

        .gh-portal-product-price .amount {
            font-size: 3.5rem;
            font-weight: 700;
            line-height: 1em;
            letter-spacing: -1.3px;
            color: var(--grey0);
        }

        .gh-portal-product-price .amount.trial-duration {
            letter-spacing: -0.022em;
        }

        .gh-portal-product-price .billing-period {
            align-self: flex-end;
            font-size: 1.5rem;
            line-height: 1.6em;
            color: var(--grey5);
            letter-spacing: 0.3px;
            margin-inline-start: 5px;
        }

        .gh-portal-product-alternative-price {
            font-size: 1.3rem;
            line-height: 1.6em;
            color: var(--grey8);
            letter-spacing: 0.3px;
            display: none;
        }

        .gh-portal-single-cadence-label {
            font-size: 1.25rem;
            line-height: 1.6em;
            color: var(--grey6);
            letter-spacing: 0.3px;
        }

        .gh-portal-card-pricetoggle {
            display: inline-flex;
            align-items: center;
            align-self: flex-start;
            background: #F3F3F3;
            border-radius: 999px;
            padding: 3px;
            margin: 6px 0 12px;
        }

        .gh-portal-card-pricetoggle button {
            display: inline-flex;
            align-items: center;
            border: 0;
            background: transparent;
            font-size: 1.25rem;
            font-weight: 500;
            line-height: 1;
            height: 26px;
            padding: 0 12px;
            border-radius: 999px;
            color: var(--grey5);
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.15s ease-in-out;
        }

        .gh-portal-card-pricetoggle button.active {
            background: var(--white);
            color: var(--grey0);
            box-shadow: 0px 1px 3px rgba(var(--blackrgb), 0.08);
        }

        .gh-portal-card-save {
            margin-inline-start: 5px;
            font-weight: 600;
            color: var(--brandcolor);
        }

        .gh-portal-featured-offer-original {
            align-self: flex-end;
            margin-inline-end: 6px;
            margin-bottom: 3px;
            font-size: 1.8rem;
            font-weight: 500;
            color: var(--grey8);
            text-decoration: line-through;
        }

        .after-trial-amount {
            display: block;
            font-size: 1.5rem;
            color: var(--grey5);
            margin-top: 6px;
            margin-bottom: 6px;
            line-height: 1;
        }

        .gh-portal-product-card-detaildata {
            flex: 1;
        }

        .gh-portal-product-description {
            font-size: 1.55rem;
            font-weight: 600;
            line-height: 1.4em;
            width: 100%;
            margin-top: 16px;
        }

        .gh-portal-product-benefits {
            font-size: 1.5rem;
            line-height: 1.4em;
            width: 100%;
            margin-top: 16px;
        }

        .gh-portal-product-benefit {
            display: flex;
            align-items: flex-start;
            margin-bottom: 10px;
        }

        .gh-portal-benefit-checkmark {
            width: 14px;
            height: 14px;
            min-width: 14px;
            margin: 3px 10px 0 0;
            overflow: visible;
        }
        html[dir="rtl"] .gh-portal-benefit-checkmark {
            margin: 3px 0 0 10px;
        }

        .gh-portal-benefit-checkmark polyline,
        .gh-portal-benefit-checkmark g {
            stroke-width: 3px;
        }

        .gh-portal-products-grid.change-plan {
            padding: 0;
        }

        .gh-portal-btn-product {
            position: sticky;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
            justify-self: flex-end;
            padding: 40px 0 32px;
            margin-bottom: -32px;
            /*background: rgb(255,255,255);
            background: linear-gradient(0deg, rgba(255,255,255,1) 75%, rgba(255,255,255,0) 100%);*/
            background: transparent;
        }

        .gh-portal-btn-product::before {
            position: absolute;
            content: "";
            display: block;
            top: -16px;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(0deg, rgba(var(--whitergb),1) 60%, rgba(var(--whitergb),0) 100%);
            z-index: 800;
        }

        .gh-portal-btn-product:not(.gh-portal-btn-unsubscribe) .gh-portal-btn {
            background: var(--brandcolor);
            color: var(--white);
            border: none;
            width: 100%;
            z-index: 900;
        }

        .gh-portal-btn-product:not(.gh-portal-btn-unsubscribe) .gh-portal-btn:hover {
            opacity: 0.9;
        }

        .gh-portal-btn-product:not(.gh-portal-btn-unsubscribe) .gh-portal-btn {
            background: var(--brandcolor);
            color: var(--white);
            border: none;
            width: 100%;
            z-index: 900;
        }

        .gh-portal-btn-product .gh-portal-error-message {
            z-index: 900;
            color: var(--red);
            font-size: 1.4rem;
            min-height: 40px;
            padding-bottom: 13px;
            margin-bottom: -40px;
        }

        .gh-portal-current-plan {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            white-space: nowrap;
            width: 100%;
            height: 44px;
            border-radius: 5px;
            color: var(--grey5);
            font-size: 1.4rem;
            font-weight: 500;
            line-height: 1em;
            letter-spacing: 0.2px;
            font-weight: 500;
            background: var(--grey14);
            z-index: 900;
        }

        .gh-portal-product-card.only-free {
            margin: 0 0 16px;
            min-height: unset;
        }

        .gh-portal-product-card.only-free .gh-portal-product-card-header {
            min-height: unset;
        }

        @media (max-width: 670px) {
            .gh-portal-products-grid {
                grid-template-columns: unset;
                grid-gap: 20px;
                width: 100%;
                max-width: 440px;
            }

            .gh-portal-priceoption-label {
                font-size: 1.25rem;
            }

            .gh-portal-products-priceswitch .gh-portal-discount-label {
                display: none;
            }

            .gh-portal-products-priceswitch {
                padding-top: 18px;
            }

            .gh-portal-product-card {
                min-height: unset;
            }

            .gh-portal-singleproduct-benefits .gh-portal-product-description {
                text-align: center;
            }

            .gh-portal-product-benefit:last-of-type {
                margin-bottom: 0;
            }
        }

        @media (max-width: 480px) {
            .gh-portal-product-price .amount {
                font-size: 3.4rem;
            }

            .gh-portal-product-card {
                min-width: unset;
            }

            .gh-portal-btn-product:not(.gh-portal-btn-unsubscribe) {
                position: static;
            }

            .gh-portal-btn-product:not(.gh-portal-btn-unsubscribe)::before {
                display: none;
            }
        }

        @media (max-width: 370px) {
            .gh-portal-product-price .currency-sign {
                font-size: 1.8rem;
            }

            .gh-portal-product-price .amount {
                font-size: 2.8rem;
            }
        }


        /* Upgrade and change plan*/
        .gh-portal-upgrade-product {
            margin-top: -70px;
            padding-top: 60px;
        }

        .gh-portal-upgrade-product .gh-portal-products-grid {
            grid-template-columns: unset;
            grid-gap: 20px;
            width: 100%;
        }

        .gh-portal-upgrade-product .gh-portal-product-card .gh-portal-plan-current {
            display: inline-block;
            position: relative;
            padding: 2px 8px;
            font-size: 1.2rem;
            letter-spacing: 0.3px;
            text-transform: uppercase;
            margin-bottom: 4px;
        }

        .gh-portal-upgrade-product .gh-portal-product-card .gh-portal-plan-current::before {
            position: absolute;
            content: "";
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            border-radius: 999px;
            background: var(--brandcolor);
            opacity: 0.15;
        }

        @media (max-width: 880px) {
            .gh-portal-products-grid {
                flex-direction: column;
                margin: 0 auto;
                max-width: 420px;
            }

            .gh-portal-product-card-header {
                min-height: unset;
            }
        }
    `;
};

const ProductsContext = React.createContext({
  selectedInterval: 'month',
  selectedProduct: 'free',
  selectedPlan: null,
  setSelectedProduct: null,
  // Mixed catalogs (some tiers single-cadence) drop the global toggle and
  // let each dual-cadence card carry its own — uniform-dual catalogs keep
  // the classic global toggle untouched
  perCardMode: false,
  getCardInterval: null,
  setCardInterval: null,
});

function ProductBenefits({ product }) {
  if (!product.benefits || !product.benefits.length) {
    return null;
  }

  return product.benefits.map((benefit, idx) => {
    const key = benefit?.id || `benefit-${idx}`;
    return (
      <div className="gh-portal-product-benefit" key={key}>
        <CheckmarkIcon className="gh-portal-benefit-checkmark" aria-hidden="true" />
        <div className="gh-portal-benefit-title">{benefit.name}</div>
      </div>
    );
  });
}

function ProductBenefitsContainer({ product, hide = false }) {
  if (!product.benefits || !product.benefits.length || hide) {
    return null;
  }

  let className = 'gh-portal-product-benefits';
  return (
    <div className={className}>
      <ProductBenefits product={product} />
    </div>
  );
}

function ProductCardAlternatePrice({ price }) {
  const { site } = useContext(AppContext);
  const { portal_plans: portalPlans } = site;
  if (!portalPlans.includes('monthly') || !portalPlans.includes('yearly')) {
    return <div className="gh-portal-product-alternative-price"></div>;
  }

  return <div className="gh-portal-product-alternative-price">{getPriceString(price)}</div>;
}

function ProductCardTrialDays({ trialDays, discount, selectedInterval }) {
  const { site } = useContext(AppContext);

  if (hasFreeTrialTier({ site })) {
    if (trialDays) {
      return (
        <span className="gh-portal-discount-label">
          {t('{trialDays} days free', { trialDays })}
        </span>
      );
    } else {
      return null;
    }
  }

  // One discount claim per price: the derived pill only renders when there is
  // a real (effective) yearly saving and no featured offer took its place
  if (selectedInterval === 'year' && discount > 0) {
    return (
      <span className="gh-portal-discount-label">{t('{discount}% discount', { discount })}</span>
    );
  }

  return null;
}

// A discounted price with cents must keep both decimals ($71.20, not $71.2)
function formatDiscountedAmount(amount) {
  if (Number.isInteger(amount)) {
    return formatNumber(amount);
  }
  return amount.toFixed(2);
}

// Effective (post-featured-offer) amount in cents for derived comparisons,
// so Portal never advertises a saving an offer has made false
function getEffectiveAmountCents({ site, product, interval }) {
  const price = interval === 'year' ? product?.yearlyPrice : product?.monthlyPrice;
  if (!price) {
    return null;
  }
  const offer = getFeaturedOffer({ site, product, interval });
  if (!offer) {
    return price.amount;
  }
  return Math.round(getUpdatedOfferPrice({ offer, price }) * 100);
}

function getEffectiveYearlyDiscount({ site, product }) {
  if (getProductCadences(product) !== 'all') {
    // A single-cadence tier has nothing to compare
    return 0;
  }
  return calculateDiscount(
    getEffectiveAmountCents({ site, product, interval: 'month' }),
    getEffectiveAmountCents({ site, product, interval: 'year' }),
  );
}

function ProductCardPrice({ product }) {
  const { selectedInterval, perCardMode, getCardInterval } = useContext(ProductsContext);
  const { site, member } = useContext(AppContext);
  const monthlyPrice = product.monthlyPrice;
  const yearlyPrice = product.yearlyPrice;
  const trialDays = product.trial_days;
  // In per-card mode the card's own toggle decides; otherwise single-cadence
  // tiers stay visible on both global toggle positions with their real price
  const resolvedInterval =
    perCardMode && getCardInterval ? getCardInterval(product) : selectedInterval;
  const activePrice = getProductPriceForInterval(product, resolvedInterval);
  if (!activePrice) {
    return null;
  }
  const shownInterval = activePrice.interval;
  const singleCadence = getProductCadences(product) !== 'all';
  const alternatePrice = singleCadence
    ? null
    : shownInterval === 'month'
      ? yearlyPrice
      : monthlyPrice;
  const interval = shownInterval === 'year' ? t('year') : t('month');

  // Featured offers are a signup-side feature: paid/comped members changing
  // plans can't redeem signup offers, so they never see the discounted price
  const memberCanRedeemSignupOffers =
    !member || (!member.paid && !isComplimentaryMember({ member }));
  const featuredOffer = memberCanRedeemSignupOffers
    ? getFeaturedOffer({ site, product, interval: shownInterval })
    : null;
  // One discount claim per price: a featured offer replaces the derived
  // yearly pill, any pill that still renders uses effective amounts, and in
  // per-card mode the save claim lives on the card's own toggle instead
  const yearlyDiscount =
    featuredOffer || perCardMode ? 0 : getEffectiveYearlyDiscount({ site, product });
  const currencySymbol = getCurrencySymbol(activePrice.currency);

  const priceBlock = featuredOffer ? (
    <div className="gh-portal-product-price">
      <span className="gh-portal-featured-offer-original" data-testid="featured-offer-original">
        {currencySymbol}
        {formatNumber(getStripeAmount(activePrice.amount))}
      </span>
      <span className={'currency-sign' + (currencySymbol.length > 1 ? ' long' : '')}>
        {currencySymbol}
      </span>
      <span className="amount" data-testid="product-amount">
        {formatDiscountedAmount(getUpdatedOfferPrice({ offer: featuredOffer, price: activePrice }))}
      </span>
      <span className="billing-period">/{interval}</span>
    </div>
  ) : (
    <div className="gh-portal-product-price">
      <span className={'currency-sign' + (currencySymbol.length > 1 ? ' long' : '')}>
        {currencySymbol}
      </span>
      <span className="amount" data-testid="product-amount">
        {formatNumber(getStripeAmount(activePrice.amount))}
      </span>
      <span className="billing-period">/{interval}</span>
    </div>
  );

  // The chip is a derived statement of the discount terms — never the
  // offer's display_title, which is the publisher's headline for the offer
  // page and can say anything
  const featuredOfferLabel = featuredOffer ? (
    <span className="gh-portal-discount-label" data-testid="featured-offer-label">
      {t('{amount} off', { amount: getOfferOffAmount({ offer: featuredOffer }) })}
    </span>
  ) : null;

  // In per-card mode a single-cadence card states its terms plainly; in
  // global mode the note only earns its place when the surrounding page
  // offers the other cadence — on a uniformly single-cadence site it's noise
  const otherPlanAvailable = (site?.portal_plans || []).includes(
    shownInterval === 'year' ? 'monthly' : 'yearly',
  );
  const alternateSlot = singleCadence ? (
    perCardMode ? (
      <div className="gh-portal-single-cadence-label" data-testid="single-cadence-label">
        {shownInterval === 'year' ? t('Billed yearly') : t('Billed monthly')}
      </div>
    ) : otherPlanAvailable ? (
      <div className="gh-portal-single-cadence-label" data-testid="single-cadence-label">
        {shownInterval === 'year' ? t('Yearly only') : t('Monthly only')}
      </div>
    ) : null
  ) : (
    <ProductCardAlternatePrice price={alternatePrice} />
  );

  if (hasFreeTrialTier({ site })) {
    return (
      <>
        <div className="gh-portal-product-card-pricecontainer">
          <div className="gh-portal-product-card-price-trial">
            {priceBlock}
            {featuredOfferLabel || (
              <ProductCardTrialDays
                trialDays={trialDays}
                discount={yearlyDiscount}
                selectedInterval={shownInterval}
              />
            )}
          </div>
          {shownInterval === 'year' && !featuredOffer ? (
            <YearlyDiscount discount={yearlyDiscount} trialDays={trialDays} />
          ) : (
            ''
          )}
          {alternateSlot}
        </div>
        {/* <span className="after-trial-amount">Then {currencySymbol}{formatNumber(getStripeAmount(activePrice.amount))}/{activePrice.interval}</span> */}
      </>
    );
  }

  return (
    <div className="gh-portal-product-card-pricecontainer">
      <div className="gh-portal-product-card-price-trial">
        {priceBlock}
        {featuredOfferLabel}
        {shownInterval === 'year' && !featuredOffer ? (
          <YearlyDiscount discount={yearlyDiscount} />
        ) : (
          ''
        )}
      </div>
      {alternateSlot}
    </div>
  );
}

function FreeProductCard({ products, handleChooseSignup, error }) {
  const { site, action } = useContext(AppContext);
  const { selectedProduct, setSelectedProduct } = useContext(ProductsContext);

  let cardClass =
    selectedProduct === 'free'
      ? 'gh-portal-product-card free checked'
      : 'gh-portal-product-card free';
  const product = getFreeProduct({ site });
  let freeProductDescription = getFreeTierDescription({ site });

  let disabled = action === 'signup:running' ? true : false;

  if (isCookiesDisabled()) {
    disabled = true;
  }

  // @TODO: doublecheck this!
  let currencySymbol = '$';
  const currencyPrice = products?.[1] ? products[1].monthlyPrice || products[1].yearlyPrice : null;
  if (currencyPrice) {
    currencySymbol = getCurrencySymbol(currencyPrice.currency);
  }

  const hasOnlyFree = hasOnlyFreeProduct({ site });
  const freeBenefits = getFreeProductBenefits({ site });

  if (hasOnlyFree) {
    if (!freeProductDescription && !freeBenefits.length) {
      return null;
    }
    cardClass += ' only-free';
  }

  if (!freeProductDescription && !freeBenefits.length) {
    freeProductDescription = 'Free preview';
  }

  return (
    <>
      <div
        className={cardClass}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedProduct('free');
        }}
        data-test-tier="free"
      >
        <div className="gh-portal-product-card-header">
          <h4 className="gh-portal-product-name">{getFreeTierTitle({ site })}</h4>
          {!hasOnlyFree ? (
            <div className="gh-portal-product-card-pricecontainer free-trial-disabled">
              <div className="gh-portal-product-price">
                <span className={'currency-sign' + (currencySymbol.length > 1 ? ' long' : '')}>
                  {currencySymbol}
                </span>
                <span className="amount" data-testid="product-amount">
                  0
                </span>
              </div>
              {/* <div className="gh-portal-product-alternative-price"></div> */}
            </div>
          ) : (
            ''
          )}
        </div>
        <div className="gh-portal-product-card-details">
          <div className="gh-portal-product-card-detaildata">
            {freeProductDescription ? (
              <div className="gh-portal-product-description" data-testid="product-description">
                {freeProductDescription}
              </div>
            ) : (
              ''
            )}
            <ProductBenefitsContainer product={product} />
          </div>
          {!hasOnlyFree ? (
            <div className="gh-portal-btn-product">
              {}
              <button
                data-test-button="select-tier"
                className="gh-portal-btn"
                disabled={disabled}
                onClick={(e) => {
                  handleChooseSignup(e, 'free');
                }}
              >
                {selectedProduct === 'free' && disabled ? (
                  <LoaderIcon className="gh-portal-loadingicon" />
                ) : (
                  t('Choose')
                )}
              </button>
              {error && <div className="gh-portal-error-message">{error}</div>}
            </div>
          ) : (
            ''
          )}
        </div>
      </div>
    </>
  );
}

function ProductCardButton({ selectedProduct, product, disabled, noOfProducts, trialDays }) {
  if (selectedProduct === product.id && disabled) {
    return <LoaderIcon className="gh-portal-loadingicon" />;
  }

  if (trialDays > 0) {
    return (
      <Interpolate
        string={t('Start {amount}-day free trial')}
        mapping={{
          amount: trialDays,
        }}
      />
    );
  }

  return noOfProducts > 1 ? t('Choose') : t('Continue');
}

// The per-card cadence toggle for mixed catalogs: it only renders on cards
// that actually have a choice, and its save claim is scoped to this card,
// computed from effective (post-featured-offer) prices
function CardIntervalToggle({ product }) {
  const { site } = useContext(AppContext);
  const { getCardInterval, setCardInterval, setSelectedProduct } = useContext(ProductsContext);
  const interval = getCardInterval(product);
  const discount = getEffectiveYearlyDiscount({ site, product });

  const choose = (e, value) => {
    e.stopPropagation();
    setCardInterval(product.id, value);
    setSelectedProduct(product.id);
  };

  return (
    <div className="gh-portal-card-pricetoggle" data-testid={`card-interval-toggle-${product.id}`}>
      <button
        className={interval === 'month' ? 'active' : ''}
        data-test-button="card-switch-monthly"
        type="button"
        onClick={(e) => choose(e, 'month')}
      >
        {t('Monthly')}
      </button>
      <button
        className={interval === 'year' ? 'active' : ''}
        data-test-button="card-switch-yearly"
        type="button"
        onClick={(e) => choose(e, 'year')}
      >
        {t('Yearly')}
        {discount > 0 && (
          <span className="gh-portal-card-save">{t('Save {discount}%', { discount })}</span>
        )}
      </button>
    </div>
  );
}

function ProductCard({ product, products, selectedInterval, handleChooseSignup, error }) {
  const { selectedProduct, setSelectedProduct, perCardMode, getCardInterval } =
    useContext(ProductsContext);
  const { action } = useContext(AppContext);
  const trialDays = product.trial_days;

  const cardClass =
    selectedProduct === product.id ? 'gh-portal-product-card checked' : 'gh-portal-product-card';
  const noOfProducts = products?.filter((d) => {
    return d.type === 'paid';
  })?.length;

  let disabled = ['signup:running', 'checkoutPlan:running'].includes(action) ? true : false;

  if (isCookiesDisabled()) {
    disabled = true;
  }

  let productDescription = product.description;
  if ((!product.benefits || !product.benefits.length) && !productDescription) {
    productDescription = 'Full access';
  }

  return (
    <>
      <div
        className={cardClass}
        key={product.id}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedProduct(product.id);
        }}
        data-test-tier="paid"
      >
        <div className="gh-portal-product-card-header">
          <h4 className="gh-portal-product-name">{product.name}</h4>
          {perCardMode && getProductCadences(product) === 'all' && (
            <CardIntervalToggle product={product} />
          )}
          <ProductCardPrice product={product} />
        </div>
        <div className="gh-portal-product-card-details">
          <div className="gh-portal-product-card-detaildata">
            <div className="gh-portal-product-description" data-testid="product-description">
              {productDescription}
            </div>
            <ProductBenefitsContainer product={product} />
          </div>
          <div className="gh-portal-btn-product">
            <button
              data-test-button="select-tier"
              disabled={disabled}
              className="gh-portal-btn"
              onClick={(e) => {
                const selectedPrice = getSelectedPrice({
                  products,
                  selectedInterval:
                    perCardMode && getCardInterval ? getCardInterval(product) : selectedInterval,
                  selectedProduct: product.id,
                });
                handleChooseSignup(e, selectedPrice.id);
              }}
            >
              <ProductCardButton
                {...{ selectedProduct, product, disabled, noOfProducts, trialDays }}
              />
            </button>
            {error && <div className="gh-portal-error-message">{error}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

function getProductErrorMessage({ product, products, selectedInterval, errors }) {
  const selectedPrice = getSelectedPrice({
    products,
    selectedInterval,
    selectedProduct: product.id,
  });
  if (selectedPrice && selectedPrice.id && errors && errors[selectedPrice.id]) {
    return errors[selectedPrice.id];
  }
  return null;
}

function ProductCards({ products, selectedInterval, handleChooseSignup, errors }) {
  return products.map((product) => {
    const error = getProductErrorMessage({ product, products, selectedInterval, errors });
    if (product.id === 'free') {
      return (
        <FreeProductCard
          products={products}
          key={product.id}
          handleChooseSignup={handleChooseSignup}
          error={error}
        />
      );
    }
    return (
      <ProductCard
        products={products}
        product={product}
        selectedInterval={selectedInterval}
        key={product.id}
        handleChooseSignup={handleChooseSignup}
        error={error}
      />
    );
  });
}

function YearlyDiscount({ discount }) {
  const { site } = useContext(AppContext);
  const { portal_plans: portalPlans } = site;

  if (discount === 0 || !portalPlans.includes('monthly')) {
    return null;
  }

  if (hasFreeTrialTier({ site })) {
    return (
      <>
        <span className="gh-portal-discount-label-trial">
          {t('{discount}% discount', { discount })}
        </span>
      </>
    );
  } else {
    return (
      <>
        <span className="gh-portal-discount-label">{t('{discount}% discount', { discount })}</span>
      </>
    );
  }
}

function ProductPriceSwitch({ selectedInterval, setSelectedInterval, products }) {
  const { site } = useContext(AppContext);
  const { portal_plans: portalPlans } = site;
  const paidProducts = products.filter((product) => product.type !== 'free');

  // The "(save X%)" claim is derived, so it only counts tiers that offer both
  // cadences and it compares effective (post-featured-offer) amounts
  const prices = paidProducts
    .filter((product) => getProductCadences(product) === 'all')
    .map((product) => getEffectiveYearlyDiscount({ site, product }));

  const highestYearlyDiscount = prices.length > 0 ? Math.max(...prices) : 0;

  if (!portalPlans.includes('monthly') || !portalPlans.includes('yearly')) {
    return null;
  }

  return (
    <div className="gh-portal-logged-out-form-container">
      <div
        className={'gh-portal-products-pricetoggle' + (selectedInterval === 'month' ? ' left' : '')}
      >
        <button
          data-test-button="switch-monthly"
          data-testid="monthly-switch"
          className={'gh-portal-btn' + (selectedInterval === 'month' ? ' active' : '')}
          onClick={() => {
            setSelectedInterval('month');
          }}
        >
          {t('Monthly')}
        </button>
        <button
          data-test-button="switch-yearly"
          data-testid="yearly-switch"
          className={'gh-portal-btn' + (selectedInterval === 'year' ? ' active' : '')}
          onClick={() => {
            setSelectedInterval('year');
          }}
        >
          {t('Yearly')}
          {highestYearlyDiscount > 0 && (
            <span className="gh-portal-maximum-discount">
              {t('(save {highestYearlyDiscount}%)', { highestYearlyDiscount })}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function getSelectedPrice({ products, selectedProduct, selectedInterval }) {
  let selectedPrice = null;
  if (selectedProduct === 'free') {
    selectedPrice = { id: 'free' };
  } else {
    let product = products.find((prod) => prod.id === selectedProduct);
    if (!product) {
      product = products.find((p) => p.type === 'paid');
    }
    // Falls back to a single-cadence tier's one available price, so choosing
    // a yearly-only tier from the monthly toggle checks out yearly
    selectedPrice = product ? getProductPriceForInterval(product, selectedInterval) : null;
  }
  return selectedPrice;
}

function ProductsSection({ onPlanSelect, products, type = null, handleChooseSignup, errors }) {
  const { site, member } = useContext(AppContext);
  const { portal_plans: portalPlans, portal_default_plan: portalDefaultPlan } = site;
  const defaultProductId = products.length > 0 ? products[0].id : 'free';

  // Note: by default we set it to null, so that it changes reactively in the preview version of Portal
  const [selectedInterval, setSelectedInterval] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(defaultProductId);
  const [cardIntervals, setCardIntervals] = useState({});

  const activeInterval = getActiveInterval({ portalPlans, portalDefaultPlan, selectedInterval });

  // Uniform-dual catalogs keep the classic global toggle; a catalog with any
  // single-cadence tier switches to per-card billing controls
  const paidProducts = products.filter((p) => p && p.type === 'paid');
  const perCardMode =
    paidProducts.length > 0 && !paidProducts.every((p) => getProductCadences(p) === 'all');

  const getCardInterval = (product) => {
    if (!product || product.type !== 'paid') {
      return activeInterval;
    }
    const cadences = getProductCadences(product);
    if (cadences !== 'all') {
      return cadences;
    }
    return cardIntervals[product.id] || activeInterval;
  };

  const setCardInterval = (productId, interval) => {
    setCardIntervals((state) => ({ ...state, [productId]: interval }));
  };

  const selectedProductObject = products.find((p) => p && p.id === selectedProduct);
  const selectedPrice = getSelectedPrice({
    products,
    selectedProduct,
    selectedInterval:
      perCardMode && selectedProductObject
        ? getCardInterval(selectedProductObject)
        : selectedInterval,
  });

  const isComplimentary = isComplimentaryMember({ member });
  const hasOnlyFree = hasOnlyFreeProduct({ site });

  useEffect(() => {
    setSelectedProduct(defaultProductId);
  }, [defaultProductId]);

  useEffect(() => {
    onPlanSelect(null, selectedPrice.id);
  }, [selectedPrice.id, onPlanSelect]);

  if (products.length === 0) {
    if (isComplimentary) {
      const supportAddress = getSupportAddress({ site });
      return (
        <p style={{ textAlign: 'center' }}>
          {t('Please contact {supportAddress} to adjust your complimentary subscription.', {
            supportAddress,
          })}
        </p>
      );
    } else {
      return null;
    }
  }

  let className = 'gh-portal-products';
  if (type === 'upgrade') {
    className += ' gh-portal-upgrade-product';
  }

  let finalProduct =
    products.find((p) => p.id === selectedProduct)?.id ||
    products.find((p) => p.type === 'paid')?.id;
  return (
    <ProductsContext.Provider
      value={{
        selectedInterval: activeInterval,
        selectedProduct: finalProduct,
        setSelectedProduct,
        perCardMode,
        getCardInterval,
        setCardInterval,
      }}
    >
      <section className={className}>
        {!hasOnlyFree && !perCardMode ? (
          <ProductPriceSwitch
            products={products}
            selectedInterval={activeInterval}
            setSelectedInterval={setSelectedInterval}
          />
        ) : (
          ''
        )}

        <div className="gh-portal-products-grid">
          <ProductCards
            products={products}
            selectedInterval={activeInterval}
            handleChooseSignup={handleChooseSignup}
            errors={errors}
          />
        </div>
      </section>
    </ProductsContext.Provider>
  );
}

export function ChangeProductSection({ onPlanSelect, selectedPlan, products, type = null }) {
  const { site, member } = useContext(AppContext);
  const { portal_plans: portalPlans } = site;
  const activePrice = getMemberActivePrice({ member });
  const activeMemberProduct = getProductFromPrice({ site, priceId: activePrice.id });
  const defaultInterval = getActiveInterval({
    portalPlans,
    selectedInterval: activePrice.interval,
  });
  const defaultProductId = activeMemberProduct?.id || products?.[0]?.id;
  const [selectedInterval, setSelectedInterval] = useState(defaultInterval);
  const [selectedProduct, setSelectedProduct] = useState(defaultProductId);

  // const selectedPrice = getSelectedPrice({products, selectedInterval, selectedProduct});
  const activeInterval = getActiveInterval({ portalPlans, selectedInterval });

  useEffect(() => {
    setSelectedProduct(defaultProductId);
  }, [defaultProductId]);

  if (!portalPlans.includes('monthly') && !portalPlans.includes('yearly')) {
    return null;
  }

  if (products.length === 0) {
    return null;
  }

  let className = 'gh-portal-products';
  if (type === 'upgrade') {
    className += ' gh-portal-upgrade-product';
  }
  if (type === 'changePlan') {
    className += ' gh-portal-upgrade-product gh-portal-change-plan';
  }

  return (
    <ProductsContext.Provider
      value={{
        selectedInterval: activeInterval,
        selectedProduct,
        selectedPlan,
        setSelectedProduct,
      }}
    >
      <section className={className}>
        <ProductPriceSwitch
          selectedInterval={activeInterval}
          setSelectedInterval={setSelectedInterval}
          products={products}
        />

        <div className="gh-portal-products-grid">
          <ChangeProductCards products={products} onPlanSelect={onPlanSelect} />
        </div>
        {/* <ActionButton
                    onClick={e => onPlanSelect(null, selectedPrice?.id)}
                    isRunning={false}
                    disabled={!selectedPrice?.id || (activePrice.id === selectedPrice?.id)}
                    isPrimary={true}
                    brandColor={brandColor}
                    label={'Continue'}
                    style={{height: '40px', width: '100%', marginTop: '24px'}}
                /> */}
      </section>
    </ProductsContext.Provider>
  );
}

function ProductDescription({ product }) {
  if (product?.description) {
    return (
      <div className="gh-portal-product-description" data-testid="product-description">
        {product.description}
      </div>
    );
  }
  return null;
}

function ChangeProductCard({ product, onPlanSelect }) {
  const { member, site } = useContext(AppContext);
  const { selectedProduct, setSelectedProduct, selectedInterval } = useContext(ProductsContext);
  const cardClass =
    selectedProduct === product.id ? 'gh-portal-product-card checked' : 'gh-portal-product-card';
  const memberActivePrice = getMemberActivePrice({ member });

  const selectedPrice = getProductPriceForInterval(product, selectedInterval);

  if (!selectedPrice) {
    return null;
  }

  const currentPlan = isMemberActivePrice({ member, site, priceId: selectedPrice.id });

  return (
    <div
      className={cardClass + (currentPlan ? ' disabled' : '')}
      key={product.id}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedProduct(product.id);
      }}
      data-test-tier="paid"
    >
      <div className="gh-portal-product-card-header">
        <h4 className="gh-portal-product-name">{product.name}</h4>
        <ProductCardPrice product={product} />
      </div>
      <div className="gh-portal-product-card-details">
        <div className="gh-portal-product-card-detaildata">
          {product.description ? (
            <ProductDescription
              product={product}
              selectedPrice={selectedPrice}
              activePrice={memberActivePrice}
            />
          ) : (
            ''
          )}
          <ProductBenefitsContainer product={product} />
        </div>
        {currentPlan ? (
          <div className="gh-portal-btn-product">
            <span className="gh-portal-current-plan">
              <span>{t('Current plan')}</span>
            </span>
          </div>
        ) : (
          <div className="gh-portal-btn-product">
            <button
              data-test-button="select-tier"
              className="gh-portal-btn"
              onClick={() => {
                onPlanSelect(null, selectedPrice?.id);
              }}
            >
              {t('Choose')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeProductCards({ products, onPlanSelect }) {
  return products.map((product) => {
    if (!product || product.id === 'free') {
      return null;
    }
    return <ChangeProductCard product={product} key={product.id} onPlanSelect={onPlanSelect} />;
  });
}

export default ProductsSection;
