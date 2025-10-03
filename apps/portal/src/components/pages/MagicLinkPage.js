import React from 'react';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import AppContext from '../../AppContext';
import {ReactComponent as EnvelopeIcon} from '../../images/icons/envelope.svg';

import InputField from '../common/InputField';

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
        margin-bottom: 30px;
    }
`;

const OTC_FIELD_NAME = 'otc';

export default class MagicLinkPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            [OTC_FIELD_NAME]: '',
            errors: {}
        };
    }

    /**
     * Generates configuration object containing translated description messages for magic link scenarios
     * @param {string} submittedEmailOrInbox - The email address or fallback text ('your inbox')
     * @returns {Object} Configuration object with message templates for signin/signup scenarios
     */
    getDescriptionConfig(submittedEmailOrInbox) {
        const {t} = this.context;
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
        const {t, otcRef, pageData, lastPage} = this.context;
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
        const {t} = this.context;

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
        const {t} = this.context;

        const label = t('Close');
        return (
            <ActionButton
                style={{width: '100%'}}
                onClick={e => this.handleClose(e)}
                brandColor={this.context.brandColor}
                label={label}
            />
        );
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
        const {t, labs} = this.context;
        const missingCodeError = labs?.membersSigninOTCAlpha ? t('Enter code above') : t('Enter code below');

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
            });
        } else {
            this.setState({
                [fieldName]: value
            });
        }
    }

    renderOTCForm() {
        const {t, action, labs, otcRef} = this.context;
        const errors = this.state.errors || {};

        if (!labs?.membersSigninOTC || !otcRef) {
            return null;
        }

        // @TODO: action implementation TBD
        const isRunning = (action === 'verifyOTC:running');
        const isError = (action === 'verifyOTC:failed');

        return (
            <form onSubmit={e => this.handleSubmit(e)}>
                {labs?.membersSigninOTCAlpha ? (
                    <section className='gh-portal-section gh-portal-otp'>
                        <div className={`gh-portal-otp-field-container ${errors.otc ? 'error' : ''}`}>
                            <input
                                id={`input-${OTC_FIELD_NAME}`}
                                className={`gh-portal-input ${errors.otc ? 'error' : ''}`}
                                name={OTC_FIELD_NAME}
                                type="text"
                                value={this.state.otc}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                aria-label={t('Code')}
                                autoFocus={false}
                                maxLength={6}
                                onChange={e => this.handleInputChange(e, {name: OTC_FIELD_NAME})}
                            />
                        </div>
                        {errors.otc &&
                        <div className="gh-portal-otp-error">
                            {errors.otc}
                        </div>}
                    </section>
                ) : (
                    <section className='gh-portal-section'>
                        {/* @TODO: create different input component with updated design */}
                        <InputField
                            id={`input-${OTC_FIELD_NAME}`}
                            name={OTC_FIELD_NAME}
                            type="text"
                            value={this.state.otc}
                            placeholder="• • • • • •"
                            label={t('Code')}
                            errorMessage={errors.otc || ''}
                            autoFocus={false}
                            maxLength={6}
                            onChange={e => this.handleInputChange(e, {name: OTC_FIELD_NAME})}
                        />
                    </section>
                )}

                <footer className='gh-portal-signin-footer'>
                    <ActionButton
                        style={{width: '100%'}}
                        onClick={e => this.handleSubmit(e)}
                        brandColor={this.context.brandColor}
                        label={isRunning ? t('Verifying...') : t('Continue')}
                        isRunning={isRunning}
                        retry={isError}
                        disabled={isRunning}
                    />
                </footer>
            </form>
        );
    }

    render() {
        const {labs, otcRef} = this.context;
        const showOTCForm = labs?.membersSigninOTC && otcRef;

        return (
            <div className='gh-portal-content'>
                <CloseButton />
                {this.renderFormHeader()}
                {showOTCForm ? this.renderOTCForm() : this.renderCloseButton()}
            </div>
        );
    }
}
