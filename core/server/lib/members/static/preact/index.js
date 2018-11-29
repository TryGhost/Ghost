import './style.css';
import { Component } from 'preact';
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
                email, password
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
                name, email, password
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
                mainTitle = 'Signup';
                ctaTitle = 'Already a member?';
                ctaLabel = 'Sign in';
                hash = 'signin';
                break;
            case 'signin':
                mainTitle = 'Signin';
                ctaTitle = 'Not a member yet?';
                ctaLabel = 'Sign up';
                hash = 'signup';
                break;
        }
        return (
            <div className='auth-form-headers'>
                <div className='headers-main-title'> {mainTitle} </div>
                <div className='headers-cta'>
                    <div className='cta-title'> {ctaTitle} </div>
                    <div className='cta-label'
                        onClick={(e) => {window.location.hash = hash}}
                    >
                        {ctaLabel}
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
                buttonLabel = 'Sign in';
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
            <div className="auth-form-elements">
                <form className={formType} onSubmit={(e) => this.submitForm(e)}>
                    {formElements}
                    <button type="submit" name={formType} >{buttonLabel} </button>
                </form>
            </div>
        )
    }

    renderFormComponent(formType = this.state.formType) {
        return (
            <div className="auth-form-container">
                {this.renderFormHeaders(formType)}
                {this.renderFormSection(formType)}
            </div>
        );
    }

    render() {
        return (
            <div className='member-auth-page'>
                {this.renderFormComponent()}
            </div>
        );
    }
}
