import React from 'react';
import ActionButton from '../common/action-button';
import AppContext from '../../app-context';
import CloseButton from '../common/close-button';
import SignupGiftPromotion from '../common/signup-gift-promotion';
import SiteTitleBackButton from '../common/site-title-back-button';
import NewsletterSelectionPage from './newsletter-selection-page';
import ProductsSection from '../common/products-section';
import InputForm from '../common/input-form';
import { ValidateInputForm } from '../../utils/form';
import {
  getSiteProducts,
  getSitePrices,
  hasAvailablePrices,
  hasOnlyFreePlan,
  isInviteOnly,
  isFreeSignupAllowed,
  isPaidMembersOnly,
  freeHasBenefitsOrDescription,
  hasMultipleNewsletters,
  hasFreeTrialTier,
  isSignupAllowed,
  isSigninAllowed,
} from '../../utils/helpers';
import InvitationIcon from '../../images/icons/invitation.svg?react';
import { interceptAnchorClicks } from '../../utils/links';
import { sanitizeHtml } from '../../utils/sanitize-html';
import { t } from '../../utils/i18n';

const signupMessageButtonClass =
  'gh-portal-btn gh-portal-btn-link relative -mb-px !ms-1 flex cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-md bg-transparent p-0 text-center text-md font-semibold leading-none tracking-[0.2px] text-grey-0 no-underline [border:none] [outline:none] [transition:all_0.25s_ease] hover:border-grey-10 hover:opacity-[0.85]';

const termsCheckboxClass =
  "checkbox relative top-[-1px] float-left mt-px inline-block size-[18px] shrink-0 rounded border border-solid border-grey-10 bg-white [transition:background_0.15s_ease-in-out,border-color_0.15s_ease-in-out] before:absolute before:left-[3px] before:top-1 before:h-1.5 before:w-2.5 before:opacity-0 before:content-[''] before:[border-color:currentcolor_currentcolor_var(--white)_var(--white)] before:[border-style:none_none_solid_solid] before:[border-width:0_0_2px_2px] before:[transform:rotate(-45deg)] before:[transition:opacity_0.15s_ease-in-out] rtl:float-right rtl:before:left-auto rtl:before:right-[3px] [.gh-portal-error_&]:border-red [.gh-portal-error_&]:[box-shadow:0_0_0_3px_rgb(240,37,37,.15)] [.gh-portal-error_input:checked+&]:[box-shadow:none] [.gh-portal-error_label:hover_input:not(:checked)+&]:border-red [input:checked+&]:border-black [input:checked+&]:bg-black [input:checked+&]:before:opacity-100 [label:hover_input:not(:checked)+&]:border-grey-9";

const notificationClass = 'mx-8 mb-6 mt-2 text-center text-grey-2';

class SignupPage extends React.Component {
  static contextType = AppContext;

  constructor(props) {
    super(props);
    this.state = {
      name: '',
      email: '',
      plan: 'free',
      showNewsletterSelection: false,
      termsCheckboxChecked: false,
    };

    this.termsRef = React.createRef();
  }

  componentDidMount() {
    const { member } = this.context;
    if (member) {
      this.context.doAction('switchPage', {
        page: 'accountHome',
      });
    }

    // Handle the default plan if not set
    this.handleSelectedPlan();
  }

  componentDidUpdate() {
    this.handleSelectedPlan();
  }

  handleSelectedPlan() {
    const { site, pageQuery } = this.context;
    const prices = getSitePrices({ site, pageQuery });

    const selectedPriceId = this.getSelectedPriceId(prices, this.state.plan);
    if (selectedPriceId !== this.state.plan) {
      this.setState({
        plan: selectedPriceId,
      });
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timeoutId);
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

  doSignup() {
    this.setState(
      (state) => {
        return {
          errors: this.getFormErrors(state),
        };
      },
      () => {
        const { site, doAction } = this.context;
        const { name, email, plan, phonenumber, token, errors } = this.state;
        const hasFormErrors = errors && Object.values(errors).filter((d) => !!d).length > 0;

        // Only scroll checkbox into view if it's the only error
        const otherErrors = { ...errors };
        delete otherErrors.checkbox;
        const hasOnlyCheckboxError =
          errors?.checkbox && Object.values(otherErrors).every((error) => !error);

        if (hasOnlyCheckboxError && this.termsRef.current) {
          this.termsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        if (!hasFormErrors) {
          if (hasMultipleNewsletters({ site })) {
            this.setState({
              showNewsletterSelection: true,
              pageData: { name, email, plan, phonenumber, token },
              errors: {},
            });
          } else {
            this.setState({
              errors: {},
            });
            doAction('signup', { name, email, phonenumber, plan, token });
          }
        }
      },
    );
  }

  handleSignup(e) {
    e.preventDefault();
    this.doSignup();
  }

  handleChooseSignup(e, plan) {
    e.preventDefault();
    this.setState({ plan }, () => {
      this.doSignup();
    });
  }

  handleInputChange(e, field) {
    const fieldName = field.name;
    const value = e.target.value;
    this.setState({
      [fieldName]: value,
    });
  }

  handleSelectPlan = (e, priceId) => {
    e && e.preventDefault();
    // Hack: React checkbox gets out of sync with dom state with instant update
    this.timeoutId = setTimeout(() => {
      this.setState(() => {
        return {
          plan: priceId,
        };
      });
    }, 5);
  };

  onKeyDown(e) {
    // Handles submit on Enter press
    if (e.keyCode === 13) {
      this.handleSignup(e);
    }
  }

  getSelectedPriceId(prices = [], selectedPriceId) {
    if (!prices || prices.length === 0 || selectedPriceId === 'free') {
      return 'free';
    }
    const hasSelectedPlan = prices.some((p) => {
      return p.id === selectedPriceId;
    });

    if (!hasSelectedPlan) {
      return prices[0].id || 'free';
    }

    return selectedPriceId;
  }

  getInputFields({ state, fieldNames }) {
    const {
      site: { portal_name: portalName },
    } = this.context;

    const errors = state.errors || {};
    const fields = [
      {
        type: 'email',
        value: state.email,
        placeholder: t('jamie@example.com'),
        label: t('Email'),
        name: 'email',
        required: true,
        tabIndex: 2,
        errorMessage: errors.email || '',
      },
      {
        type: 'text',
        value: state.phonenumber,
        placeholder: t('+1 (123) 456-7890'),
        // Doesn't need translation, hidden field
        label: t('Phone number'),
        name: 'phonenumber',
        required: false,
        tabIndex: -1,
        autoComplete: 'off',
        hidden: true,
      },
    ];

    /** Show Name field if portal option is set*/
    if (portalName) {
      fields.unshift({
        type: 'text',
        value: state.name,
        placeholder: t('Jamie Larson'),
        label: t('Name'),
        name: 'name',
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
        className="gh-portal-signup-terms-content [&_a]:font-medium [&_a]:text-brand [&_a]:no-underline [&_p]:mb-0 [&_p]:text-md [&_p]:leading-[1.25em] [&_p]:text-grey-4 [.gh-portal-error_&]:leading-[1.5em]"
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

    const className = `gh-portal-signup-terms ${errorClassName} mb-9 [&.gh-portal-error]:text-md [&.gh-portal-error]:leading-[1.6em] [&.gh-portal-error]:text-red`;

    return (
      <div className={className} onClick={interceptAnchorClicks} ref={this.termsRef}>
        {signupTerms}
      </div>
    );
  }

  renderSubmitButton() {
    const { action, site, brandColor, pageQuery } = this.context;

    if (isInviteOnly({ site }) || !hasAvailablePrices({ site, pageQuery })) {
      return null;
    }

    let label = t('Continue');
    const showOnlyFree = pageQuery === 'free' && isFreeSignupAllowed({ site });

    if (hasOnlyFreePlan({ site }) || showOnlyFree) {
      label = t('Sign up');
    } else {
      return null;
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
      />
    );
  }

  renderProducts() {
    const { site, pageQuery } = this.context;
    const products = getSiteProducts({ site, pageQuery });
    const errors = this.state.errors || {};
    const priceErrors = {};

    // If we have at least one error, set an error message for the current selected plan
    if (Object.keys(errors).length > 0 && this.state.plan) {
      priceErrors[this.state.plan] = t('Please fill in required fields');
    }

    return (
      <>
        <ProductsSection
          handleChooseSignup={(...args) => this.handleChooseSignup(...args)}
          products={products}
          onPlanSelect={this.handleSelectPlan}
          errors={priceErrors}
        />
      </>
    );
  }

  renderFreeTrialMessage() {
    const { site, pageQuery } = this.context;
    if (
      hasFreeTrialTier({ site, pageQuery }) &&
      !isInviteOnly({ site }) &&
      hasAvailablePrices({ site, pageQuery })
    ) {
      return (
        <p
          className="gh-portal-free-trial-notification mx-auto my-6 max-w-[480px] text-center text-grey-4"
          data-testid="free-trial-notification-text"
        >
          {t(
            "After a free trial ends, you will be charged the regular price for the tier you've chosen. You can always cancel before then.",
          )}
        </p>
      );
    }
    return null;
  }

  renderLoginMessage({ showGiftPromotion = true } = {}) {
    const { brandColor, doAction } = this.context;

    return (
      <div>
        {this.renderFreeTrialMessage()}
        <div className="gh-portal-signup-message gh-portal-signup-message-stack z-[9999] mt-1 flex flex-col flex-wrap items-center justify-center gap-[8px] text-base text-grey-4 group-[.full-size]/popup:mb-10 group-[.full-size]/popup:mt-6 [&_*]:z-[9999]">
          <div className="gh-portal-signup-message-row flex max-w-full flex-wrap items-center justify-center">
            <div>{t('Already a member?')}</div>
            <button
              data-test-button="signin-switch"
              data-testid="signin-switch"
              className={signupMessageButtonClass}
              style={{ color: brandColor }}
              onClick={() => doAction('switchPage', { page: 'signin' })}
            >
              <span className="-mb-0.5 inline-block pb-0.5">{t('Sign in')}</span>
            </button>
          </div>
          {showGiftPromotion && (
            <SignupGiftPromotion
              className="gh-portal-signup-message-row flex max-w-full flex-wrap items-center justify-center"
              lastPage="signup"
            />
          )}
        </div>
      </div>
    );
  }

  renderForm() {
    const fields = this.getInputFields({ state: this.state });
    const { site, pageQuery } = this.context;

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

    // Invite-only site: block signups, offer to sign in
    if (isInviteOnly({ site })) {
      return this.renderInviteOnlyMessage();
    }

    // Paid-members-only site: block free signups, offer to sign in
    if (isPaidMembersOnly({ site }) && pageQuery === 'free') {
      return this.renderPaidMembersOnlyMessage();
    }

    // Signup is not allowed or no prices are available: block signup with the relevant message, offer signin when available
    if (!isSignupAllowed({ site }) || !hasAvailablePrices({ site, pageQuery })) {
      if (!isSigninAllowed({ site })) {
        return this.renderMembersDisabledMessage();
      }

      return this.renderInviteOnlyMessage();
    }

    const showOnlyFree = pageQuery === 'free' && isFreeSignupAllowed({ site });
    const hasOnlyFree = hasOnlyFreePlan({ site }) || showOnlyFree;

    const signupTerms = this.renderSignupTerms();

    return (
      <section className="gh-portal-signup animate-[fadeIn_0.5s_ease-in-out]">
        <div className="gh-portal-section mb-10">
          <div className="gh-portal-logged-out-form-container mx-auto w-full max-w-[420px]">
            <InputForm
              fields={fields}
              onChange={(e, field) => this.handleInputChange(e, field)}
              onKeyDown={(e) => this.onKeyDown(e)}
            />
          </div>
          <div>
            {hasOnlyFree ? (
              <>
                {this.renderProducts()}
                {signupTerms && (
                  <div className="gh-portal-signup-terms-wrapper free-only mx-auto w-full max-w-[420px] [&_.gh-portal-signup-terms]:mb-6 [.gh-portal-products:has(.gh-portal-product-card)+&]:!m-[20px_auto_0]">
                    {signupTerms}
                  </div>
                )}
              </>
            ) : (
              <>
                {signupTerms && (
                  <div className="gh-portal-signup-terms-wrapper mx-auto w-full max-w-[420px]">
                    {signupTerms}
                  </div>
                )}
                {this.renderProducts()}
              </>
            )}

            {hasOnlyFree ? (
              <div className="gh-portal-btn-container [&_.gh-portal-btn]:m-0 [.gh-portal-signup-terms-wrapper+&]:mt-4">
                <div className="gh-portal-logged-out-form-container mx-auto w-full max-w-[420px]">
                  {this.renderSubmitButton()}
                  {this.renderLoginMessage()}
                </div>
              </div>
            ) : (
              this.renderLoginMessage()
            )}
          </div>
        </div>
      </section>
    );
  }

  renderPaidMembersOnlyMessage() {
    return (
      <section>
        <div className="gh-portal-section mb-10">
          <p
            className={`gh-portal-paid-members-only-notification ${notificationClass}`}
            data-testid="paid-members-only-notification-text"
          >
            {t('This site only accepts paid members.')}
          </p>
          {this.renderLoginMessage({ showGiftPromotion: false })}
        </div>
      </section>
    );
  }

  renderInviteOnlyMessage() {
    return (
      <section>
        <div className="gh-portal-section mb-10">
          <p
            className={`gh-portal-invite-only-notification ${notificationClass}`}
            data-testid="invite-only-notification-text"
          >
            {t('This site is invite-only, contact the owner for access.')}
          </p>
          {this.renderLoginMessage({ showGiftPromotion: false })}
        </div>
      </section>
    );
  }

  renderMembersDisabledMessage() {
    return (
      <section>
        <div className="gh-portal-section mb-10">
          <p
            className={`gh-portal-members-disabled-notification ${notificationClass}`}
            data-testid="members-disabled-notification-text"
          >
            {t('Memberships unavailable, contact the owner for access.')}
          </p>
        </div>
      </section>
    );
  }

  renderSiteIcon() {
    const { site, pageQuery } = this.context;
    const siteIcon = site.icon;

    if (siteIcon) {
      return (
        <img
          className="gh-portal-signup-logo relative mb-2.5 mt-3 block size-[60px] rounded-sm bg-cover bg-[position:50%] max-sm:size-12"
          src={siteIcon}
          alt={site.title}
        />
      );
    }

    if (
      !hasAvailablePrices({ site, pageQuery }) ||
      isInviteOnly({ site }) ||
      !isSignupAllowed({ site })
    ) {
      return (
        <InvitationIcon className="gh-portal-icon gh-portal-icon-invitation mb-0.5 mt-3 size-11 text-brand" />
      );
    }

    return null;
  }

  renderFormHeader() {
    const { site } = this.context;
    const siteTitle = site.title || '';
    return (
      <header className="gh-portal-signup-header mb-8 flex flex-col items-center px-8 group-[.full-size]/wrapper:mt-8 max-[390px]:pb-4">
        {this.renderSiteIcon()}
        <h1
          className="gh-portal-main-title mt-3 text-pretty text-center leading-[1.1em] text-grey-0 [.gh-portal-signup-logo+&]:mt-1"
          data-testid="site-title-text"
        >
          {siteTitle}
        </h1>
      </header>
    );
  }

  getClassNames() {
    const { site, pageQuery } = this.context;
    const plansData = getSitePrices({ site, pageQuery });
    const fields = this.getInputFields({ state: this.state });
    let sectionClass = '';
    let footerClass = '';

    if (plansData.length <= 1 || isInviteOnly({ site })) {
      if (
        (plansData.length === 1 && plansData[0].type === 'free') ||
        isInviteOnly({ site, pageQuery })
      ) {
        sectionClass = freeHasBenefitsOrDescription({ site }) ? 'singleplan' : 'noplan';
        if (fields.length === 1) {
          sectionClass = 'single-field';
        }
        if (isInviteOnly({ site })) {
          footerClass = 'invite-only';
          sectionClass = 'invite-only';
        }
      } else {
        sectionClass = 'singleplan';
      }
    }

    return { sectionClass, footerClass };
  }

  render() {
    const { sectionClass } = this.getClassNames();
    return (
      <>
        <div className="gh-portal-back-sitetitle absolute left-8 top-[35px] group-[.preview]/wrapper:hidden group-[:not(.full-size)]/wrapper:hidden rtl:left-auto rtl:right-8 [&_.gh-portal-btn]:h-auto [&_.gh-portal-btn]:p-0 [&_.gh-portal-btn]:text-base [&_.gh-portal-btn]:leading-[1em] [&_.gh-portal-btn]:text-grey-1 [&_.gh-portal-btn]:[border:0]">
          <SiteTitleBackButton
            onBack={() => {
              if (this.state.showNewsletterSelection) {
                this.setState({
                  showNewsletterSelection: false,
                });
              } else {
                this.context.doAction('closePopup');
              }
            }}
          />
        </div>
        <CloseButton />
        <div
          className={
            'gh-portal-content signup relative !max-h-[unset] pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&.single-field]:mb-1 [&.single-field_.gh-portal-input]:mb-3 [&.single-field_.gh-portal-products:not(:has(.gh-portal-product-card))]:-mt-4 [&.single-field_.gh-portal-signup-terms-wrapper]:mt-3 [&_.gh-portal-input-section:last-of-type]:mb-10 [&_.gh-portal-section]:mb-0 ' +
            sectionClass
          }
        >
          {this.renderFormHeader()}
          {this.renderForm()}
        </div>
      </>
    );
  }
}

export default SignupPage;
