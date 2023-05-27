import React from 'react';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
// import SiteTitleBackButton from '../common/SiteTitleBackButton';
import AppContext from '../../AppContext';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';

export default class SigninPage extends React.Component {
    static contextType = AppContext;

    constructor(props) {
        super(props);
        this.state = {
            email: ''
        };
    }

    componentDidMount() {
        const {member} = this.context;
        if (member) {
            this.context.onAction('switchPage', {
                page: 'accountHome'
            });
        }
    }

    handleSignin(e) {
        e.preventDefault();
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state})})
            };
        }, async () => {
            const {email, errors} = this.state;
            const {redirect} = this.context.pageData ?? {};
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                this.context.onAction('signin', {email, redirect});
            }
        });
    }

    handleInputChange(e, field) {
        const fieldName = field.name;
        this.setState({
            [fieldName]: e.target.value
        });
    }

    onKeyDown(e) {
        // Handles submit on Enter press
        if (e.keyCode === 13){
            this.handleSignin(e);
        }
    }

    getInputFields({state}) {
        const {t} = this.context;

        const errors = state.errors || {};
        const fields = [
            {
                type: 'email',
                value: state.email,
                placeholder: 'jamie@example.com',
                label: t('Email'),
                name: 'email',
                required: true,
                errorMessage: errors.email || '',
                autoFocus: true
            }
        ];
        return fields;
    }

    renderSubmitButton() {
        const {action, t} = this.context;
        let retry = false;
        const isRunning = (action === 'signin:running');
        let label = isRunning ? t('Sending login link...') : t('Continue');
        const disabled = isRunning ? true : false;
        if (action === 'signin:failed') {
            label = t('Retry');
            retry = true;
        }
        return (
            <ActionButton
                dataTestId='signin'
                retry={retry}
                style={{width: '100%'}}
                onClick={e => this.handleSignin(e)}
                disabled={disabled}
                brandColor={this.context.brandColor}
                label={label}
                isRunning={isRunning}
            />
        );
    }

    renderSignupMessage() {
        const {brandColor, t} = this.context;
        return (
            <div className='gh-portal-signup-message'>
                <div>{t('Don\'t have an account?')}</div>
                <button
                    data-test-button='signup-switch'
                    className='gh-portal-btn gh-portal-btn-link'
                    style={{color: brandColor}}
                    onClick={() => this.context.onAction('switchPage', {page: 'signup'})}
                >
                    <span>{t('Sign up')}</span>
                </button>
            </div>
        );
    }

    renderForm() {
        return (
            <section>
                <div className='gh-portal-section'>
                    <InputForm
                        fields={this.getInputFields({state: this.state})}
                        onChange={(e, field) => this.handleInputChange(e, field)}
                        onKeyDown={(e, field) => this.onKeyDown(e, field)}
                    />
                </div>
            </section>
        );
    }

    renderSiteLogo() {
        const siteLogo = this.context.site.icon;

        const logoStyle = {};

        if (siteLogo) {
            logoStyle.backgroundImage = `url(${siteLogo})`;
            return (
                <img className='gh-portal-signup-logo' src={siteLogo} alt={this.context.site.title} />
            );
        }
        return null;
    }

    renderFormHeader() {
        // const siteTitle = this.context.site.title || 'Site Title';
        const {t} = this.context;

        return (
            <header className='gh-portal-signin-header'>
                {this.renderSiteLogo()}
                <h1 className="gh-portal-main-title">{t('Sign in')}</h1>
            </header>
        );
    }

    render() {
        return (
            <>
                {/* <div className='gh-portal-back-sitetitle'>
                    <SiteTitleBackButton />
                </div> */}
                <CloseButton />
                <div className='gh-portal-logged-out-form-container'>
                    <div className='gh-portal-content signin'>
                        {this.renderFormHeader()}
                        {this.renderForm()}
                    </div>
                    <footer className='gh-portal-signin-footer'>
                        {this.renderSubmitButton()}
                        {this.renderSignupMessage()}
                    </footer>
                </div>
            </>
        );
    }
}
