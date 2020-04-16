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
            backgroundColor: '#3eb0ef',
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
            borderRadius: '5px',
            fontSize: '14px',
            marginBottom: '12px'
        };

        const fields = {
            email: {
                type: 'email',
                value: this.state.email,
                placeholder: 'Email...',
                label: 'email'
            }
        };
        const field = fields[fieldName];
        return (
            <input
                type={field.type}
                placeholder={field.placeholder}
                value={field.value}
                onChange={(e) => {
                    this.handleInput(e, fieldName);
                }}
                aria-label={field.label}
                style={inputStyle}
            />
        );
    }

    renderSignupMessage() {
        return (
            <div style={{display: 'flex'}}>
                <div style={{marginRight: '6px'}}> Not a member ? </div>
                <div style={{color: '#3db0ef', fontWeight: 'bold', cursor: 'pointer'}} role="button" onClick={() => this.props.switchPage('signup')}> Subscribe </div>
            </div>
        );
    }

    renderForm() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px'}}>
                {this.renderInputField('email')}
                {this.renderSubmitButton()}
                {this.renderSignupMessage()}
            </div>
        );
    }

    renderFormHeader() {
        const siteTitle = (this.props.data.site && this.props.data.site.title) || 'Site Title';
        const siteDescription = (this.props.data.site && this.props.data.site.description) || 'Site Description';

        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px'}}>
                <div style={{fontSize: '18px', fontWeight: 'bold'}}> Signin to {siteTitle}</div>
                <div> {siteDescription} </div>
            </div>
        );
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                <div style={{paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px'}}>
                    {this.renderFormHeader()}
                    {this.renderForm()}
                </div>
            </div>
        );
    }
}
