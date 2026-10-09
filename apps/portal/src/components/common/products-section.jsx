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
  formatPrice,
  isCookiesDisabled,
  hasOnlyFreeProduct,
  isMemberActivePrice,
  hasFreeTrialTier,
  isComplimentaryMember,
  getActiveInterval,
} from '../../utils/helpers';
import AppContext from '../../app-context';
import calculateDiscount from '../../utils/discount';
import Interpolate from '@doist/react-interpolate';
import { t } from '../../utils/i18n';
import { amountClass } from '../shared-classes';
import { tw } from '../../utils/tw';

const productCardClass = tw`relative flex min-h-[200px] max-w-[420px] min-w-[320px] flex-1 flex-col items-start justify-stretch rounded-[7px] border border-solid border-gray-300 bg-white p-8 transition-input max-[671px]:min-h-[unset] max-sm:min-w-[unset] [&.checked]:before:pointer-events-none [&.checked]:before:absolute [&.checked]:before:inset-[-2px] [&.checked]:before:z-[999] [&.checked]:before:block [&.checked]:before:rounded-[7px] [&.checked]:before:border-0 [&.checked]:before:border-solid [&.checked]:before:border-brand [&.checked]:before:content-[''] [&.only-free]:mb-4 [&.only-free]:min-h-[unset] [&:not(.disabled):hover]:border-gray-400`;

const tierButtonClass = tw`gh-portal-btn relative z-[900] flex h-11 w-full min-w-[80px] cursor-pointer items-center justify-center rounded-md bg-brand px-[1.8rem] py-0 text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-white no-underline outline-none select-none [border:none] transition-control hover:opacity-90 disabled:cursor-auto disabled:opacity-50! max-xl:h-[42px]`;

const toggleButtonClass = tw`gh-portal-btn relative flex h-full! w-1/2 min-w-[80px] cursor-pointer items-center justify-center rounded-full bg-transparent px-[1.8rem] py-0 text-center text-15 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-black no-underline outline-none select-none [border:0] transition-control`;

const btnProductClass = tw`sticky bottom-0 -mb-8 flex w-full flex-col items-start [justify-self:flex-end] bg-transparent pt-10 pb-8 before:absolute before:inset-x-0 before:top-[-16px] before:bottom-0 before:z-[800] before:block before:bg-[linear-gradient(0deg,rgba(var(--whitergb),1)_60%,rgba(var(--whitergb),0)_100%)] before:content-[''] max-sm:static max-sm:before:hidden`;

const discountLabelClass = tw`gh-portal-discount-label relative -me-1 max-h-[24.5px] rounded-full px-[9px] py-1.5 text-center text-12.5 leading-[1em] font-semibold tracking-[0.3px] whitespace-nowrap text-black before:absolute before:inset-0 before:block before:rounded-full before:bg-brand before:opacity-20 before:content-['']`;

const loaderIconClass = tw`gh-portal-loadingicon absolute left-1/2 -ms-[19px] inline-block h-[31px] [&_path]:fill-white [&_rect]:fill-white`;

const currencySignClass = (currencySymbol) =>
  tw`self-start text-27 leading-[1.135em] font-bold max-[371px]:text-18` +
  (currencySymbol.length > 1 ? ' long me-[5px]' : '');

const ProductsContext = React.createContext({
  selectedInterval: 'month',
  selectedProduct: 'free',
  selectedPlan: null,
  setSelectedProduct: null,
});

function ProductBenefits({ product }) {
  if (!product.benefits || !product.benefits.length) {
    return null;
  }

  return product.benefits.map((benefit, idx) => {
    const key = benefit?.id || `benefit-${idx}`;
    return (
      <div className="mb-2.5 flex items-start max-[671px]:last-of-type:mb-0" key={key}>
        <CheckmarkIcon
          className="mt-[3px] mr-2.5 size-[14px] min-w-[14px] overflow-visible rtl:mr-0 rtl:ml-2.5"
          aria-hidden="true"
        />
        <div>{benefit.name}</div>
      </div>
    );
  });
}

function ProductBenefitsContainer({ product, hide = false }) {
  if (!product.benefits || !product.benefits.length || hide) {
    return null;
  }

  const className = tw`mt-4 w-full text-15 leading-[1.4em]`;
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
    return (
      <div className="gh-portal-product-alternative-price hidden text-13 leading-[1.6em] tracking-[0.3px] text-gray-500"></div>
    );
  }

  return (
    <div className="gh-portal-product-alternative-price hidden text-13 leading-[1.6em] tracking-[0.3px] text-gray-500">
      {getPriceString(price, site.locale)}
    </div>
  );
}

function ProductCardTrialDays({ trialDays, discount, selectedInterval }) {
  const { site } = useContext(AppContext);

  if (hasFreeTrialTier({ site })) {
    if (trialDays) {
      return (
        <span className={discountLabelClass}>{t('{trialDays} days free', { trialDays })}</span>
      );
    } else {
      return null;
    }
  }

  if (selectedInterval === 'year') {
    return <span className={discountLabelClass}>{t('{discount}% discount', { discount })}</span>;
  }

  return null;
}

function ProductCardPrice({ product }) {
  const { selectedInterval } = useContext(ProductsContext);
  const { site } = useContext(AppContext);
  const monthlyPrice = product.monthlyPrice;
  const yearlyPrice = product.yearlyPrice;
  const trialDays = product.trial_days;
  const activePrice = selectedInterval === 'month' ? monthlyPrice : yearlyPrice;
  const alternatePrice = selectedInterval === 'month' ? yearlyPrice : monthlyPrice;
  const interval = activePrice.interval === 'year' ? t('year') : t('month');
  if (!monthlyPrice || !yearlyPrice) {
    return null;
  }

  const yearlyDiscount = calculateDiscount(product.monthlyPrice.amount, product.yearlyPrice.amount);
  const currencySymbol = getCurrencySymbol(activePrice.currency);

  if (hasFreeTrialTier({ site })) {
    return (
      <>
        <div className="mt-4 flex w-full flex-col items-start">
          <div className="flex w-full flex-row flex-wrap items-end justify-between gap-x-[4px] gap-y-[10px]">
            <div className="gh-portal-product-price flex justify-center text-black">
              <span className={currencySignClass(currencySymbol)}>{currencySymbol}</span>
              <span className={amountClass} data-testid="product-amount">
                {formatPrice(getStripeAmount(activePrice.amount), site.locale)}
              </span>
              <span className="ms-[5px] self-end text-15 leading-[1.6em] tracking-[0.3px] text-gray-800">
                /{interval}
              </span>
            </div>
            <ProductCardTrialDays
              trialDays={trialDays}
              discount={yearlyDiscount}
              selectedInterval={selectedInterval}
            />
          </div>
          {selectedInterval === 'year' ? (
            <YearlyDiscount discount={yearlyDiscount} trialDays={trialDays} />
          ) : (
            ''
          )}
          <ProductCardAlternatePrice price={alternatePrice} />
        </div>
        {/* <span className="after-trial-amount">Then {currencySymbol}{formatPrice(getStripeAmount(activePrice.amount), site.locale)}/{activePrice.interval}</span> */}
      </>
    );
  }

  return (
    <div className="mt-4 flex w-full flex-col items-start">
      <div className="flex w-full flex-row flex-wrap items-end justify-between gap-x-[4px] gap-y-[10px]">
        <div className="gh-portal-product-price flex justify-center text-black">
          <span className={currencySignClass(currencySymbol)}>{currencySymbol}</span>
          <span className={amountClass} data-testid="product-amount">
            {formatPrice(getStripeAmount(activePrice.amount), site.locale)}
          </span>
          <span className="ms-[5px] self-end text-15 leading-[1.6em] tracking-[0.3px] text-gray-800">
            /{interval}
          </span>
        </div>
        {selectedInterval === 'year' ? <YearlyDiscount discount={yearlyDiscount} /> : ''}
      </div>
      <ProductCardAlternatePrice price={alternatePrice} />
    </div>
  );
}

function FreeProductCard({ products, handleChooseSignup, error }) {
  const { site, action } = useContext(AppContext);
  const { selectedProduct, setSelectedProduct } = useContext(ProductsContext);

  let cardClass =
    (selectedProduct === 'free'
      ? 'gh-portal-product-card free checked'
      : 'gh-portal-product-card free') +
    ' ' +
    productCardClass;
  const product = getFreeProduct({ site });
  let freeProductDescription = getFreeTierDescription({ site });

  let disabled = action === 'signup:running' ? true : false;

  if (isCookiesDisabled()) {
    disabled = true;
  }

  // @TODO: doublecheck this!
  let currencySymbol = '$';
  if (products && products[1]) {
    currencySymbol = getCurrencySymbol(products[1].monthlyPrice.currency);
  } else {
    currencySymbol = '$';
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
        <div className="min-h-[56px] w-full max-md:min-h-[unset] [.only-free_&]:min-h-[unset]">
          <h4 className="-mt-1 w-full text-18 leading-[1.3em] font-semibold tracking-[0px] [word-break:break-word] text-brand">
            {getFreeTierTitle({ site })}
          </h4>
          {!hasOnlyFree ? (
            <div className="free-trial-disabled mt-4 flex w-full flex-col items-start">
              <div className="gh-portal-product-price flex justify-center text-black">
                <span className={currencySignClass(currencySymbol)}>{currencySymbol}</span>
                <span className={amountClass} data-testid="product-amount">
                  0
                </span>
              </div>
              {/* <div className="gh-portal-product-alternative-price"></div> */}
            </div>
          ) : (
            ''
          )}
        </div>
        <div className="flex w-full flex-1 flex-col">
          <div className="flex-1">
            {freeProductDescription ? (
              <div
                className="mt-4 w-full text-15.5 leading-[1.4em] font-semibold"
                data-testid="product-description"
              >
                {freeProductDescription}
              </div>
            ) : (
              ''
            )}
            <ProductBenefitsContainer product={product} />
          </div>
          {!hasOnlyFree ? (
            <div className={btnProductClass}>
              {}
              <button
                data-test-button="select-tier"
                className={tierButtonClass}
                disabled={disabled}
                onClick={(e) => {
                  handleChooseSignup(e, 'free');
                }}
              >
                {selectedProduct === 'free' && disabled ? (
                  <LoaderIcon className={loaderIconClass} />
                ) : (
                  t('Choose')
                )}
              </button>
              {error && (
                <div className="z-[900] -mb-10 min-h-[40px] pb-[13px] text-14 text-red">
                  {error}
                </div>
              )}
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
    return <LoaderIcon className={loaderIconClass} />;
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

function ProductCard({ product, products, selectedInterval, handleChooseSignup, error }) {
  const { selectedProduct, setSelectedProduct } = useContext(ProductsContext);
  const { action } = useContext(AppContext);
  const trialDays = product.trial_days;

  const cardClass =
    (selectedProduct === product.id ? 'gh-portal-product-card checked' : 'gh-portal-product-card') +
    ' ' +
    productCardClass;
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
        <div className="min-h-[56px] w-full max-md:min-h-[unset] [.only-free_&]:min-h-[unset]">
          <h4 className="-mt-1 w-full text-18 leading-[1.3em] font-semibold tracking-[0px] [word-break:break-word] text-brand">
            {product.name}
          </h4>
          <ProductCardPrice product={product} />
        </div>
        <div className="flex w-full flex-1 flex-col">
          <div className="flex-1">
            <div
              className="mt-4 w-full text-15.5 leading-[1.4em] font-semibold"
              data-testid="product-description"
            >
              {productDescription}
            </div>
            <ProductBenefitsContainer product={product} />
          </div>
          <div className={btnProductClass}>
            <button
              data-test-button="select-tier"
              disabled={disabled}
              className={tierButtonClass}
              onClick={(e) => {
                const selectedPrice = getSelectedPrice({
                  products,
                  selectedInterval,
                  selectedProduct: product.id,
                });
                handleChooseSignup(e, selectedPrice.id);
              }}
            >
              <ProductCardButton
                {...{ selectedProduct, product, disabled, noOfProducts, trialDays }}
              />
            </button>
            {error && (
              <div className="z-[900] -mb-10 min-h-[40px] pb-[13px] text-14 text-red">{error}</div>
            )}
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
        <span className="mt-1 text-13 leading-none font-semibold text-brand">
          {t('{discount}% discount', { discount })}
        </span>
      </>
    );
  } else {
    return (
      <>
        <span className={discountLabelClass}>{t('{discount}% discount', { discount })}</span>
      </>
    );
  }
}

function ProductPriceSwitch({ selectedInterval, setSelectedInterval, products }) {
  const { site } = useContext(AppContext);
  const { portal_plans: portalPlans } = site;
  const paidProducts = products.filter((product) => product.type !== 'free');

  // Extract discounts from products
  const prices = paidProducts.map((product) =>
    calculateDiscount(product.monthlyPrice?.amount, product.yearlyPrice?.amount),
  );

  // Find the highest price using Math.max
  const highestYearlyDiscount = Math.max(...prices);

  if (!portalPlans.includes('monthly') || !portalPlans.includes('yearly')) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <div
        className={
          tw`relative mb-10 flex h-11 w-full rounded-full bg-gray-100 p-1 before:absolute before:inset-y-1 before:right-1 before:block before:w-1/2 before:rounded-full before:bg-white before:[box-shadow:0px_1px_3px_rgba(var(--blackrgb),0.08)] before:content-[''] before:[transition:all_0.15s_ease-in-out] rtl:before:right-auto rtl:before:left-1 [&.left]:before:[transform:translateX(calc(-100%_+_8px))] rtl:[&.left]:before:[transform:translateX(calc(100%_-_8px))]` +
          (selectedInterval === 'month' ? ' left' : '')
        }
      >
        <button
          data-test-button="switch-monthly"
          data-testid="monthly-switch"
          className={toggleButtonClass + (selectedInterval === 'month' ? ' active' : '')}
          onClick={() => {
            setSelectedInterval('month');
          }}
        >
          {t('Monthly')}
        </button>
        <button
          data-test-button="switch-yearly"
          data-testid="yearly-switch"
          className={toggleButtonClass + (selectedInterval === 'year' ? ' active' : '')}
          onClick={() => {
            setSelectedInterval('year');
          }}
        >
          {t('Yearly')}
          {highestYearlyDiscount > 0 && (
            <span className="ms-1 font-normal opacity-50">
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
    selectedPrice = selectedInterval === 'month' ? product?.monthlyPrice : product?.yearlyPrice;
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

  const selectedPrice = getSelectedPrice({ products, selectedInterval, selectedProduct });
  const activeInterval = getActiveInterval({ portalPlans, portalDefaultPlan, selectedInterval });

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

  let className = tw`gh-portal-products flex flex-col items-center`;
  if (type === 'upgrade') {
    className += ' -mt-[70px] pt-[60px]';
  }
  const gridGapClass = type === 'upgrade' ? 'gap-[20px]' : 'gap-[40px] max-[671px]:gap-[20px]';

  const finalProduct =
    products.find((p) => p.id === selectedProduct)?.id ||
    products.find((p) => p.type === 'paid')?.id;
  return (
    <ProductsContext.Provider
      value={{
        selectedInterval: activeInterval,
        selectedProduct: finalProduct,
        setSelectedProduct,
      }}
    >
      <section className={className}>
        {!hasOnlyFree ? (
          <ProductPriceSwitch
            products={products}
            selectedInterval={activeInterval}
            setSelectedInterval={setSelectedInterval}
          />
        ) : (
          ''
        )}

        <div
          className={
            tw`mx-auto flex w-full flex-wrap items-stretch justify-center max-md:max-w-[420px] max-md:flex-col ` +
            gridGapClass
          }
        >
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

  let className = tw`gh-portal-products flex flex-col items-center`;
  if (type === 'upgrade') {
    className += ' -mt-[70px] pt-[60px]';
  }
  if (type === 'changePlan') {
    className += ' -mt-[70px] pt-[60px]';
  }
  const gridGapClass =
    type === 'upgrade' || type === 'changePlan'
      ? 'gap-[20px]'
      : 'gap-[40px] max-[671px]:gap-[20px]';

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

        <div
          className={
            tw`mx-auto flex w-full flex-wrap items-stretch justify-center max-md:max-w-[420px] max-md:flex-col ` +
            gridGapClass
          }
        >
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
      <div
        className="mt-4 w-full text-15.5 leading-[1.4em] font-semibold"
        data-testid="product-description"
      >
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
    (selectedProduct === product.id ? 'gh-portal-product-card checked' : 'gh-portal-product-card') +
    ' ' +
    productCardClass;
  const monthlyPrice = product.monthlyPrice;
  const yearlyPrice = product.yearlyPrice;
  const memberActivePrice = getMemberActivePrice({ member });

  const selectedPrice = selectedInterval === 'month' ? monthlyPrice : yearlyPrice;

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
      <div className="min-h-[56px] w-full max-md:min-h-[unset] [.only-free_&]:min-h-[unset]">
        <h4 className="-mt-1 w-full text-18 leading-[1.3em] font-semibold tracking-[0px] [word-break:break-word] text-brand">
          {product.name}
        </h4>
        <ProductCardPrice product={product} />
      </div>
      <div className="flex w-full flex-1 flex-col">
        <div className="flex-1">
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
          <div className={btnProductClass}>
            <span className="z-[900] flex h-11 w-full items-center justify-center rounded-[5px] bg-gray-50 text-center text-14 leading-[1em] font-medium tracking-[0.2px] whitespace-nowrap text-gray-800">
              <span>{t('Current plan')}</span>
            </span>
          </div>
        ) : (
          <div className={btnProductClass}>
            <button
              data-test-button="select-tier"
              className={tierButtonClass}
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
