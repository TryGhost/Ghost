import ActionButton from '../common/ActionButton';
import AppContext from '../../AppContext';
import InputForm from '../common/InputForm';
import {ValidateInputForm} from '../../utils/form';

const React = require('react');

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
        }, () => {
            const {email, errors} = this.state;
            const hasFormErrors = (errors && Object.values(errors).filter(d => !!d).length > 0);
            if (!hasFormErrors) {
                this.context.onAction('signin', {email});
            }
        });
    }

    handleInputChange(e, field) {
        const fieldName = field.name;
        this.setState({
            [fieldName]: e.target.value
        });
    }

    handleInputBlur(e) {
        this.setState((state) => {
            return {
                errors: ValidateInputForm({fields: this.getInputFields({state})})
            };
        });
    }

    getInputFields({state}) {
        const errors = state.errors || {};
        const fields = [
            {
                type: 'email',
                value: state.email,
                placeholder: 'jamie@example.com',
                label: 'Email',
                name: 'email',
                required: true,
                errorMessage: errors.email || ''
            }
        ];
        return fields;
    }

    renderSubmitButton() {
        const isRunning = (this.context.action === 'signin:running');
        const label = isRunning ? 'Sending' : 'Send Login Link';
        const disabled = isRunning ? true : false;
        return (
            <ActionButton
                style={{width: '100%'}}
                onClick={e => this.handleSignin(e)}
                disabled={disabled}
                brandColor={this.context.brandColor}
                label={label}
            />
        );
    }

    renderSignupMessage() {
        const brandColor = this.context.brandColor;
        return (
            <footer className='gh-portal-signup-footer'>
                <div>Don't have an account?</div>
                <button className='gh-portal-btn gh-portal-btn-link' style={{color: brandColor}} onClick={() => this.context.onAction('switchPage', {page: 'signup'})}>Subscribe</button>
            </footer>
        );
    }

    renderForm() {
        return (
            <section>
                <div className='gh-portal-section form'>
                    <InputForm
                        fields={this.getInputFields({state: this.state})}
                        onChange={(e, field) => this.handleInputChange(e, field)}
                        onBlur={(e, field) => this.handleInputBlur(e, field)}
                    />
                </div>
                <div>
                    {this.renderSubmitButton()}
                    {this.renderSignupMessage()}
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
                <span className='gh-portal-signup-logo' style={logoStyle}></span>
            );
        }
        return null;
    }

    renderFormHeader() {
        const siteTitle = this.context.site.title || 'Site Title';

        return (
            <header className='gh-portal-signin-header'>
                {this.renderSiteLogo()}
                <h2 className="gh-portal-main-title">Sign in to {siteTitle}</h2>
            </header>
        );
    }

    render() {
        return (
            <div>
                {this.renderFormHeader()}
                {this.renderForm()}
            </div>
        );
    }
}
