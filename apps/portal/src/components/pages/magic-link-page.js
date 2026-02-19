import React from 'react';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import InboxLinkButton from '../common/inbox-link-button';
import AppContext from '../../app-context';
import {ReactComponent as EnvelopeIcon} from '../../images/icons/envelope.svg';
import {isIos} from '../../utils/is-ios';
import {t} from '../../utils/i18n';

export const MagicLinkStyles = `
    .gh-portal-icon-envelope {
        width: 44px;
        margin: 12px 0 10px;
    }

    .gh-portal-inbox-notification {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .gh-portal-inbox-notification p {
        max-width: 420px;
        text-align: center;
        margin-bottom: 20px;
    }

    .gh-portal-inbox-notification .gh-portal-header {
        padding-bottom: 12px;
    }

    .gh-portal-otp {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 12px;
    }

    .gh-portal-otp-container {
        border: 1px solid var(--grey12);
        border-radius: 8px;
        width: 100%;
        transition: border-color 0.25s ease;
    }

    .gh-portal-otp-container.focused {
        border-color: var(--grey8);
    }

    .gh-portal-otp-container.error {
        border-color: var(--red);
        box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
    }

    .gh-portal-otp .gh-portal-input {
        margin: 0 auto;
        font-size: 2rem !important;
        font-weight: 300;
        border: none;
        /*text-align: center;*/
        padding-left: 2ch;
        padding-right: 1ch;
        letter-spacing: 1ch;
        font-family: Consolas, Liberation Mono, Menlo, Courier, monospace;
        width: 15ch;
    }

    .gh-portal-otp-error {
        margin-top: 8px;
        color: var(--red);
        font-size: 1.3rem;
        letter-spacing: 0.35px;
        line-height: 1.6em;
        margin-bottom: 0;
    }
`;

const OTC_FIELD_NAME = 'otc';

export default class MagicLinkPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            [OTC_FIELD_NAME]: '',
            errors: {},
            isFocused: false
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
                withOTC: t('An email has been sent to {submittedEmailOrInbox}. Click the link inside or enter your code below.', {submittedEmailOrInbox}),
                withoutOTC: t('A login link has been sent to your inbox. If it doesn\'t arrive in 3 minutes, be sure to check your spam folder.')
            },
            signup: t('To complete signup, click the confirmation link in your inbox. If it doesn\'t arrive within 3 minutes, check your spam folder!')
        };
    }

    /**
     * Gets the appropriate translated description based on page context
     * @param {Object} params - Configuration object
     * @param {string} params.lastPage - The previous page ('signin' or 'signup')
     * @param {boolean} params.otcRef - Whether one-time code is being used
     * @param {string} params.submittedEmailOrInbox - The email address or 'your inbox' fallback
     * @returns {string} The translated description
     */
    getTranslatedDescription({lastPage, otcRef, submittedEmailOrInbox}) {
        const descriptionConfig = this.getDescriptionConfig(submittedEmailOrInbox);
        const normalizedPage = (lastPage === 'signup' || lastPage === 'signin') ? lastPage : 'signin';

        if (normalizedPage === 'signup') {
            return descriptionConfig.signup;
        }

        return otcRef ? descriptionConfig.signin.withOTC : descriptionConfig.signin.withoutOTC;
    }

    renderFormHeader() {
        const {otcRef, pageData, lastPage} = this.context;
        const submittedEmailOrInbox = pageData?.email ? pageData.email : t('your inbox');

        const popupTitle = t(`Now check your email!`);
        const popupDescription = this.getTranslatedDescription({
            lastPage,
            otcRef,
            submittedEmailOrInbox
        });

        return (
            <section className='gh-portal-inbox-notification'>
                <header className='gh-portal-header'>
                    <EnvelopeIcon className='gh-portal-icon gh-portal-icon-envelope' />
                    <h2 className='gh-portal-main-title'>{popupTitle}</h2>
                </header>
                <p>{popupDescription}</p>
            </section>
        );
    }

    renderLoginMessage() {
        return (
            <>
                <div
                    style={{color: '#1d1d1d', fontWeight: 'bold', cursor: 'pointer'}}
                    onClick={() => this.context.doAction('switchPage', {page: 'signin'})}
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
        const {inboxLinks} = this.context;
        if (inboxLinks && !isIos(navigator)) {
            return <InboxLinkButton inboxLinks={inboxLinks} />;
        } else {
            return (
                <ActionButton
                    style={{width: '100%'}}
                    onClick={e => this.handleClose(e)}
                    brandColor={this.context.brandColor}
                    label={t('Close')}
                />
            );
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        const {action} = this.context;
        const isRunning = (action === 'verifyOTC:running');

        if (!isRunning) {
            this.doVerifyOTC();
        }
    }

    doVerifyOTC() {
        const missingCodeError = t('Enter code above');

        this.setState((state) => {
            const code = (state.otc || '').trim();
            return {
                errors: {
                    [OTC_FIELD_NAME]: code ? '' : missingCodeError
                }
            };
        }, () => {
            const {otc, errors} = this.state;
            const {otcRef} = this.context;
            const {redirect} = this.context.pageData ?? {};
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors && otcRef) {
                this.context.doAction('verifyOTC', {otc, otcRef, redirect});
            }
        }
        );
    }

    handleInputChange(e, field) {
        const fieldName = field.name;
        const value = e.target.value;

        // For OTC field, only allow numeric input
        if (fieldName === OTC_FIELD_NAME) {
            const numericValue = value.replace(/[^0-9]/g, '');
            this.setState({
                [fieldName]: numericValue
            }, () => {
                // Auto-submit when 6 characters are entered
                if (numericValue.length === 6) {
                    this.doVerifyOTC();
                }
            });
        } else {
            this.setState({
                [fieldName]: value
            });
        }
    }

    renderOTCForm() {
        const {action, actionErrorMessage, otcRef, inboxLinks} = this.context;
        const errors = this.state.errors || {};

        if (!otcRef) {
            return null;
        }

        const isRunning = (action === 'verifyOTC:running');
        const isError = (action === 'verifyOTC:failed');

        const error = (isError && actionErrorMessage) ? actionErrorMessage : errors.otc;

        return (
            <form onSubmit={e => this.handleSubmit(e)}>
                <section className='gh-portal-section gh-portal-otp'>
                    <div className={`gh-portal-otp-container ${this.state.isFocused && 'focused'} ${error && 'error'}`}>
                        <input
                            id={`input-${OTC_FIELD_NAME}`}
                            className={`gh-portal-input ${this.state.otc && 'entry'} ${error && 'error'}`}
                            placeholder='––––––'
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
                            onChange={e => this.handleInputChange(e, {name: OTC_FIELD_NAME})}
                            onFocus={() => this.setState({isFocused: true})}
                            onBlur={() => this.setState({isFocused: false})}
                        />
                    </div>
                    {error &&
                        <div className="gh-portal-otp-error">
                            {error}
                        </div>
                    }
                </section>

                <footer className='gh-portal-signin-footer gh-button-row'>
                    {inboxLinks && !isIos(navigator) && !this.state.otc ? (
                        <InboxLinkButton inboxLinks={inboxLinks} />
                    ) : (
                        <ActionButton
                            style={{width: '100%'}}
                            onClick={e => this.handleSubmit(e)}
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

    render() {
        const {otcRef} = this.context;
        const showOTCForm = !!otcRef;

        return (
            <div className='gh-portal-content'>
                <CloseButton />
                {this.renderFormHeader()}
                {showOTCForm ? this.renderOTCForm() : this.renderCloseButton()}
            </div>
        );
    }
}
