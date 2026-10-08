import React from 'react';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import GiftCard from '../common/gift-card';
import GiftDetailsToggle from '../common/gift-details-toggle';
import InboxLinkButton from '../common/inbox-link-button';
import AppContext from '../../app-context';
import EnvelopeIcon from '../../images/icons/envelope.svg?react';
import { isIos } from '../../utils/is-ios';
import { t } from '../../utils/i18n';
import { getGiftDurationLabel } from '../../utils/gift-redemption-notification';

const OTC_FIELD_NAME = 'otc';

export default class MagicLinkPage extends React.Component {
  static contextType = AppContext;

  constructor(props) {
    super(props);
    this.state = {
      [OTC_FIELD_NAME]: '',
      errors: {},
      isFocused: false,
      showDetails: false,
    };
  }

  /**
   * Generates configuration object containing translated description messages for magic link scenarios
   * @param {string} submittedEmailOrInbox - The email address or fallback text ('your inbox')
   * @returns {Object} Configuration object with message templates for signin/signup scenarios
   */
  getDescriptionConfig(submittedEmailOrInbox) {
    return {
      signin: {
        withOTC: t(
          'If you have an account, an email has been sent to {submittedEmailOrInbox}. Click the link inside or enter your code below.',
          { submittedEmailOrInbox },
        ),
        withoutOTC: t(
          "If you have an account, a login link has been sent to your inbox. If it doesn't arrive in 3 minutes, be sure to check your spam folder.",
        ),
      },
      signup: t(
        "To complete signup, click the confirmation link in your inbox. If it doesn't arrive within 3 minutes, check your spam folder!",
      ),
      gift: t(
        "Click the confirmation link in your inbox to finish redeeming your membership. If it doesn't arrive within 3 minutes, check your spam folder.",
      ),
    };
  }

  /**
   * Gets the appropriate translated description based on page context
   * @param {Object} params - Configuration object
   * @param {string} params.lastPage - The previous page ('signin', 'signup', or 'gift')
   * @param {boolean} params.otcRef - Whether one-time code is being used
   * @param {string} params.submittedEmailOrInbox - The email address or 'your inbox' fallback
   * @returns {string} The translated description
   */
  getTranslatedDescription({ lastPage, otcRef, submittedEmailOrInbox }) {
    const descriptionConfig = this.getDescriptionConfig(submittedEmailOrInbox);
    const allowedPages = ['signup', 'signin', 'gift'];
    const normalizedPage = allowedPages.includes(lastPage) ? lastPage : 'signin';

    if (normalizedPage === 'signup') {
      return descriptionConfig.signup;
    }

    if (normalizedPage === 'gift') {
      return descriptionConfig.gift;
    }

    return otcRef ? descriptionConfig.signin.withOTC : descriptionConfig.signin.withoutOTC;
  }

  renderFormHeader() {
    const { otcRef, pageData, lastPage } = this.context;
    const submittedEmailOrInbox = pageData?.email ? pageData.email : t('your inbox');

    const popupTitle = t(`Now check your email!`);
    const popupDescription = this.getTranslatedDescription({
      lastPage,
      otcRef,
      submittedEmailOrInbox,
    });

    return (
      <section className="gh-portal-inbox-notification flex flex-col items-center">
        <header className="gh-portal-header flex flex-col items-center pb-3">
          <EnvelopeIcon className="gh-portal-icon gh-portal-icon-envelope mb-2.5 mt-3 w-11 text-brand" />
          <h2 className="gh-portal-main-title text-pretty text-center leading-[1.1em] text-black">
            {popupTitle}
          </h2>
        </header>
        <p className="mb-5 max-w-[420px] text-center">{popupDescription}</p>
      </section>
    );
  }

  renderLoginMessage() {
    return (
      <>
        <div
          style={{ color: '#15171a', fontWeight: 'bold', cursor: 'pointer' }}
          onClick={() => this.context.doAction('switchPage', { page: 'signin' })}
        >
          {t('Back to Log in')}
        </div>
      </>
    );
  }

  handleClose() {
    this.context.doAction('closePopup');
  }

  renderCloseButton() {
    const { inboxLinks } = this.context;
    if (inboxLinks && !isIos(navigator)) {
      return <InboxLinkButton inboxLinks={inboxLinks} />;
    } else {
      return (
        <ActionButton
          style={{ width: '100%' }}
          onClick={(e) => this.handleClose(e)}
          brandColor={this.context.brandColor}
          label={t('Close')}
        />
      );
    }
  }

  handleSubmit(e) {
    e.preventDefault();
    const { action } = this.context;
    const isRunning = action === 'verifyOTC:running';

    if (!isRunning) {
      this.doVerifyOTC();
    }
  }

  doVerifyOTC() {
    const missingCodeError = t('Enter code above');

    this.setState(
      (state) => {
        const code = (state.otc || '').trim();
        return {
          errors: {
            [OTC_FIELD_NAME]: code ? '' : missingCodeError,
          },
        };
      },
      () => {
        const { otc, errors } = this.state;
        const { otcRef } = this.context;
        const { redirect } = this.context.pageData ?? {};
        const hasFormErrors = errors && Object.values(errors).filter((d) => !!d).length > 0;
        if (!hasFormErrors && otcRef) {
          this.context.doAction('verifyOTC', { otc, otcRef, redirect });
        }
      },
    );
  }

  handleInputChange(e, field) {
    const fieldName = field.name;
    const value = e.target.value;

    // For OTC field, only allow numeric input
    if (fieldName === OTC_FIELD_NAME) {
      const numericValue = value.replace(/[^0-9]/g, '');
      this.setState(
        {
          [fieldName]: numericValue,
        },
        () => {
          // Auto-submit when 6 characters are entered
          if (numericValue.length === 6) {
            this.doVerifyOTC();
          }
        },
      );
    } else {
      this.setState({
        [fieldName]: value,
      });
    }
  }

  renderOTCForm() {
    const { action, actionErrorMessage, otcRef, inboxLinks } = this.context;
    const errors = this.state.errors || {};

    if (!otcRef) {
      return null;
    }

    const isRunning = action === 'verifyOTC:running';
    const isError = action === 'verifyOTC:failed';

    const error = isError && actionErrorMessage ? actionErrorMessage : errors.otc;

    return (
      <form onSubmit={(e) => this.handleSubmit(e)}>
        <section className="gh-portal-section gh-portal-otp mb-3 flex flex-col items-center">
          <div
            className={`gh-portal-otp-container ${this.state.isFocused && 'focused'} ${error && 'error'} w-full rounded-lg border border-solid border-gray-200 [transition:border-color_0.25s_ease] [&.error]:border-red [&.error]:[box-shadow:0_0_0_3px_rgba(255,0,0,0.1)] [&.focused:not(.error)]:border-gray-500`}
          >
            <input
              id={`input-${OTC_FIELD_NAME}`}
              className={`gh-portal-input ${this.state.otc && 'entry'} ${error && 'error'} mx-auto my-0 box-border block h-11 w-[15ch] appearance-none rounded-md bg-transparent py-0 pl-[2ch] pr-[1ch] font-light tracking-[1ch] [-webkit-appearance:none] [border:none] [color:inherit] [font-family:Consolas,Liberation_Mono,Menlo,Courier,monospace] [outline:none] [transition:border-color_0.25s_ease-in-out] placeholder:text-gray-500 max-[1440px]:h-[42px] [.gh-portal-otp_&]:!text-2xl`}
              placeholder="––––––"
              name={OTC_FIELD_NAME}
              type="text"
              value={this.state.otc}
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              autoComplete="one-time-code"
              autoCorrect="off"
              autoCapitalize="off"
              autoFocus={true}
              aria-label={t('Code')}
              onChange={(e) => this.handleInputChange(e, { name: OTC_FIELD_NAME })}
              onFocus={() => this.setState({ isFocused: true })}
              onBlur={() => this.setState({ isFocused: false })}
            />
          </div>
          {error && (
            <div className="gh-portal-otp-error mb-0 mt-2 text-sm leading-[1.6em] tracking-[0.35px] text-red">
              {error}
            </div>
          )}
        </section>

        <footer className="gh-portal-signin-footer gh-button-row relative flex flex-row-reverse items-center gap-[12px] pt-3 max-sm:flex-col max-sm:group-[.preview:not(.full-size)]/wrapper:pb-8">
          {inboxLinks && !isIos(navigator) && !this.state.otc ? (
            <InboxLinkButton inboxLinks={inboxLinks} />
          ) : (
            <ActionButton
              style={{ width: '100%' }}
              onClick={(e) => this.handleSubmit(e)}
              brandColor={this.context.brandColor}
              label={isRunning ? t('Verifying...') : t('Continue')}
              isRunning={isRunning}
              retry={isError}
              disabled={isRunning}
            />
          )}
        </footer>
      </form>
    );
  }

  renderGiftLayout(showOTCForm) {
    const { site, pageData, otcRef } = this.context;
    const gift = pageData?.gift;
    const siteIcon = site?.icon;
    const siteTitle = site?.title || '';
    const submittedEmailOrInbox = pageData?.email ? pageData.email : t('your inbox');
    const popupTitle = t('Now check your email!');
    const popupDescription = this.getTranslatedDescription({
      lastPage: 'gift',
      otcRef,
      submittedEmailOrInbox,
    });
    const benefits = gift.tier?.benefits || [];
    const tierDescription = gift.tier?.description || '';
    const submittedName = (pageData?.name || '').trim();

    return (
      <>
        <CloseButton />
        <div className="gh-portal-content giftRedemption relative min-h-screen [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="gh-portal-gift-checkout grid min-h-screen w-full grid-cols-[1fr_1fr] max-[880px]:min-h-0 max-[880px]:grid-cols-[1fr] [&_.gh-portal-btn-primary]:rounded-[999px] [&_.gh-portal-input]:h-12">
            <div className="gh-portal-gift-checkout-left relative flex items-center justify-center bg-white p-12 max-[880px]:px-6 max-[880px]:pb-6 max-[880px]:pt-8">
              <div className="gh-portal-gift-checkout-bg hidden" aria-hidden="true" />
              <div className="gh-portal-gift-checkout-inner relative z-[1] my-auto flex w-full max-w-[496px] flex-col">
                <header className="gh-portal-gift-checkout-header mb-3">
                  <h1 className="gh-portal-main-title mb-2 text-pretty text-start text-4xl leading-[1.15] text-black max-sm:text-[2.6rem]">
                    {popupTitle}
                  </h1>
                  <p className="gh-portal-gift-checkout-subtitle m-0 text-pretty text-base leading-[1.45em] text-gray-900">
                    {popupDescription}
                  </p>
                </header>
                <div className="gh-portal-gift-redemption-form mt-6">
                  {showOTCForm ? this.renderOTCForm() : this.renderCloseButton()}
                </div>
              </div>
            </div>
            <div className="gh-portal-gift-checkout-right top-0 flex h-screen overflow-y-auto py-3 pl-0 pr-3 [align-self:start] [position:sticky] max-[880px]:static max-[880px]:order-[-1] max-[880px]:h-auto max-[880px]:overflow-visible max-[880px]:p-0">
              <div className="gh-portal-gift-checkout-right-panel flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-[32px] px-12 py-16 [background:linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0)_100%),var(--brandcolor)] max-[880px]:rounded-[0_0_32px_32px] max-[880px]:px-6 max-[880px]:pb-8 max-[880px]:pt-14 [&_.gh-portal-gift-checkout-benefit]:text-white/85 [&_.gh-portal-gift-checkout-benefit_svg_path]:[stroke:rgba(255,255,255,0.85)]">
                <div
                  className="gh-portal-gift-checkout-card-stack my-auto flex w-full max-w-[280px] shrink-0 flex-col items-center max-[880px]:max-w-[240px] [&[data-revealing=true]_.gh-portal-gift-checkout-card-frame]:[transform:rotate(3deg)]"
                  data-revealing={this.state.showDetails}
                >
                  <GiftCard
                    duration={getGiftDurationLabel(gift)}
                    tierName={gift.tier?.name}
                    toName={submittedName || null}
                    fromName={gift.buyer_name || null}
                    siteIcon={siteIcon}
                    siteTitle={siteTitle}
                  />

                  <GiftDetailsToggle
                    description={tierDescription}
                    benefits={benefits}
                    showDetails={this.state.showDetails}
                    onToggle={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  render() {
    const { otcRef, lastPage, pageData } = this.context;
    const showOTCForm = !!otcRef;
    const isGiftMode = lastPage === 'gift' && !!pageData?.gift;

    if (isGiftMode) {
      return this.renderGiftLayout(showOTCForm);
    }

    return (
      <div className="gh-portal-content relative [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <CloseButton />
        {this.renderFormHeader()}
        {showOTCForm ? this.renderOTCForm() : this.renderCloseButton()}
      </div>
    );
  }
}
