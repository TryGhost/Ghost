import './assets/styles/members.css';
import { Component } from 'preact';
const origin = new URL(window.location).origin;
const membersApi = location.pathname.replace(/\/members\/auth\/?$/, '/ghost/api/v2/members');
const storage = window.localStorage;
var layer0 = require('./layer0');

export default class App extends Component {
    constructor() {
        super();
        this.state = {
            formData: {},
            formType: window.location.hash.replace(/^#/, '')
        };
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
        if (!window.location.hash.replace(/^#/, '')) {
            window.location.hash = 'signin';
        }
    }

    onHashChange() {
        this.setState({
            formData: {},
            formType: window.location.hash.replace(/^#/, '')
        });
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
        switch (this.state.formType) {
            case 'signin':
                this.signin(this.state.formData);
                break;
            case 'signup':
                this.signup(this.state.formData);
                break;
        }
        return false;
    }

    signin({ email, password }) {
        this.gatewayFrame.call('signin', {email, password}, function (err, successful) {
            if (err) {
                console.log("Unable to login", err);
            }
            console.log("Successfully logged in");
        });
    }

    signup({ name, email, password }) {
        this.gatewayFrame.call('signup', { name, email, password }, function (err, successful) {
            if (err) {
                console.log("Unable to signup", err);
            }
            console.log("Successfully signed up");
        });
    }

    renderFormHeaders(formType) {
        let mainTitle = '';
        let ctaTitle = '';
        let ctaLabel = '';
        let hash = '';
        switch (formType) {
            case 'signup':
                mainTitle = 'Sign Up';
                ctaTitle = 'Already a member?';
                ctaLabel = 'Log in';
                hash = 'signin';
                break;
            case 'signin':
                mainTitle = 'Log In';
                ctaTitle = 'Not a member?';
                ctaLabel = 'Sign up';
                hash = 'signup';
                break;
        }
        return (
            <div className="flex flex-column">
                <div className="gm-logo"></div>
                <div className="flex justify-between items-end mt2 gm-form-headers">
                    <h1>{ mainTitle }</h1>
                    <div className="flex gm-headers-cta">
                        <h4 className="gm-cta-title">{ ctaTitle }</h4>
                        <div className="gm-cta-label"
                            onClick={(e) => {window.location.hash = hash}}
                        >
                            {ctaLabel}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    renderFormInput({type, name, placeholder}) {
        let value = this.state.formData[name];
        let className = "mt3";
        className += value ? " active" : "";
        return (
            <input
                type={type}
                name={name}
                key={name}
                placeholder={placeholder}
                value={value || ''}
                onChange={(e) => this.onInputChange(e, name)}
                className={className}
            />
        )
    }

    renderFormSection(formType) {
        const emailInput = this.renderFormInput({
            type: 'email',
            name: 'email',
            placeholder: 'Email...'
        });
        const passwordInput = this.renderFormInput({
            type: 'password',
            name: 'password',
            placeholder: 'Password...'
        });
        const nameInput = this.renderFormInput({
            type: 'text',
            name: 'name',
            placeholder: 'Name...'
        });
        let formElements = [];
        let buttonLabel = '';
        switch (formType) {
            case 'signin':
                formElements = [emailInput, passwordInput];
                buttonLabel = 'Log in';
                break;
            case 'signup':
                formElements = [nameInput, emailInput, passwordInput];
                buttonLabel = 'Sign up';
                break;
            case 'reset':
                formElements = [emailInput];
                buttonLabel = 'Send reset password instructions';
                break;
        }
        return (
            <div className="flex flex-column items-start gm-form-elements">
                <form className={ formType } onSubmit={(e) => this.submitForm(e)}>
                    { formElements }
                    <button type="submit" name={ formType } className="mt5">{ buttonLabel }</button>
                </form>
            </div>
        )
    }

    renderFormComponent(formType = this.state.formType) {
        return (
            <div className="gm-modal">
                {this.renderFormHeaders(formType)}
                {this.renderFormSection(formType)}
            </div>
        );
    }

    render() {
        return (
            <div className="gm-auth-page">
                {this.renderFormComponent()}
            </div>
        );
    }
}
