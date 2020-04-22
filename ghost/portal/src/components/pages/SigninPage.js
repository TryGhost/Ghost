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
        const buttonStyle = {
            display: 'inline-block',
            padding: '0 1.8rem',
            height: '44px',
            border: '0',
            fontSize: '1.5rem',
            lineHeight: '42px',
            fontWeight: '600',
            textAlign: 'center',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            borderRadius: '5px',
            cursor: 'pointer',
            transition: '.4s ease',
            color: '#fff',
            backgroundColor: this.props.brandColor || '#3eb0ef',
            boxShadow: 'none',
            userSelect: 'none',
            width: '100%',
            marginBottom: '12px'
        };
        const isRunning = this.props.action && this.props.action.name === 'signin' && this.props.action.isRunning;
        const label = this.state.isLoading ? 'Sending' : 'Send Login Link';
        const disabled = isRunning ? true : false;
        if (disabled) {
            buttonStyle.backgroundColor = 'grey';
        }

        return (
            <button onClick={(e) => {
                this.handleSignin(e);
            }} style={buttonStyle} disabled={disabled}>
                {label}
            </button>
        );
    }

    renderInputField(fieldName) {
        const inputStyle = {
            display: 'block',
            padding: '0 .6em',
            width: '100%',
            height: '44px',
            outline: '0',
            border: '1px solid #c5d2d9',
            color: 'inherit',
            textDecoration: 'none',
            background: '#fff',
            borderRadius: '9px',
            fontSize: '14px',
            marginBottom: '12px',
            boxSizing: 'border-box'
        };

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
            <>
                <label htmlFor={field.name} style={{marginBottom: '3px', fontSize: '12px', fontWeight: '700'}}> {field.label} </label>
                <input
                    type={field.type}
                    name={field.name}
                    placeholder={field.placeholder}
                    value={field.value}
                    onChange={(e) => {
                        this.handleInput(e, fieldName);
                    }}
                    style={inputStyle}
                    aria-label={field.label}
                />
            </>
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
