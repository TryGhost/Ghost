import React from 'react';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
// import SiteTitleBackButton from '../common/SiteTitleBackButton';
import AppContext from '../../app-context';
import InputForm from '../common/input-form';
import { ValidateInputForm } from '../../utils/form';
import { hasAvailablePrices, isSigninAllowed, isSignupAllowed } from '../../utils/helpers';
import InvitationIcon from '../../images/icons/invitation.svg?react';
import { t } from '../../utils/i18n';
import { signupMessageButtonClass } from '../shared-classes';
import { tw } from '../../utils/tw';

const mainTitleClass = tw`mt-3 text-center leading-[1.1em] text-pretty text-gray-950 [.gh-portal-signup-logo+&]:mt-1`;

export default class SigninPage extends React.Component {
  static contextType = AppContext;

  constructor(props) {
    super(props);
    this.state = {
      email: '',
      token: undefined,
    };
  }

  componentDidMount() {
    const { member } = this.context;
    if (member) {
      this.context.doAction('switchPage', {
        page: 'accountHome',
      });
    }
  }

  handleSignin(e) {
    e.preventDefault();
    this.doSignin();
  }

  doSignin() {
    this.setState(
      (state) => {
        return {
          errors: ValidateInputForm({ fields: this.getInputFields({ state }) }),
        };
      },
      async () => {
        const { email, phonenumber, errors, token } = this.state;
        const { redirect } = this.context.pageData ?? {};
        const hasFormErrors = errors && Object.values(errors).filter((d) => !!d).length > 0;
        if (!hasFormErrors) {
          this.context.doAction('signin', { email, phonenumber, redirect, token });
        }
      },
    );
  }

  handleInputChange(e, field) {
    const fieldName = field.name;
    this.setState({
      [fieldName]: e.target.value,
    });
  }

  onKeyDown(e) {
    // Handles submit on Enter press
    if (e.keyCode === 13) {
      this.handleSignin(e);
    }
  }

  getInputFields({ state }) {
    const errors = state.errors || {};
    const fields = [
      {
        type: 'email',
        value: state.email,
        placeholder: t('jamie@example.com'),
        label: t('Email'),
        name: 'email',
        required: true,
        errorMessage: errors.email || '',
        autoFocus: true,
      },
      {
        type: 'text',
        value: state.phonenumber,
        placeholder: '+1 (123) 456-7890',
        // Doesn't need translation, hidden field
        label: 'Phone number',
        name: 'phonenumber',
        required: false,
        tabIndex: -1,
        autoComplete: 'off',
        hidden: true,
      },
    ];
    return fields;
  }

  renderSubmitButton() {
    const { action } = this.context;
    let retry = false;
    const isRunning = action === 'signin:running';
    let label = isRunning ? t('Sending login link...') : t('Continue');
    const disabled = isRunning ? true : false;
    if (action === 'signin:failed') {
      label = t('Retry');
      retry = true;
    }
    return (
      <ActionButton
        dataTestId="signin"
        retry={retry}
        style={{ width: '100%' }}
        onClick={(e) => this.handleSignin(e)}
        disabled={disabled}
        brandColor={this.context.brandColor}
        label={label}
        isRunning={isRunning}
      />
    );
  }

  renderSignupMessage() {
    const { brandColor } = this.context;
    return (
      <div className="z-[9999] mt-1 flex flex-wrap justify-center text-15 text-gray-750 [&_*]:z-[9999]">
        <div>{t("Don't have an account?")}</div>
        <button
          data-test-button="signup-switch"
          className={signupMessageButtonClass}
          style={{ color: brandColor }}
          onClick={() => this.context.doAction('switchPage', { page: 'signup' })}
        >
          <span className="-mb-0.5 inline-block pb-0.5">{t('Sign up')}</span>
        </button>
      </div>
    );
  }

  renderForm() {
    const { site } = this.context;
    const isSignupAvailable = isSignupAllowed({ site }) && hasAvailablePrices({ site });

    if (!isSigninAllowed({ site })) {
      return (
        <section>
          <div className="gh-portal-section mb-10">
            <p
              className="mx-8 mt-2 mb-6 text-center text-gray-850"
              data-testid="members-disabled-notification-text"
            >
              {t('Memberships unavailable, contact the owner for access.')}
            </p>
          </div>
        </section>
      );
    }

    return (
      <section>
        <div className="gh-portal-section mb-10">
          <InputForm
            fields={this.getInputFields({ state: this.state })}
            onChange={(e, field) => this.handleInputChange(e, field)}
            onKeyDown={(e, field) => this.onKeyDown(e, field)}
          />
        </div>
        <footer className="relative flex flex-col items-center gap-3 pt-3 max-sm:group-[.preview:not(.full-size)]/wrapper:pb-8">
          {this.renderSubmitButton()}
          {isSignupAvailable && this.renderSignupMessage()}
        </footer>
      </section>
    );
  }

  renderSiteIcon() {
    const iconStyle = {};
    const { site } = this.context;
    const siteIcon = site.icon;

    if (siteIcon) {
      iconStyle.backgroundImage = `url(${siteIcon})`;
      return (
        <img
          className="gh-portal-signup-logo relative mt-3 mb-2.5 block size-15 rounded-sm bg-cover bg-center max-sm:size-12"
          src={siteIcon}
          alt={this.context.site.title}
        />
      );
    } else if (!isSigninAllowed({ site })) {
      return <InvitationIcon className="mt-3 mb-0.5 size-11 text-brand" />;
    }
    return null;
  }

  renderSiteTitle() {
    const { site } = this.context;
    const siteTitle = site.title;

    if (!isSigninAllowed({ site })) {
      return <h1 className={mainTitleClass}>{siteTitle}</h1>;
    } else {
      return <h1 className={mainTitleClass}>{t('Sign in')}</h1>;
    }
  }

  renderFormHeader() {
    return (
      <header className="mb-8 flex flex-col items-center px-8 max-2xs:pb-4">
        {this.renderSiteIcon()}
        {this.renderSiteTitle()}
      </header>
    );
  }

  render() {
    return (
      <>
        <CloseButton />
        <div className="mx-auto w-full max-w-[420px]">
          <div className="signin relative scrollbar-none max-h-[unset]! pb-1 [&_.gh-portal-input]:mb-3 [&_.gh-portal-section]:mb-0">
            {this.renderFormHeader()}
            {this.renderForm()}
          </div>
        </div>
      </>
    );
  }
}
