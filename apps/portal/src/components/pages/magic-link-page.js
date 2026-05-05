import React from 'react';
import ActionButton from '../common/action-button';
import CloseButton from '../common/close-button';
import InboxLinkButton from '../common/inbox-link-button';
import AppContext from '../../app-context';
import {ReactComponent as EnvelopeIcon} from '../../images/icons/envelope.svg';
import {ReactComponent as CheckmarkIcon} from '../../images/icons/checkmark.svg';
import {isIos} from '../../utils/is-ios';
import {t} from '../../utils/i18n';
import {getGiftDurationLabel} from '../../utils/gift-redemption-notification';

const ChevronIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"/>
    </svg>
);

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
            isFocused: false,
            showDetails: false
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
                withOTC: t('If you have an account, an email has been sent to {submittedEmailOrInbox}. Click the link inside or enter your code below.', {submittedEmailOrInbox}),
                withoutOTC: t('If you have an account, a login link has been sent to your inbox. If it doesn\'t arrive in 3 minutes, be sure to check your spam folder.')
            },
            signup: t('To complete signup, click the confirmation link in your inbox. If it doesn\'t arrive within 3 minutes, check your spam folder!'),
            gift: t('Click the confirmation link in your inbox to finish redeeming your membership. If it doesn\'t arrive within 3 minutes, check your spam folder.')
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
    getTranslatedDescription({lastPage, otcRef, submittedEmailOrInbox}) {
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

    renderGiftLayout(showOTCForm) {
        const {site, pageData, otcRef} = this.context;
        const gift = pageData?.gift;
        const siteIcon = site?.icon;
        const siteTitle = site?.title || '';
        const submittedEmailOrInbox = pageData?.email ? pageData.email : t('your inbox');
        const popupTitle = t('Now check your email!');
        const popupDescription = this.getTranslatedDescription({
            lastPage: 'gift',
            otcRef,
            submittedEmailOrInbox
        });
        const benefits = gift.tier?.benefits || [];

        return (
            <>
                <CloseButton />
                <div className='gh-portal-content giftRedemption'>
                    <div className='gh-portal-gift-checkout'>
                        <div className='gh-portal-gift-checkout-left'>
                            <div className='gh-portal-gift-checkout-bg' aria-hidden='true' />
                            <div className='gh-portal-gift-checkout-inner'>
                                <header className='gh-portal-gift-checkout-header'>
                                    <h1 className='gh-portal-main-title'>{popupTitle}</h1>
                                    <p className='gh-portal-gift-checkout-subtitle'>{popupDescription}</p>
                                </header>
                                <div className='gh-portal-gift-redemption-form'>
                                    {showOTCForm ? this.renderOTCForm() : this.renderCloseButton()}
                                </div>
                            </div>
                        </div>
                        <div className='gh-portal-gift-checkout-right'>
                            <div className='gh-portal-gift-checkout-card-stack' data-revealing={this.state.showDetails}>
                                <div className='gh-portal-gift-checkout-card-frame'>
                                    <div className='gh-portal-gift-checkout-card'>
                                        <div className='gh-portal-gift-checkout-card-site'>
                                            {siteIcon && (
                                                <img className='gh-portal-gift-checkout-card-site-icon' src={siteIcon} alt='' />
                                            )}
                                            <span className='gh-portal-gift-checkout-card-site-name'>{siteTitle}</span>
                                        </div>
                                        <div className='gh-portal-gift-checkout-card-meta'>
                                            <div className='gh-portal-gift-checkout-card-duration'>{getGiftDurationLabel(gift)}</div>
                                            <div className='gh-portal-gift-checkout-card-tier'>{gift.tier?.name}</div>
                                        </div>
                                        <div className='gh-portal-gift-checkout-card-ribbon-h' aria-hidden='true' />
                                        <div className='gh-portal-gift-checkout-card-ribbon-v' aria-hidden='true' />
                                        <svg className='gh-portal-gift-checkout-card-bow' viewBox='78 -2 90 86' xmlns='http://www.w3.org/2000/svg' aria-hidden='true' fill='currentColor' fillRule='evenodd' clipRule='evenodd'>
                                            <path d='M144.97 1.01186C147.471 0.122129 150.26 -0.292891 153.133 0.229636C156.058 0.761757 158.682 2.19718 160.872 4.38686C165.524 9.03938 166.185 14.9291 164.582 20.2384C163.08 25.217 159.616 29.8398 155.649 33.6447C150.07 38.996 142.324 43.8128 134.494 46.1457L156.801 73.8234L147.457 81.3546L122.879 50.8595L98.3012 81.3546L88.9574 73.8234L111.19 46.2384C103.253 43.9422 95.374 39.0677 89.7201 33.6447C85.7534 29.8398 82.2893 25.2169 80.7865 20.2384C79.1841 14.9291 79.8451 9.03938 84.4975 4.38686C86.6872 2.19723 89.3105 0.761751 92.2358 0.229636C95.1087 -0.292854 97.8981 0.122143 100.399 1.01186C105.26 2.74162 109.666 6.47713 113.237 10.6242C116.925 14.9077 120.297 20.3226 122.684 25.9962C125.071 20.3224 128.444 14.9078 132.132 10.6242C135.703 6.4771 140.109 2.74161 144.97 1.01186ZM96.3764 12.3175C95.3995 11.97 94.7641 11.9671 94.3832 12.0363C94.0547 12.0961 93.5929 12.2622 92.9828 12.8722C92.0356 13.8195 91.6948 14.8501 92.2748 16.7716C92.9549 19.0242 94.8576 21.9447 98.0268 24.9845C102.298 29.0813 107.807 32.4111 112.93 34.1994C111.244 28.8435 108.061 23.0037 104.144 18.4542C101.24 15.0821 98.471 13.063 96.3764 12.3175ZM150.986 12.0363C150.605 11.9671 149.97 11.9699 148.993 12.3175C146.898 13.063 144.129 15.082 141.225 18.4542C137.308 23.0037 134.125 28.8434 132.439 34.1994C137.562 32.4111 143.071 29.0813 147.342 24.9845C150.511 21.9446 152.414 19.0242 153.094 16.7716C153.674 14.8501 153.333 13.8195 152.386 12.8722C151.776 12.2622 151.314 12.0961 150.986 12.0363Z' />
                                        </svg>
                                    </div>
                                </div>

                                {benefits.length > 0 && (
                                    <>
                                        <div
                                            className='gh-portal-gift-checkout-details'
                                            data-open={this.state.showDetails}
                                            aria-hidden={!this.state.showDetails}
                                        >
                                            <div className='gh-portal-gift-checkout-details-inner'>
                                                <div className='gh-portal-gift-checkout-benefits'>
                                                    {benefits.map((benefit, index) => {
                                                        const benefitName = typeof benefit === 'string' ? benefit : benefit?.name;
                                                        const benefitKey = typeof benefit === 'string' ? benefit : benefit?.id || `gift-benefit-${index}`;

                                                        if (!benefitName) {
                                                            return null;
                                                        }

                                                        return (
                                                            <div className='gh-portal-gift-checkout-benefit' key={benefitKey}>
                                                                <CheckmarkIcon />
                                                                <span>{benefitName}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type='button'
                                            className={'gh-portal-gift-checkout-details-toggle' + (this.state.showDetails ? ' is-open' : '')}
                                            onClick={() => this.setState(s => ({showDetails: !s.showDetails}))}
                                            aria-expanded={this.state.showDetails}
                                        >
                                            {/* eslint-disable-next-line i18next/no-literal-string -- copy not yet finalised */}
                                            {this.state.showDetails ? 'Hide details' : 'Gift details'}
                                            <ChevronIcon />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    render() {
        const {otcRef, lastPage, pageData} = this.context;
        const showOTCForm = !!otcRef;
        const isGiftMode = lastPage === 'gift' && !!pageData?.gift;

        if (isGiftMode) {
            return this.renderGiftLayout(showOTCForm);
        }

        return (
            <div className='gh-portal-content'>
                <CloseButton />
                {this.renderFormHeader()}
                {showOTCForm ? this.renderOTCForm() : this.renderCloseButton()}
            </div>
        );
    }
}
