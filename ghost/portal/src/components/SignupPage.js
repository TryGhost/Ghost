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
        onAction: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            name: '',
            email: '',
            plan: 'Free',
            isLoading: false,
            showSuccess: false
        };
    }

    handleSignin(e) {
        e.preventDefault();
        const email = this.state.email;
        const name = this.state.name;
        const plan = this.state.plan;
        this.props.onAction('signup', {name, email, plan});
        this.setState({
            isLoading: true,
            showSuccess: false
        });
        setTimeout(() => {
            this.setState({
                isLoading: false,
                showSuccess: true
            });
        }, 3000);
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
        const label = this.state.isLoading ? 'Sending' : 'Continue';
        const disabled = this.state.isLoading ? true : false;
        return (
            <button onClick={(e) => {
                this.handleSignin(e);
            }} style={buttonStyle} disabled={disabled}>
                {label}
            </button>
        );
    }

    renderPlanBox({position, id, type, price, currency, name}) {
        const boxStyle = (position) => {
            const style = {
                padding: '12px 24px',
                flexBasis: '100%'
            };
            if (position !== 'last') {
                style.borderRight = '1px solid black';
            }
            return style;
        };

        const nameStyle = {
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
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
        const isChecked = this.state.plan === name;
        if (name === 'Free') {
            return (
                <div style={boxStyle(position)}>
                    <div style={nameStyle}> {name} </div>
                    <div style={priceStyle}>
                        <strong style={{fontSize: '14px'}}> {price} </strong>
                    </div>
                    <div style={checkboxStyle}> {this.renderCheckbox({name, isChecked})} </div>
                </div>
            );
        }
        return (
            <div style={boxStyle(position)}>
                <div style={nameStyle}> {name} </div>
                <div style={priceStyle}>
                    <strong style={{fontSize: '14px'}}> {currency} {price} </strong>
                    <span> {` / ${type}`}</span>
                </div>
                <div style={checkboxStyle}> {this.renderCheckbox({name, isChecked})} </div>
            </div>
        );
    }

    renderPlanBoxOld({position, id, type, price, name}) {
        const boxStyle = (position) => {
            const style = {
                padding: '12px 24px',
                flexBasis: '100%'
            };
            if (position !== 'last') {
                style.borderRight = '1px solid black';
            }
            return style;
        };

        const nameStyle = {
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'center'
        };

        const priceStyle = {
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            justifyContent: 'center'
        };
        const checkboxStyle = {
            display: 'flex',
            justifyContent: 'center'
        };

        const isChecked = (this.state.plan === name);
        return (
            <div style={boxStyle(position)}>
                <div style={nameStyle}> {type} </div>
                <div style={priceStyle}> {price} </div>
                <div style={checkboxStyle}> {this.renderCheckbox({name, isChecked})} </div>
            </div>
        );
    }

    handleSelectPlan(e) {
        const plan = e.target.name;
        this.setState({
            plan
        });
    }

    renderCheckbox({name, isChecked = false}) {
        const style = {
            width: '20px',
            height: '20px',
            border: 'solid 1px #cccccc'
        };
        return (
            <input
                name={name}
                type="checkbox"
                style={style}
                checked={isChecked}
                onChange = {e => this.handleSelectPlan(e)}
            />
        );
    }

    renderPlans() {
        const containerStyle = {
            display: 'flex',
            border: '1px solid black',
            borderRadius: '6px',
            marginBottom: '12px'
        };
        const plans = this.props.data.site && this.props.data.site.plans;
        if (!plans) {
            return null;
        }
        return (
            <div style={{width: '100%'}}>
                <div style={{fontWeight: 'bold', marginBottom: '9px'}}>  Choose a Plan </div>
                <div style={containerStyle}>
                    {this.renderPlanBox({position: 'first', type: 'free', price: 'Decide later', name: 'Free'})}
                    {this.renderPlanBox({position: 'middle', type: 'month', price: plans.monthly, currency: plans.currencySymbol, name: 'Monthly'})}
                    {this.renderPlanBox({position: 'last', type: 'year', price: plans.yearly, currency: plans.currencySymbol, name: 'Yearly'})}
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
            borderRadius: '5px',
            fontSize: '14px',
            marginBottom: '12px'
        };

        const fields = {
            name: {
                type: 'text',
                value: this.state.name,
                placeholder: 'Name...'
            },
            email: {
                type: 'email',
                value: this.state.email,
                placeholder: 'Email...'
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
                style={inputStyle}
            />
        );
    }

    renderLoginMessage() {
        return (
            <div style={{display: 'flex'}}>
                <div style={{marginRight: '6px'}}> Already a member ? </div>
                <div style={{color: '#3db0ef', fontWeight: 'bold', cursor: 'pointer'}} onClick={() => this.props.switchPage('signin')}> Log in </div>
            </div>
        );
    }

    renderForm() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px'}}>
                {this.renderInputField('name')}
                {this.renderInputField('email')}
                {this.renderPlans()}
                {this.renderSubmitButton()}
                {this.renderLoginMessage()}
            </div>
        );
    }

    renderFormHeader() {
        const siteTitle = (this.props.data.site && this.props.data.site.title) || 'Site Title';
        const siteDescription = (this.props.data.site && this.props.data.site.description) || 'Site Description';

        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px'}}>
                <div style={{fontSize: '18px', fontWeight: 'bold'}}> Signup to {siteTitle}</div>
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
