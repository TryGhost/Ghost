import ActionButton from '../common/ActionButton';
import InputField from '../common/InputField';
import AppContext from '../../AppContext';

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
        const email = this.state.email;

        this.context.onAction('signin', {email});
    }

    handleInput(e, field) {
        this.setState({
            [field]: e.target.value,
            showSuccess: false,
            isLoading: false
        });
    }

    renderSubmitButton() {
        const isRunning = (this.context.action === 'signin:running');
        const label = isRunning ? 'Sending' : 'Send Login Link';
        const disabled = isRunning ? true : false;
        return (
            <ActionButton
                onClick={e => this.handleSignin(e)}
                disabled={disabled}
                brandColor={this.context.brandColor}
                label={label}
            />
        );
    }

    renderInputField(fieldName) {
        const fields = {
            email: {
                type: 'email',
                value: this.state.email,
                placeholder: 'Your email address',
                label: 'Email',
                name: 'email'
            }
        };
        const field = fields[fieldName];
        return (
            <InputField
                label = {field.label}
                hideLabel = {true}
                type={field.type}
                name={field.name}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e, name) => this.handleInput(e, name)}
            />
        );
    }

    renderSignupMessage() {
        const brandColor = this.context.brandColor;
        return (
            <div className='flex justify-center gh-portal-signup-footer'>
                <div>Don't have an account?</div>
                <button className='gh-portal-btn gh-portal-btn-link' style={{color: brandColor}} onClick={() => this.context.onAction('switchPage', {page: 'signup'})}>Subscribe</button>
            </div>
        );
    }

    renderForm() {
        return (
            <div>
                <div className='gh-portal-section form'>{this.renderInputField('email')}</div>
                <div> 
                    {this.renderSubmitButton()}
                    {this.renderSignupMessage()}
                </div>
            </div>
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
            <div className='gh-portal-signin-header'>
                {this.renderSiteLogo()}
                <h2 className="gh-portal-main-title">Sign in to {siteTitle}</h2>
            </div>
        );
    }

    render() {
        return (
            <div className='flex flex-column'>
                {this.renderFormHeader()}
                {this.renderForm()}
            </div>
        );
    }
}
