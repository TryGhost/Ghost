import AppContext from '../../AppContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';
import Switch from '../common/Switch';

const React = require('react');

const Divider = () => {
    return (
        <div style={{borderBottom: '1px solid grey'}}>  </div>
    );
};

const UserAvatar = ({avatar}) => {
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
            <MemberAvatar gravatar={avatar} style={{userIcon: {color: 'black', width: '45px', height: '45px'}}} />
        </div>
    );
};

const AccountFooter = ({onLogout, onSettings, brandColor}) => {
    return (
        <div style={{display: 'flex', padding: '0 24px', marginTop: '18px', color: brandColor, fontWeight: 'bold', fontSize: '13px'}}>
            <div style={{color: 'grey'}} role='button'> Contact support </div>
            <div style={{display: 'flex', flexGrow: 1, justifyContent: 'flex-end'}}>
                {onSettings
                    ? <div style={{marginRight: '16px', cursor: 'pointer'}} onClick={onSettings} role='button'> Settings </div>
                    : null
                }
                <div style={{cursor: 'pointer'}} onClick={onLogout} role='button'> Logout </div>
            </div>
        </div>
    );
};

const UserHeader = ({member}) => {
    const avatar = member.avatar_image;
    return (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px'}}>
            <UserAvatar avatar={avatar} />
            <div style={{fontSize: '21px', fontWeight: '500', marginTop: '6px'}}> Your Account </div>
        </div>
    );
};

class FreeAccountHomePage extends React.Component {
    static contextType = AppContext;

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    openSettings(e) {
        this.context.onAction('switchPage', {
            page: 'accountProfile',
            lastPage: 'accountHome'
        });
    }

    openSubscribe(e) {
        this.context.onAction('switchPage', {
            page: 'accountPlan',
            lastPage: 'accountHome'
        });
    }

    renderSubscribeButton() {
        const {is_stripe_configured: isStripeConfigured} = this.context.site;

        if (isStripeConfigured) {
            return (
                <ActionButton label="Subscribe now" onClick={() => this.openSubscribe()} brandColor={this.context.brandColor} />
            );
        }

        return null;
    }

    renderAccountDetail(e) {
        const {name, firstname, email} = this.context.member;
        const {title: siteTitle} = this.context.site;

        return (
            <div style={{padding: '0 24px'}}>
                <div style={{textAlign: 'center', marginBottom: '12px', fontSize: '14px'}}>
                    <span style={{fontWeight: 'bold'}}>Hey {firstname || name || email}! </span>
                    You are subscribed to free updates from <span style={{fontWeight: 'bold'}}>{siteTitle}</span>, but you don't have a paid subscription to unlock full access
                </div>
                {this.renderSubscribeButton()}
            </div>
        );
    }

    render() {
        const {member, brandColor} = this.context;
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                <UserHeader member={member} />
                {this.renderAccountDetail()}
                <AccountFooter onLogout={e => this.handleSignout(e)} onSettings={e => this.openSettings(e)} brandColor={brandColor} />
            </div>
        );
    }
}

class PaidAccountHomePage extends React.Component {
    static contextType = AppContext;

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
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

    getPlanLabel({amount = 0, currency_symbol: currencySymbol = '$', interval}) {
        return `${currencySymbol}${amount / 100} / ${interval}`;
    }

    getCardLabel({defaultCardLast4}) {
        if (defaultCardLast4) {
            return `**** **** **** ${defaultCardLast4}`;
        }
        return `Complimentary`;
    }

    openEditProfile() {
        this.context.onAction('switchPage', {
            page: 'accountProfile',
            lastPage: 'accountHome'
        });
    }

    openUpdatePlan() {
        const {is_stripe_configured: isStripeConfigured} = this.context.site;
        if (isStripeConfigured) {
            this.context.onAction('switchPage', {
                page: 'accountPlan',
                lastPage: 'accountHome'
            });
        }
    }

    onEditBilling() {
        this.context.onAction('editBilling');
    }

    onToggleSubscription(e, subscribed) {
        this.context.onAction('updateMember', {subscribed: !subscribed});
    }

    renderAccountDetails() {
        const buttonStyle = {
            padding: '6px 9px', border: '1px solid black', width: '60px', display: 'flex', justifyContent: 'center',
            borderRadius: '5px', cursor: 'pointer'
        };
        const {name, email, subscriptions, subscribed} = this.context.member;

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
                    <div style={buttonStyle} onClick={e => this.openEditProfile(e)}>
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
                    <div style={buttonStyle} onClick={e => this.openUpdatePlan(e)}>
                        Change
                    </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', marginTop: '24px'}}>
                    <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1, marginTop: '5px'}}>
                        <div style={{fontWeight: 'bold', fontSize: '13px'}}> Billing Info </div>
                        <div style={{lineHeight: '18px'}}>
                            <div style={{color: '#666666'}}> {this.getCardLabel({defaultCardLast4})} </div>
                        </div>
                    </div>
                    <div style={buttonStyle} onClick={e => this.onEditBilling(e)}>
                        Update
                    </div>
                </div>
                <div style={{display: 'flex', alignItems: 'center', marginTop: '24px'}}>
                    <div style={{display: 'flex', flexDirection: 'column', flexGrow: 1, marginTop: '5px'}}>
                        <div style={{fontWeight: 'bold', fontSize: '13px'}}> Newsletter </div>
                        <div style={{lineHeight: '18px'}}>
                            <div style={{color: '#666666'}}> You are subscribed to email newsletters </div>
                        </div>
                    </div>
                    <div>
                        <Switch onToggle={(e) => {
                            this.onToggleSubscription(e, subscribed);
                        }} checked={subscribed} />
                    </div>
                </div>
            </div>
        );
    }

    render() {
        const {member, brandColor} = this.context;
        return (
            <div style={{display: 'flex', flexDirection: 'column', color: '#313131'}}>
                <UserHeader member={member} />
                {this.renderAccountWelcome()}
                <Divider />
                {this.renderAccountDetails()}
                <Divider />
                <AccountFooter onLogout={e => this.handleSignout(e)} brandColor={brandColor} />
            </div>
        );
    }
}
export default class AccountHomePage extends React.Component {
    static contextType = AppContext;

    render() {
        const {member} = this.context;

        if (member.paid) {
            return (
                <PaidAccountHomePage />
            );
        }
        return (
            <FreeAccountHomePage />
        );
    }
}