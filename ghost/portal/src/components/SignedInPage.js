const React = require('react');
const PropTypes = require('prop-types');

export default class SignedInPage extends React.Component {
    static propTypes = {
        data: PropTypes.shape({
            site: PropTypes.shape({
                title: PropTypes.string,
                description: PropTypes.string
            }).isRequired,
            member: PropTypes.shape({
                email: PropTypes.string
            }).isRequired
        }).isRequired,
        onAction: PropTypes.func
    };

    handleSignout(e) {
        e.preventDefault();
        this.props.onAction('signout');
    }

    handlePlanCheckout(e) {
        e.preventDefault();
        const plan = e.target.name;
        const email = this.getMemberEmail();
        this.props.onAction('checkoutPlan', {email, plan});
    }

    getMemberEmail() {
        return this.props.data.member.email;
    }

    renderPlanSelectButton({name}) {
        const buttonStyle = {
            display: 'inline-block',
            height: '38px',
            border: '0',
            fontSize: '14px',
            fontWeight: '300',
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
            width: '90px',
            marginBottom: '12px'
        };

        return (
            <button name={name} onClick={(e) => {
                this.handlePlanCheckout(e);
            }} style={buttonStyle}>
                Choose
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

        return (
            <div style={boxStyle(position)}>
                <div style={nameStyle}> {name} </div>
                <div style={priceStyle}>
                    <strong style={{fontSize: '14px'}}> {currency} {price} </strong>
                    <span> {` / ${type}`}</span>
                </div>
                <div style={checkboxStyle}> {this.renderPlanSelectButton({name})} </div>
            </div>
        );
    }

    renderPlans() {
        const containerStyle = {
            display: 'flex',
            border: '1px solid black',
            marginBottom: '12px'
        };
        const siteTitle = this.props.data.site && this.props.data.site.title;
        const plans = this.props.data.member && this.props.data.member.plans;
        return (
            <div style={{padding: '12px 12px'}}>
                <div style={{marginBottom: '12px', fontSize: '14px'}}>
                    {`Hey there! You are subscribed to free updates from ${siteTitle}, but don't have a paid subscription to unlock full access`}
                </div>
                <div style={{fontWeight: 'bold', marginBottom: '9px'}}>  Choose a Plan </div>
                <div style={containerStyle}>
                    {this.renderPlanBox({position: 'first', type: 'month', price: plans.monthly, currency: plans.currencySymbol, name: 'Monthly'})}
                    {this.renderPlanBox({position: 'last', type: 'year', price: plans.yearly, currency: plans.currencySymbol, name: 'Yearly'})}
                </div>
            </div>
        );
    }

    renderSignedInHeader() {
        const memberEmail = this.getMemberEmail();

        return (
            <>
                <div style={{paddingLeft: '16px', paddingRight: '16px', color: '#A6A6A6', fontSize: '1.2rem', lineHeight: '1.0em'}}>
                    Signed in as
                </div>
                <div style={{paddingLeft: '16px', paddingRight: '16px', paddingBottom: '9px'}}>
                    {memberEmail}
                </div>
            </>
        );
    }

    renderLogoutButton() {
        return (
            <div style={{paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', borderTop: '1px solid #EFEFEF', cursor: 'pointer'}}>
                <div onClick={(e) => {
                    this.handleSignout(e);
                }} style={{fontWeight: 'bold'}}> Logout </div>
            </div>
        );
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                {this.renderSignedInHeader()}
                {this.renderPlans()}
                {this.renderLogoutButton()}
            </div>
        );
    }
}
