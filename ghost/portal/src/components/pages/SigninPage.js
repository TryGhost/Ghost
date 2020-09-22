import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
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
        const label = isRunning ? 'Sending login link...' : 'Send login link';
        const disabled = isRunning ? true : false;
        return (
            <ActionButton
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
        const brandColor = this.context.brandColor;
        return (
            <div className='gh-portal-signup-message'>
                <div>Don't have an account?</div>
                <button className='gh-portal-btn gh-portal-btn-link' style={{color: brandColor}} onClick={() => this.context.onAction('switchPage', {page: 'signup'})}>Sign up</button>
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
                        onBlur={(e, field) => this.handleInputBlur(e, field)}
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
        const siteTitle = this.context.site.title || 'Site Title';

        return (
            <header className='gh-portal-signin-header'>
                {this.renderSiteLogo()}
                <h2 className="gh-portal-main-title">Log in to {siteTitle}</h2>
            </header>
        );
    }

    render() {
        return (
            <>
                <div className='gh-portal-content signin'>
                    <CloseButton />
                    {this.renderFormHeader()}
                    {this.renderForm()}
                </div>
                <footer className='gh-portal-signin-footer'>
                    {this.renderSubmitButton()}
                    {this.renderSignupMessage()}
                </footer>
            </>
        );
    }
}
