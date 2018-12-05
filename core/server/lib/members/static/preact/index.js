import './assets/styles/members.css';
import { Component } from 'preact';
const origin = new URL(window.location).origin;
const membersApi = location.pathname.replace(/\/members\/auth\/?$/, '/ghost/api/v2/members');
const storage = window.localStorage;

export default class App extends Component {
    constructor() {
        super();
        this.state = {
            formData: {},
            formType: window.location.hash.replace(/^#/, '')
        };
        window.addEventListener("hashchange", () => this.onHashChange(), false);
    }

    componentDidMount() {
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
        fetch(`${membersApi}/signin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email, password, origin
            })
        }).then((res) => {
            if (!res.ok) {
                throw new Error(res.statusCode);
            }
            storage.setItem('signedin', true);
        });
    }

    signup({ name, email, password }) {
        fetch(`${membersApi}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name, email, password, origin
            })
        }).then((res) => {
            if (!res.ok) {
                throw new Error(res.statusCode);
            }
            storage.setItem('signedin', true);
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
        return (
            <input
                type={type}
                name={name}
                key={name}
                placeholder={placeholder}
                value={value || ''}
                onChange={(e) => this.onInputChange(e, name)}
                className="mt3"
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
