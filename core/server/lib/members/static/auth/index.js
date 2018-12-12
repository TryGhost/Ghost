import './styles/members.css';
import {IconEmail, IconLock, IconName, IconClose, IconError} from './components/icons';
import { Component } from 'preact';
const origin = new URL(window.location).origin;
const membersApi = location.pathname.replace(/\/members\/auth\/?$/, '/ghost/api/v2/members');
const storage = window.localStorage;
var layer0 = require('./layer0');

function getFreshState() {
    const [hash, formType, query] = window.location.hash.match(/^#([^?]+)\??(.*)$/) || ['#signin?', 'signin', ''];
    return {
        formData: {},
        query,
        formType,
        parentContainerClass: 'gm-page-overlay',
        showError: false,
        submitFail: false
    };
}

export default class App extends Component {
    constructor() {
        super();
        this.state = getFreshState();
        this.gatewayFrame = '';
        window.addEventListener("hashchange", () => this.onHashChange(), false);
    }

    loadGateway() {
        const blogUrl = window.location.href.substring(0, window.location.href.indexOf('/members/auth'));
        const frame = window.document.createElement('iframe');
        frame.id = 'member-gateway';
        frame.style.display = 'none';
        frame.src = `${blogUrl}/members/gateway`;
        frame.onload =  () => {
            this.gatewayFrame = layer0(frame);
        };
        document.body.appendChild(frame);
    }

    componentDidMount() {
        this.loadGateway();
    }

    onHashChange() {
        this.setState(getFreshState());
    }

    onInputChange(e, name) {
        let value = e.target.value;
        this.setState({
            formData: {
                ...this.state.formData,
                [name]: value
            }
        });
    }

    submitForm(e) {
        e.preventDefault();
        if (this.hasFrontendError(this.state.formType)) {
            return false;
        }
        switch (this.state.formType) {
            case 'signin':
                this.signin(this.state.formData);
                break;
            case 'signup':
                this.signup(this.state.formData);
                break;
            case 'request-password-reset':
                this.requestPasswordReset(this.state.formData);
                break;
            case 'password-reset-sent':
                this.resendPasswordResetEmail(this.state.formData)
                break;
            case 'reset-password':
                this.resetPassword(this.state.formData)
                break;
        }
        return false;
    }

    signin({ email, password }) {
        this.gatewayFrame.call('signin', {email, password}, (err, successful) => {
            if (err || !successful) {
                this.setState({
                    submitFail: true
                });
            }
        });
    }

    signup({ name, email, password }) {
        this.gatewayFrame.call('signup', { name, email, password }, (err, successful) => {
            if (err || !successful) {
                this.setState({
                    submitFail: true
                });
            }
        });
    }

    requestPasswordReset({ email }) {
        this.gatewayFrame.call('request-password-reset', {email}, (err, successful) => {
            if (err || !successful) {
                this.setState({
                    submitFail: true
                });
            } else {
                window.location.hash = 'password-reset-sent';
            }
        });
    }

    resendPasswordResetEmail({ email }) {
        this.gatewayFrame.call('request-password-reset', {email}, (err, successful) => {
            if (err || !successful) {
                this.setState({
                    submitFail: true
                });
            } else {
                window.location.hash = 'password-reset-sent';
            }
        });
    }

    resetPassword({ password }) {
        const queryParams = new URLSearchParams(this.state.query);
        const token = queryParams.get('token') || '';
        this.gatewayFrame.call('reset-password', {password, token}, (err, successful) => {
            if (err || !successful) {
                this.setState({
                    submitFail: true
                });
            }
        });
    }

    hasFrontendError(formType = this.state.formType) {
        switch(formType) {
            case 'signin':
                return (
                    this.hasError({errorType: 'no-input', data: 'email'}) ||
                    this.hasError({errorType: 'no-input', data: 'password'})
                );
            case 'signup':
                return (
                    this.hasError({errorType: 'no-input', data: 'email'}) ||
                    this.hasError({errorType: 'no-input', data: 'password'}) ||
                    this.hasError({errorType: 'no-input', data: 'name'})
                );
        }
        return false;
    }

    hasError({errorType, data}) {
        if (!this.state.showError) {
            return false;
        }
        let value = '';
        switch(errorType) {
            case 'no-input':
                value = this.state.formData[data];
                return (!value);
            case 'form-submit':
                return this.state.submitFail;
        }
    }

    renderError({error, formType}) {
        if (this.hasError(error)) {
            let errorLabel = '';
            switch(error.errorType) {
                case 'no-input':
                    errorLabel = `Enter ${error.data}`;
                    break;
                case 'form-submit':
                    switch(formType) {
                        case 'signin':
                            errorLabel = "Wrong email or password";
                            break;
                        case 'signup':
                            errorLabel = "Email already registered"
                            break;
                        case 'request-password-reset':
                            errorLabel = "Unable to send email"
                            break;
                        case 'password-reset-sent':
                            errorLabel = "Unable to send email"
                            break;
                    }
            }
            return (
                <span>{ errorLabel }</span>
            )
        }
        return null;
    }

    renderFormHeaders(formType) {
        let mainTitle = '';
        let ctaTitle = '';
        let ctaLabel = '';
        let hash = '';
        switch (formType) {
            case 'signup':
                mainTitle = 'Sign up';
                ctaTitle = 'Already a member?';
                ctaLabel = 'Log in';
                hash = 'signin';
                break;
            case 'signin':
                mainTitle = 'Log in';
                ctaTitle = 'Not a member?';
                ctaLabel = 'Sign up';
                hash = 'signup';
                break;
            case 'request-password-reset':
                mainTitle = 'Reset password';
                ctaTitle = '';
                ctaLabel = 'Log in';
                hash = 'signin';
                break;
            case 'password-reset-sent':
                mainTitle = 'Reset password';
                ctaTitle = '';
                ctaLabel = 'Log in';
                hash = 'signin';
                break;
            case 'reset-password':
                mainTitle = 'Reset password';
                ctaTitle = '';
                ctaLabel = 'Log in';
                hash = 'signin';
                break;
        }
        let formError = this.renderError({ error: {errorType: "form-submit"}, formType });
        return (
            <div>
                <div className="gm-logo"></div>
                <div className="gm-auth-header">
                    <h1>{ mainTitle }</h1>
                    <div className="flex items-baseline mt2">
                        <h4>{ ctaTitle }</h4>
                        <a href="javascript:;"
                            onClick={(e) => {window.location.hash = hash}}
                        >
                            {ctaLabel}
                        </a>
                    </div>
                </div>
                {(formError ? <div class="gm-form-errortext"><i>{ IconError }</i> { formError }</div> : "")}
            </div>
        )
    }

    renderFormInput({type, name, label, icon, placeholder, required, formType}) {
        let value = this.state.formData[name];
        let className = "";
        let forgot = (type === 'password' && formType === 'signin');
        let inputError = this.renderError({ error: {errorType: 'no-input', data: name}, formType });
        className += (value ? "gm-input-filled" : "") + (forgot ? " gm-forgot-input" : "") + (inputError ? " gm-error" : "");

        return (
            <div className="gm-form-element">
                <div className="gm-input">
                    <input
                        type={ type }
                        name={ name }
                        key={ name }
                        placeholder={ placeholder }
                        value={ value || '' }
                        onInput={ (e) => this.onInputChange(e, name) }
                        required = {required}
                        className={ className }
                    />
                    <label for={ name }> { placeholder }</label>
                    <i>{ icon }</i>
                    { (forgot ? <a href="javascript:;" className="gm-forgot-link" onClick={(e) => {window.location.hash = 'request-password-reset'}}>Forgot</a> : "") }
                </div>
                {/* { (inputError ? <div class="gm-input-errortext">{ inputError }</div> : "")} */}
            </div>
        )
    }

    renderFormText({formType}) {
        return (
            <div className="mt8">
                <p>We’ve sent a recovery email to your inbox. Follow the link in the email to reset your password.</p>
            </div>
        )
    }

    onSubmitClick(e) {
        this.setState({
            showError: true,
            submitFail: false
        });
    }

    renderFormSubmit({buttonLabel, formType}) {
        return (
            <div className="mt10">
                <button type="submit" name={ formType } className="gm-btn-blue" onClick={(e) => this.onSubmitClick(e)}>{ buttonLabel }</button>
            </div>
        )
    }

    renderFormSection(formType) {
        const emailInput = this.renderFormInput({
            type: 'email',
            name: 'email',
            label: 'Email',
            icon: IconEmail,
            placeholder: 'Email...',
            required: true,
            formType: formType
        });
        const passwordInput = this.renderFormInput({
            type: 'password',
            name: 'password',
            label: 'Password',
            icon: IconLock,
            placeholder: 'Password...',
            required: true,
            formType: formType
        });
        const nameInput = this.renderFormInput({
            type: 'text',
            name: 'name',
            label: 'Name',
            icon: IconName,
            placeholder: 'Name...',
            required: true,
            formType: formType
        });
        const formText = this.renderFormText({formType});

        let formElements = [];
        let buttonLabel = '';
        switch (formType) {
            case 'signin':
                buttonLabel = 'Log in';
                formElements = [emailInput, passwordInput, this.renderFormSubmit({formType, buttonLabel})];
                break;
            case 'signup':
                buttonLabel = 'Sign up';
                formElements = [nameInput, emailInput, passwordInput, this.renderFormSubmit({formType, buttonLabel})];
                break;
            case 'request-password-reset':
                buttonLabel = 'Send reset password instructions';
                formElements = [emailInput, this.renderFormSubmit({formType, buttonLabel})];
                break;
            case 'password-reset-sent':
                buttonLabel = 'Resend instructions';
                formElements = [formText, this.renderFormSubmit({formType, buttonLabel})];
                break;
            case 'reset-password':
                buttonLabel = 'Set password';
                formElements = [passwordInput, this.renderFormSubmit({formType, buttonLabel})];
                break;
        }
        return (
            <div className="flex flex-column mt6">
                <form className={ `gm-` + formType + `-form` } onSubmit={(e) => this.submitForm(e)} noValidate>
                    { formElements }
                </form>
            </div>
        )
    }

    renderFormComponent(formType = this.state.formType) {
        return (
            <div className="gm-modal-container">
                <div className="gm-modal gm-auth-modal" onClick={(e) => e.stopPropagation()}>
                    <a className="gm-modal-close" onClick={ (e) => this.close(e)}>{ IconClose }</a>
                    {this.renderFormHeaders(formType)}
                    {this.renderFormSection(formType)}
                </div>
            </div>
        );
    }

    render() {
        return (
            <div className={this.state.parentContainerClass} onClick={(e) => this.close(e)}>
                {this.renderFormComponent()}
            </div>
        );
    }

    close(event) {
        this.setState({
            parentContainerClass: 'gm-page-overlay close'
        });

        window.setTimeout(function(){
            this.setState({
                parentContainerClass: 'gm-page-overlay'
            });
            window.parent.postMessage('pls-close-auth-popup', '*');
        }
        .bind(this), 
        700);
    }
}
