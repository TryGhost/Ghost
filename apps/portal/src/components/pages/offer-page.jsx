import React from 'react';
import ActionButton from '../common/action-button';
import AppContext from '../../app-context';
import CheckmarkIcon from '../../images/icons/checkmark.svg?react';
import CloseButton from '../common/close-button';
import InputForm from '../common/input-form';
import {
  getCurrencySymbol,
  getProductFromId,
  getUpdatedOfferPrice,
  formatPrice,
  hasMultipleNewsletters,
} from '../../utils/helpers';
import { ValidateInputForm } from '../../utils/form';
import { interceptAnchorClicks } from '../../utils/links';
import { sanitizeHtml } from '../../utils/sanitize-html';
import NewsletterSelectionPage from './newsletter-selection-page';
import { t } from '../../utils/i18n';
import { translateCadence } from '../../utils/helpers';

const signupMessageButtonClass =
  'gh-portal-btn gh-portal-btn-link relative -mb-px !ms-1 flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md bg-transparent p-0 text-center text-md font-semibold leading-none tracking-[0.2px] text-black no-underline [border:none] [outline:none] [transition:all_0.25s_ease] hover:border-gray-300 hover:opacity-[0.85]';

const termsCheckboxClass =
  "checkbox relative top-[-1px] float-left mt-px inline-block size-[18px] shrink-0 rounded border border-solid border-gray-300 bg-white [transition:background_0.15s_ease-in-out,border-color_0.15s_ease-in-out] before:absolute before:left-[3px] before:top-1 before:h-1.5 before:w-2.5 before:opacity-0 before:content-[''] before:[border-color:currentcolor_currentcolor_theme(colors.white)_theme(colors.white)] before:[border-style:none_none_solid_solid] before:[border-width:0_0_2px_2px] before:[transform:rotate(-45deg)] before:[transition:opacity_0.15s_ease-in-out] rtl:float-right rtl:before:left-auto rtl:before:right-[3px] [.gh-portal-error_&]:border-red [.gh-portal-error_&]:[box-shadow:0_0_0_3px_rgb(240,37,37,.15)] [.gh-portal-error_input:checked+&]:[box-shadow:none] [.gh-portal-error_label:hover_input:not(:checked)+&]:border-red [input:checked+&]:border-black [input:checked+&]:bg-black [input:checked+&]:before:opacity-100 [label:hover_input:not(:checked)+&]:border-gray-400";

const offerBarClass = String.raw`gh-portal-offer-bar relative mb-6 rounded-md bg-white bg-[url("data:image/svg+xml,%3csvg\000020width='100%25'\000020height='99.9%25'\000020xmlns='http://www.w3.org/2000/svg'%3e%3crect\000020width='100%25'\000020height='100%25'\000020fill='none'\000020stroke='%23C3C3C3'\000020stroke-width='3'\000020stroke-dasharray='3%2c\0000209'\000020stroke-dashoffset='0'\000020stroke-linecap='square'/%3e%3c/svg%3e")] px-7 pb-7 pt-[26px]`;

const offerTitleClass =
  'mr-[110px] w-full text-xl rtl:ml-[110px] rtl:mr-0 [&.placeholder]:opacity-40';

const offerDiscountLabelClass =
  "gh-portal-discount-label absolute right-[25px] top-[23px] -me-1 max-h-[24.5px] whitespace-nowrap rounded-[999px] px-[9px] py-1.5 text-center text-[1.25rem] font-semibold leading-[1em] tracking-[0.3px] text-black before:absolute before:inset-0 before:block before:rounded-[999px] before:bg-brand before:opacity-20 before:content-['']";

const productNameClass =
  'gh-portal-product-name -mt-1 w-full text-xl font-semibold leading-[1.3em] tracking-[0px] text-brand [word-break:break-word]';

const productPriceClass = 'gh-portal-product-price flex justify-center text-black';

const currencySignClass = (currencyClass) =>
  'currency-sign ' +
  currencyClass +
  ' self-start text-[2.7rem] font-bold leading-[1.135em] max-[370px]:text-xl' +
  (currencyClass === 'long' ? ' me-[5px]' : '');

const amountClass =
  'amount text-[3.5rem] font-bold leading-[1em] tracking-[-1.3px] text-black max-[1440px]:text-[32px] max-[1440px]:tracking-[-0.022em]';

const footnoteClass = 'footnote mb-0 mt-1 text-[1.35rem] text-gray-500';

const productCardClass =
  'gh-portal-product-card relative flex min-h-0 min-w-[320px] max-w-none flex-1 flex-col items-start justify-stretch border border-gray-300 bg-white px-8 [transition:border-color_0.25s_ease-in-out] hover:border-gray-400 max-sm:min-w-[unset]';

export default class OfferPage extends React.Component {
  static contextType = AppContext;

  constructor(props, context) {
    super(props, context);
    this.state = {
      name: context?.member?.name || '',
      email: context?.member?.email || '',
      plan: 'free',
      showNewsletterSelection: false,
      termsCheckboxChecked: false,
    };
  }

  getFormErrors(state) {
    const checkboxRequired =
      this.context.site.portal_signup_checkbox_required &&
      this.context.site.portal_signup_terms_html;
    const checkboxError = checkboxRequired && !state.termsCheckboxChecked;

    return {
      ...ValidateInputForm({ fields: this.getInputFields({ state }) }),
      checkbox: checkboxError,
    };
  }

  getInputFields({ state, fieldNames }) {
    const { portal_name: portalName } = this.context.site;
    const { member } = this.context;
    const errors = state.errors || {};
    const fields = [
      {
        type: 'email',
        value: member?.email || state.email,
        placeholder: t('jamie@example.com'),
        label: t('Email'),
        name: 'email',
        disabled: !!member,
        required: true,
        tabIndex: 2,
        errorMessage: errors.email || '',
      },
    ];

    /** Show Name field if portal option is set*/
    let showNameField = !!portalName;

    /** Hide name field for logged in member if empty */
    if (!!member && !member?.name) {
      showNameField = false;
    }

    if (showNameField) {
      fields.unshift({
        type: 'text',
        value: member?.name || state.name,
        placeholder: t('Jamie Larson'),
        label: t('Name'),
        name: 'name',
        disabled: !!member,
        required: true,
        tabIndex: 1,
        errorMessage: errors.name || '',
      });
    }
    fields[0].autoFocus = true;
    if (fieldNames && fieldNames.length > 0) {
      return fields.filter((f) => {
        return fieldNames.includes(f.name);
      });
    }
    return fields;
  }

  renderSignupTerms() {
    const { site } = this.context;
    if (site.portal_signup_terms_html === null || site.portal_signup_terms_html === '') {
      return null;
    }

    const handleCheckboxChange = (e) => {
      this.setState({
        termsCheckboxChecked: e.target.checked,
      });
    };

    const termsText = (
      <div
        className="gh-portal-signup-terms-content [&_a]:font-medium [&_a]:text-brand [&_a]:no-underline [&_p]:mb-0 [&_p]:text-md [&_p]:leading-[1.25em] [&_p]:text-gray-900 [.gh-portal-error_&]:leading-[1.5em]"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(site.portal_signup_terms_html) }}
      ></div>
    );

    const signupTerms = site.portal_signup_checkbox_required ? (
      <label className="relative flex cursor-pointer gap-[10px]">
        <input
          className="absolute inset-y-0 right-0 hidden"
          type="checkbox"
          checked={!!this.state.termsCheckboxChecked}
          required={true}
          onChange={handleCheckboxChange}
        />
        <span className={termsCheckboxClass}></span>
        {termsText}
      </label>
    ) : (
      termsText
    );

    const errorClassName = this.state.errors?.checkbox ? 'gh-portal-error' : '';

    const className = `gh-portal-signup-terms ${errorClassName} mb-9 [&.gh-portal-error]:m-0 [&.gh-portal-error]:text-md [&.gh-portal-error]:leading-[1.6em] [&.gh-portal-error]:text-red`;

    return (
      <div className={className} onClick={interceptAnchorClicks}>
        {signupTerms}
      </div>
    );
  }

  onKeyDown(e) {
    // Handles submit on Enter press
    if (e.keyCode === 13) {
      this.handleSignup(e);
    }
  }

  handleSignup(e) {
    e.preventDefault();
    const { pageData: offer, site, member } = this.context;
    if (!offer || !offer.tier) {
      return null;
    }
    const product = getProductFromId({ site, productId: offer.tier.id });
    const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
    this.setState(
      (state) => {
        return {
          errors: this.getFormErrors(state),
        };
      },
      () => {
        const { doAction } = this.context;
        const { name, email, phonenumber, errors } = this.state;
        const hasFormErrors = errors && Object.values(errors).filter((d) => !!d).length > 0;
        if (!hasFormErrors) {
          const signupData = {
            name,
            email,
            plan: price?.id,
            offerId: offer?.id,
            phonenumber,
          };
          // Logged-in members are upgrading and already have newsletter preferences,
          // so they skip the newsletter selection step that new signups see.
          if (hasMultipleNewsletters({ site }) && !member) {
            this.setState({
              showNewsletterSelection: true,
              pageData: signupData,
              errors: {},
            });
          } else {
            doAction('signup', signupData);
            this.setState({
              errors: {},
            });
          }
        }
      },
    );
  }

  handleInputChange(e, field) {
    const fieldName = field.name;
    const value = e.target.value;
    this.setState({
      [fieldName]: value,
    });
  }

  renderSiteLogo() {
    const { site } = this.context;

    const siteLogo = site.icon;

    const logoStyle = {};

    if (siteLogo) {
      logoStyle.backgroundImage = `url(${siteLogo})`;
      return (
        <img
          className="gh-portal-signup-logo relative mb-2.5 mt-3 block size-[60px] rounded-sm bg-cover bg-[position:50%] max-sm:size-12"
          src={siteLogo}
          alt={site.title}
        />
      );
    }
    return null;
  }

  renderFormHeader() {
    const { site } = this.context;
    const siteTitle = site.title || '';
    return (
      <header className="gh-portal-signup-header mb-8 flex flex-col items-center px-8 max-[390px]:pb-4">
        {this.renderSiteLogo()}
        <h2 className="gh-portal-main-title mt-3 text-pretty text-center leading-[1.1em] text-black [.gh-portal-signup-logo+&]:mt-1">
          {siteTitle}
        </h2>
      </header>
    );
  }

  renderForm() {
    const fields = this.getInputFields({ state: this.state });

    if (this.state.showNewsletterSelection) {
      return (
        <NewsletterSelectionPage
          pageData={this.state.pageData}
          onBack={() => {
            this.setState({
              showNewsletterSelection: false,
            });
          }}
        />
      );
    }

    return (
      <section>
        <div className="gh-portal-section mb-10">
          <InputForm
            fields={fields}
            onChange={(e, field) => this.handleInputChange(e, field)}
            onKeyDown={(e) => this.onKeyDown(e)}
          />
        </div>
      </section>
    );
  }

  renderSubmitButton() {
    const { action, brandColor } = this.context;
    const { pageData: offer } = this.context;
    let label = t('Continue');

    if (offer.type === 'trial') {
      label = t('Start {amount}-day free trial', { amount: offer.amount });
    }

    let isRunning = false;
    if (action === 'signup:running') {
      label = t('Sending...');
      isRunning = true;
    }
    let retry = false;
    if (action === 'signup:failed') {
      label = t('Retry');
      retry = true;
    }

    const disabled = action === 'signup:running' ? true : false;
    return (
      <ActionButton
        style={{ width: '100%' }}
        retry={retry}
        onClick={(e) => this.handleSignup(e)}
        disabled={disabled}
        brandColor={brandColor}
        label={label}
        isRunning={isRunning}
        tabIndex={3}
        classes={'sticky bottom'}
      />
    );
  }

  renderLoginMessage() {
    const { member } = this.context;
    if (member) {
      return null;
    }
    const { brandColor, doAction } = this.context;
    return (
      <div className="gh-portal-signup-message z-[9999] mt-1 flex flex-wrap justify-center text-base text-gray-900 [&_*]:z-[9999]">
        <div>{t('Already a member?')}</div>
        <button
          className={signupMessageButtonClass}
          style={{ color: brandColor }}
          onClick={() => doAction('switchPage', { page: 'signin' })}
        >
          <span className="-mb-0.5 inline-block pb-0.5">{t('Sign in')}</span>
        </button>
      </div>
    );
  }

  renderOfferTag() {
    const { pageData: offer } = this.context;

    if (offer.amount <= 0) {
      return <></>;
    }

    if (offer.type === 'fixed') {
      return (
        <h5 className={offerDiscountLabelClass} data-testid="offer-discount-label">
          {t('{amount} off', {
            amount: `${getCurrencySymbol(offer.currency)}${formatPrice(offer.amount / 100, this.context.site?.locale)}`,
          })}
        </h5>
      );
    }

    if (offer.type === 'trial') {
      return (
        <h5 className={offerDiscountLabelClass} data-testid="offer-discount-label">
          {t('{amount} days free', { amount: offer.amount })}
        </h5>
      );
    }

    return (
      <h5 className={offerDiscountLabelClass} data-testid="offer-discount-label">
        {t('{amount} off', { amount: offer.amount + '%' })}
      </h5>
    );
  }

  renderBenefits({ product }) {
    const benefits = product.benefits || [];
    if (!benefits?.length) {
      return;
    }
    const benefitsUI = benefits.map((benefit, idx) => {
      return (
        <div
          className="gh-portal-product-benefit mb-2.5 flex items-start max-[670px]:last-of-type:mb-0"
          key={`${benefit.name}-${idx}`}
        >
          <CheckmarkIcon
            className="gh-portal-benefit-checkmark mr-2.5 mt-[3px] size-[14px] min-w-[14px] overflow-visible rtl:ml-2.5 rtl:mr-0"
            aria-hidden="true"
          />
          <div className="gh-portal-benefit-title">{benefit.name}</div>
        </div>
      );
    });
    return (
      <div className="gh-portal-product-benefits mt-4 w-full text-base leading-[1.4em]">
        {benefitsUI}
      </div>
    );
  }

  getOriginalPrice({ offer, product }) {
    const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
    const originalAmount = formatPrice(price.amount / 100, this.context.site?.locale);
    return `${getCurrencySymbol(price.currency)}${originalAmount}/${translateCadence(offer.cadence)}`;
  }

  getOffAmount({ offer }) {
    if (offer.type === 'fixed') {
      return `${getCurrencySymbol(offer.currency)}${formatPrice(offer.amount / 100, this.context.site?.locale)}`;
    } else if (offer.type === 'percent') {
      return `${offer.amount}%`;
    } else if (offer.type === 'trial') {
      return offer.amount;
    }
    return '';
  }

  renderOfferMessage({ offer, product }) {
    const offerMessages = {
      forever: t(`{amount} off forever.`, {
        amount: this.getOffAmount({ offer }),
      }),
      firstPeriod: t(`{amount} off for first {period}.`, {
        amount: this.getOffAmount({ offer }),
        period: translateCadence(offer.cadence),
      }),
      firstNMonths: t(`{amount} off for first {number} months.`, {
        amount: this.getOffAmount({ offer }),
        number: offer.duration_in_months || '',
      }),
    };

    const originalPrice = this.getOriginalPrice({ offer, product });
    const renewsLabel = t(`Renews at {price}.`, { price: originalPrice });

    let offerLabel = '';
    let useRenewsLabel = false;
    const discountDuration = offer.duration;
    if (discountDuration === 'once') {
      offerLabel = offerMessages.firstPeriod;
      useRenewsLabel = true;
    } else if (discountDuration === 'forever') {
      offerLabel = offerMessages.forever;
    } else if (discountDuration === 'repeating') {
      const durationInMonths = offer.duration_in_months || '';
      if (durationInMonths === 1) {
        offerLabel = offerMessages.firstPeriod;
      } else {
        offerLabel = offerMessages.firstNMonths;
      }
      useRenewsLabel = true;
    }
    if (discountDuration === 'trial') {
      return (
        <p className={footnoteClass} data-testid="offer-message">
          {t('Try free for {amount} days, then {originalPrice}.', {
            amount: offer.amount,
            originalPrice: originalPrice,
          })}{' '}
          <span className="gh-portal-cancel whitespace-nowrap">{t('Cancel anytime.')}</span>
        </p>
      );
    }
    return (
      <p className={footnoteClass} data-testid="offer-message">
        {offerLabel} {useRenewsLabel ? renewsLabel : ''}
      </p>
    );
  }

  renderProductLabel({ product, offer }) {
    return (
      <h4 className="gh-portal-plan-name">
        {product.name} - {offer.cadence === 'month' ? t('Monthly') : t('Yearly')}
      </h4>
    );
  }

  renderUpdatedTierPrice({ offer, currencyClass, updatedPrice, price }) {
    if (offer.type === 'trial') {
      return (
        <div className="gh-portal-product-card-pricecontainer offer-type-trial mt-4 flex w-full flex-col items-start">
          <div className={productPriceClass} data-testid="offer-updated-price">
            <span className={currencySignClass(currencyClass)}>
              {getCurrencySymbol(price.currency)}
            </span>
            <span className={amountClass}>
              {formatPrice(updatedPrice, this.context.site?.locale)}
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className="gh-portal-product-card-pricecontainer mt-0 flex w-full flex-col items-start">
        <div className={productPriceClass} data-testid="offer-updated-price">
          <span className={currencySignClass(currencyClass)}>
            {getCurrencySymbol(price.currency)}
          </span>
          <span className={amountClass}>
            {formatPrice(updatedPrice, this.context.site?.locale)}
          </span>
        </div>
      </div>
    );
  }

  renderOldTierPrice({ offer, price }) {
    if (offer.type === 'trial') {
      return null;
    }
    return (
      <div className="gh-portal-offer-oldprice relative mb-1 mt-4 flex whitespace-nowrap text-xl font-light leading-none text-gray-500 after:absolute after:inset-x-0 after:top-1/2 after:block after:h-px after:bg-gray-500 after:content-['']">
        {getCurrencySymbol(price.currency)}{' '}
        {formatPrice(price.amount / 100, this.context.site?.locale)}
      </div>
    );
  }

  renderProductCard({ product, offer, currencyClass, updatedPrice, price, benefits }) {
    if (this.state.showNewsletterSelection) {
      return null;
    }
    return (
      <>
        <div
          className={`${productCardClass} top rounded-t-[7px] border-b-current pb-0 pt-8 [border-style:solid_solid_none]`}
        >
          <div className="gh-portal-product-card-header flex min-h-[56px] w-full flex-col items-start max-[880px]:min-h-[unset]">
            <h4 className={productNameClass}>
              {product.name} - {offer.cadence === 'month' ? t('Monthly') : t('Yearly')}
            </h4>
            {this.renderOldTierPrice({ offer, price })}
            {this.renderUpdatedTierPrice({ offer, currencyClass, updatedPrice, price })}
            {this.renderOfferMessage({ offer, product, price })}
          </div>
        </div>

        <div>
          <div
            className={`${productCardClass} bottom rounded-b-[7px] border-t-current pb-8 pt-0 [border-style:none_solid_solid]`}
          >
            <div className="gh-portal-product-card-detaildata flex-1">
              {product.description ? (
                <div className="gh-portal-product-description mt-4 w-full text-[1.55rem] font-semibold leading-[1.4em]">
                  {product.description}
                </div>
              ) : (
                ''
              )}
              {benefits.length ? this.renderBenefits({ product }) : ''}
            </div>
          </div>

          <div className="gh-portal-btn-container sticky m32 bottom-0 -mb-8 bg-[linear-gradient(0deg,rgba(var(--whitergb),1)_75%,rgba(var(--whitergb),0)_100%)] py-8 [position:sticky] [transition:none] [&_.gh-portal-btn]:m-0">
            <div className="gh-portal-signup-terms-wrapper mx-auto mb-4 mt-2 w-full max-w-[420px]">
              {this.renderSignupTerms()}
            </div>
            {this.renderSubmitButton()}
          </div>
          {this.renderLoginMessage()}
        </div>
      </>
    );
  }

  render() {
    const { pageData: offer, site } = this.context;
    if (!offer || !offer.tier) {
      return null;
    }
    const product = getProductFromId({ site, productId: offer.tier.id });
    if (!product) {
      return null;
    }
    const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
    const updatedPrice = getUpdatedOfferPrice({ offer, price });
    const benefits = product.benefits || [];

    const currencyClass = getCurrencySymbol(price.currency).length > 1 ? 'long' : '';

    return (
      <>
        <div className="gh-portal-content gh-portal-offer relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <CloseButton />
          {this.renderFormHeader()}

          <div className={offerBarClass}>
            <div className="gh-portal-offer-title flex items-center justify-between">
              {offer.display_title ? (
                <h4 className={offerTitleClass} data-testid="offer-title">
                  {offer.display_title}
                </h4>
              ) : (
                <h4 className={`placeholder ${offerTitleClass}`} data-testid="offer-title">
                  {t('Black Friday')}
                </h4>
              )}
              {this.renderOfferTag()}
            </div>
            {offer.display_description ? (
              <p className="mb-0 mt-3 pb-0">{offer.display_description}</p>
            ) : (
              ''
            )}
          </div>

          {this.renderForm()}
          {this.renderProductCard({ product, offer, currencyClass, updatedPrice, price, benefits })}
        </div>
      </>
    );
  }
}
