import {ParentContext} from '../ParentContext';
import MemberAvatar from '../common/MemberGravatar';
import Switch from '../common/Switch';

const React = require('react');

export default class PaidAccountHomePage extends React.Component {
    static contextType = ParentContext;

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    renderHeader() {
        const memberEmail = this.context.member.email;

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
        const avatarImg = (this.context.member && this.context.member.avatar_image);

        const avatarContainerStyle = {
            position: 'relative',
            display: 'flex',
            width: '64px',
            height: '64px',
            marginBottom: '6px',
            borderRadius: '100%',
            boxShadow: '0 0 0 3px #fff',
            border: '1px solid gray',
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center'
        };

        return (
            <div style={avatarContainerStyle}>
                <MemberAvatar gravatar={avatarImg} style={{userIcon: {color: 'black', width: '45px', height: '45px'}}} />
            </div>
        );
    }

    renderUserHeader() {
        return (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px'}}>
                {this.renderUserAvatar()}
                <div style={{fontSize: '21px', fontWeight: '500', marginTop: '6px'}}> Your Account </div>
            </div>
        );
    }

    openSettings(e) {
        // no-op
    }

    openSubscribe(e) {
        this.context.onAction('switchPage', {
            page: 'accountPlan',
            lastPage: 'accountHome'
        });
    }

    renderAccountFooter() {
        return (
            <div style={{display: 'flex', padding: '0 24px', marginTop: '24px', color: this.context.brandColor, fontWeight: 'bold', fontSize: '13px'}}>
                <div style={{cursor: 'pointer'}} role='button'> Contact support </div>
                <div style={{display: 'flex', flexGrow: 1, justifyContent: 'flex-end'}}>
                    <div style={{cursor: 'pointer'}} onClick={e => this.handleSignout(e)} role='button'> Logout </div>
                </div>
            </div>
        );
    }

    renderAccountWelcome() {
        const {name, firstname, email} = this.context.member;
        const siteTitle = this.context.site.title;

        return (
            <div style={{padding: '0 24px'}}>
                <div style={{textAlign: 'center', marginBottom: '12px', fontSize: '14px'}}>
                    <span style={{fontWeight: 'bold'}}>Hey {firstname || name || email}! </span>
                    You have an active <span style={{fontWeight: 'bold'}}>{siteTitle}</span> account with access to all areas. Get in touch if you have any problems or need some help getting things updated, and thanks for subscribing.
                </div>
            </div>
        );
    }

    renderDivider() {
        return (
            <div style={{borderBottom: '1px solid grey'}}>  </div>
        );
    }

    getPlanLabel({amount = 0, currency_symbol: currencySymbol = '$', interval}) {
        return `${currencySymbol}${amount / 100} / ${interval}`;
    }

    getCardLabel({defaultCardLast4}) {
        return `**** **** **** ${defaultCardLast4}`;
    }

    onEditProfile() {
        this.context.onAction('switchPage', {
            page: 'accountProfile',
            lastPage: 'paidAccountHome'
        });
    }

    renderAccountDetails() {
        const buttonStyle = {
            padding: '6px 9px', border: '1px solid black', width: '60px', display: 'flex', justifyContent: 'center',
            borderRadius: '5px', cursor: 'pointer'
        };
        const {name, email, subscriptions} = this.context.member;

        const {
            plan,
            default_payment_card_last4: defaultCardLast4
        } = subscriptions[0];

        return (
            <div style={{padding: '0 24px', marginTop: '24px', marginBottom: '24px'}}>
                <div style={{display: 'flex', alignItems: 'center'}}>
                    <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                        <div style={{fontWeight: 'bold', fontSize: '13px'}}> Profile </div>
                        <div style={{lineHeight: '18px'}}>
                            <div style={{color: '#666666'}}> {name} </div>
                            <div style={{color: '#666666', fontSize: '11px'}}> {email} </div>
                        </div>
                    </div>
                    <div style={buttonStyle} onClick={e => this.onEditProfile(e)}>
                        Edit
                    </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', marginTop: '24px'}}>
                    <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1}}>
                        <div style={{fontWeight: 'bold', fontSize: '13px'}}> Plan </div>
                        <div style={{lineHeight: '18px'}}>
                            <div style={{color: '#666666'}}> {this.getPlanLabel(plan)} </div>
                        </div>
                    </div>
                    <div>
                        <div style={buttonStyle}> Change </div>
                    </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', marginTop: '24px'}}>
                    <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1, marginTop: '5px'}}>
                        <div style={{fontWeight: 'bold', fontSize: '13px'}}> Billing Info </div>
                        <div style={{lineHeight: '18px'}}>
                            <div style={{color: '#666666'}}> {this.getCardLabel({defaultCardLast4})} </div>
                        </div>
                    </div>
                    <div style={buttonStyle}>
                        Update
                    </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', marginTop: '24px'}}>
                    <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1, marginTop: '5px'}}>
                        <div style={{fontWeight: 'bold', fontSize: '13px'}}> Newsletter </div>
                        <div style={{lineHeight: '18px'}}>
                            <div style={{color: '#666666'}}> You are subscribed to newsletters </div>
                        </div>
                    </div>
                    <div>
                        <Switch onToggle={(e) => {}}/>
                    </div>
                </div>
            </div>
        );
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
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                {this.renderUserHeader()}
                {this.renderAccountWelcome()}
                {this.renderDivider()}
                {this.renderAccountDetails()}
                {this.renderDivider()}
                {this.renderAccountFooter()}
            </div>
        );
    }
}