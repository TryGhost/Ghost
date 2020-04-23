const React = require('react');
const PropTypes = require('prop-types');

export default class SignupPage extends React.Component {
    static propTypes = {
        data: PropTypes.shape({
            site: PropTypes.shape({
                title: PropTypes.string,
                description: PropTypes.string
            }).isRequired
        }).isRequired,
        onAction: PropTypes.func.isRequired,
        switchPage: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            name: '',
            email: '',
            plan: 'FREE',
            isLoading: false,
            showSuccess: false
        };
    }

    handleSignup(e) {
        e.preventDefault();
        const email = this.state.email;
        const name = this.state.name;
        const plan = this.state.plan;
        this.props.onAction('signup', {name, email, plan});
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
        const isRunning = this.props.action && this.props.action.name === 'signup' && this.props.action.isRunning;
        const label = this.state.isLoading ? 'Sending' : 'Continue';
        const disabled = isRunning ? true : false;
        if (disabled) {
            buttonStyle.backgroundColor = 'grey';
        }
        return (
            <button onClick={(e) => {
                this.handleSignup(e);
            }} style={buttonStyle} disabled={disabled}>
                {label}
            </button>
        );
    }

    handleSelectPlan(e, name) {
        this.setState({
            plan: name
        });
    }

    renderCheckbox({name, isChecked = false}) {
        const style = {
            width: '20px',
            height: '20px',
            border: 'solid 1px #cccccc'
        };

        return (
            <>
                <input
                    name={name}
                    type="checkbox"
                    style={style}
                    checked={this.state.plan === name}
                    onChange={e => e.preventDefault()}
                />
            </>
        );
    }

    renderPlanOptions(plans) {
        const nameStyle = {
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            color: '#343F44',
            justifyContent: 'center'
        };

        const priceStyle = {
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '9px'
        };
        const checkboxStyle = {
            display: 'flex',
            justifyContent: 'center'
        };
        const boxStyle = ({isLast = false}) => {
            const style = {
                padding: '12px 12px',
                flexBasis: '100%'
            };
            if (!isLast) {
                style.borderRight = '1px solid #c5d2d9';
            }
            return style;
        };

        const PriceLabel = ({name, currency, price}) => {
            if (name === 'FREE') {
                return (
                    <strong style={{
                        fontSize: '11px',
                        textAlign: 'center',
                        lineHeight: '18px',
                        color: '#929292',
                        fontWeight: 'normal'
                    }}> Access free members-only posts </strong>
                );
            }
            const type = name === 'MONTHLY' ? 'month' : 'year';
            return (
                <div style={{
                    display: 'inline',
                    verticalAlign: 'baseline'
                }}>
                    <span style={{fontSize: '14px', color: '#929292', fontWeight: 'normal'}}> {currency} </span>
                    <strong style={{fontSize: '21px'}}> {price} </strong>
                    <span style={{fontSize: '12px', color: '#929292', fontWeight: 'normal'}}> {` / ${type}`}</span>
                </div>
            );
        };

        return plans.map(({name, currency, price}, i) => {
            const isLast = i === plans.length - 1;
            const isChecked = this.state.plan === name;
            return (
                <div style={boxStyle({isLast})} key={name} onClick={e => this.handleSelectPlan(e, name)}>
                    <div style={checkboxStyle}> {this.renderCheckbox({name, isChecked})} </div>
                    <div style={nameStyle}> {name} </div>
                    <div style={priceStyle}>
                        {PriceLabel({name, currency, price})}
                    </div>
                </div>
            );
        });
    }

    renderPlans() {
        const containerStyle = {
            display: 'flex',
            border: '1px solid #c5d2d9',
            borderRadius: '9px',
            marginBottom: '12px'
        };
        const plans = this.props.data.site && this.props.data.site.plans;
        if (!plans) {
            return null;
        }
        return (
            <div style={{width: '100%'}}>
                <label style={{marginBottom: '3px', fontSize: '12px', fontWeight: '700'}}>  Plan </label>
                <div style={containerStyle}>
                    {this.renderPlanOptions([
                        {type: 'free', price: 'Decide later', name: 'FREE'},
                        {type: 'month', price: plans.monthly, currency: plans.currency_symbol, name: 'MONTHLY'},
                        {type: 'year', price: plans.yearly, currency: plans.currency_symbol, name: 'YEARLY'}
                    ])}
                </div>
            </div>
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
            name: {
                type: 'text',
                value: this.state.name,
                placeholder: 'Name...',
                label: 'Name',
                name: 'name'
            },
            email: {
                type: 'email',
                value: this.state.email,
                placeholder: 'Email...',
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

    renderLoginMessage() {
        const color = this.props.brandColor || '#3db0ef';
        return (
            <div style={{display: 'flex', justifyContent: 'center'}}>
                <div style={{marginRight: '6px', color: '#929292'}}> Already a member ? </div>
                <div style={{color, fontWeight: 'bold', cursor: 'pointer'}} role="button" onClick={() => this.props.switchPage('signin')}> Log in </div>
            </div>
        );
    }

    renderForm() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', marginBottom: '12px', padding: '0 18px'}}>
                {this.renderInputField('name')}
                {this.renderInputField('email')}
                {this.renderPlans()}
                {this.renderSubmitButton()}
                {this.renderLoginMessage()}
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
                <div style={{fontSize: '21px', fontWeight: '400'}}> Subscribe to {siteTitle}</div>
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
