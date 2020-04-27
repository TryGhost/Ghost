import ActionButton from '../common/ActionButton';
import InputField from '../common/InputField';

const React = require('react');
const PropTypes = require('prop-types');

export default class SigninPage extends React.Component {
    static propTypes = {
        data: PropTypes.shape({
            site: PropTypes.shape({
                title: PropTypes.string,
                description: PropTypes.string
            }).isRequired
        }).isRequired,
        onAction: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            email: ''
        };
    }

    handleSignin(e) {
        e.preventDefault();
        const email = this.state.email;

        this.props.onAction('signin', {email});
    }

    handleInput(e, field) {
        this.setState({
            [field]: e.target.value,
            showSuccess: false,
            isLoading: false
        });
    }

    renderSubmitButton() {
        const isRunning = this.props.action && this.props.action.name === 'signin' && this.props.action.isRunning;
        const label = this.state.isLoading ? 'Sending' : 'Send Login Link';
        const disabled = isRunning ? true : false;
        return (
            <ActionButton
                onClick={e => this.handleSignin(e)}
                disabled={disabled}
                brandColor={this.props.brandColor}
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
                type={field.type}
                name={field.name}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e, fieldName) => this.handleInput(e, fieldName)}
            />
        );
    }

    renderSignupMessage() {
        const color = this.props.brandColor || '#3db0ef';
        return (
            <div style={{display: 'flex', justifyContent: 'center'}}>
                <div style={{marginRight: '6px', color: '#929292'}}> Don't have an account ? </div>
                <div style={{color, fontWeight: 'bold', cursor: 'pointer'}} role="button" onClick={() => this.props.switchPage('signup')}> Subscribe </div>
            </div>
        );
    }

    renderForm() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', marginBottom: '12px', padding: '0 18px'}}>
                {this.renderInputField('email')}
                {this.renderSubmitButton()}
                {this.renderSignupMessage()}
            </div>
        );
    }

    renderSiteLogo() {
        const siteLogo = (this.props.data.site && this.props.data.site.logo);

        const logoStyle = {
            position: 'relative',
            display: 'block',
            width: '48px',
            height: '48px',
            marginBottom: '12px',
            backgroundPosition: '50%',
            backgroundSize: 'cover',
            borderRadius: '100%',
            boxShadow: '0 0 0 3px #fff'
        };

        if (siteLogo) {
            logoStyle.backgroundImage = `url(${siteLogo})`;
            return (
                <span style={logoStyle}> </span>
            );
        }
        return null;
    }

    renderFormHeader() {
        const siteTitle = (this.props.data.site && this.props.data.site.title) || 'Site Title';

        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '18px'}}>
                {this.renderSiteLogo()}
                <div style={{fontSize: '21px', fontWeight: '400'}}> Sign in to {siteTitle}</div>
            </div>
        );
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                <div style={{paddingLeft: '16px', paddingRight: '16px'}}>
                    {this.renderFormHeader()}
                    {this.renderForm()}
                </div>
            </div>
        );
    }
}
