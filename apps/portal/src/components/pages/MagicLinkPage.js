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

    renderFormHeader() {
        const {t, otcRef} = this.context;

        let popupTitle = t(`Now check your email!`);
        let popupDescription = t(`A login link has been sent to your inbox. If it doesn't arrive in 3 minutes, be sure to check your spam folder.`);

        if (this.context.lastPage === 'signup') {
            popupTitle = t(`Now check your email!`);
            popupDescription = t(`To complete signup, click the confirmation link in your inbox. If it doesn't arrive within 3 minutes, check your spam folder!`);
        }

        if (this.context.lastPage === 'signin' && otcRef) {
            popupDescription = t(`An email has been sent to your inbox. Use the link inside or enter the code below.`);
        }

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
                    onClick={() => this.context.onAction('switchPage', {page: 'signin'})}
                >
                    {t('Back to Log in')}
                </div>
            </>
        );
    }

    handleClose() {
        this.context.onAction('closePopup');
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
        this.setState((state) => {
            const {t} = this.context;
            const code = (state.otc || '').trim();
            return {
                errors: {
                    [OTC_FIELD_NAME]: code ? '' : t('Enter code below')
                }
            };
        }, () => {
            const {otc, errors} = this.state;
            const {otcRef} = this.context;
            const {redirect} = this.context.pageData ?? {};
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors && otcRef) {
                this.context.onAction('verifyOTC', {otc, otcRef, redirect});
            }
        }
        );
    }

    handleInputChange(e, field) {
        const fieldName = field.name;
        this.setState({
            [fieldName]: e.target.value
        });
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
                        maxlength={6}
                        onChange={e => this.handleInputChange(e, {name: OTC_FIELD_NAME})}
                    />
                </section>
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
