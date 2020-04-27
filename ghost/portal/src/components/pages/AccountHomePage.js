const React = require('react');
const PropTypes = require('prop-types');

export default class AccountHomePage extends React.Component {
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
            backgroundColor: this.props.brandColor || '#3eb0ef',
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
        const plans = this.props.data.site && this.props.data.site.plans;
        return (
            <div style={{padding: '12px 12px'}}>
                <div style={{marginBottom: '12px', fontSize: '14px'}}>
                    {`Hey there! You are subscribed to free updates from ${siteTitle}, but don't have a paid subscription to unlock full access`}
                </div>
                <div style={{fontWeight: 'bold', marginBottom: '9px'}}>  Choose a Plan </div>
                <div style={containerStyle}>
                    {this.renderPlanBox({position: 'first', type: 'month', price: plans.monthly, currency: plans.currency_symbol, name: 'Monthly'})}
                    {this.renderPlanBox({position: 'last', type: 'year', price: plans.yearly, currency: plans.currency_symbol, name: 'Yearly'})}
                </div>
            </div>
        );
    }

    renderHeader() {
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

    renderUserAvatar() {
        const avatarImg = (this.props.data.member && this.props.data.member.avatar_image);

        const logoStyle = {
            position: 'relative',
            display: 'block',
            width: '64px',
            height: '64px',
            marginBottom: '6px',
            backgroundPosition: '50%',
            backgroundSize: 'cover',
            borderRadius: '100%',
            boxShadow: '0 0 0 3px #fff',
            border: '1px solid gray'
        };

        if (avatarImg) {
            logoStyle.backgroundImage = `url(${avatarImg})`;
            return (
                <span style={logoStyle}> </span>
            );
        }
        return null;
    }

    renderUserHeader() {
        const memberEmail = this.getMemberEmail();
        const memberName = this.props.data.member.name;

        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px'}}>
                {this.renderUserAvatar()}
                {memberName ? <div style={{fontSize: '16px', fontWeight: '400'}}> {memberName}</div> : null}
                <div style={{fontSize: '14px', fontWeight: '400', color: '#929292', lineHeight: '12px'}}> {memberEmail}</div>
            </div>
        );
    }

    handleAccountDetail(e) {
        // No-op
    }

    renderLogoutButton() {
        return (
            <div style={{paddingLeft: '21px', paddingRight: '16px', paddingTop: '12px', borderTop: '1px solid #EFEFEF', cursor: 'pointer'}}>
                <div role="button" onClick={(e) => {
                    this.handleAccountDetail(e);
                }} style={{marginBottom: '3px'}}> Account </div>
                <div role="button" onClick={(e) => {
                    this.handleSignout(e);
                }}> Log out </div>
            </div>
        );
    }

    render() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131', paddingTop: '9px'}}>
                {this.renderUserHeader()}
                {this.renderLogoutButton()}
            </div>
        );
    }
}
