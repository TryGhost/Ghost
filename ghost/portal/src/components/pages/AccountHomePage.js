import AppContext from '../../AppContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';
import Switch from '../common/Switch';
import isPreviewMode from '../../utils/is-preview-mode';

const React = require('react');

export const AccountHomePageStyles = `
    .gh-portal-account-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 20px;
    }

    .gh-portal-account-footer {
        display: flex;
        margin-top: -16px;
    }

    .gh-portal-account-footer.paid {
        margin-top: 12px;
    }

    .gh-portal-account-footermenu {
        display: flex;
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .gh-portal-account-footermenu li {
        margin-right: 16px;
    }

    .gh-portal-account-footermenu li:last-of-type {
        margin-right: 0;
    }

    .gh-portal-accountdetail-section {
        display: flex;
        align-items: flex-start;
        margin-bottom: 40px;
    }

    .gh-portal-accountdetail-section:first-of-type {
        margin-top: 32px;
        margin-bottom: 22px;
    }

    .gh-portal-account-divider {
        margin: 12px -32px;
        border: none;
        border-bottom: 1px solid #EDEDED;
    }

    .gh-portal-account-divider:last-of-type {
        margin-bottom: 40px;
    }

    .gh-portal-btn-accountdetail {
        height: 36px;
        font-size: 1.3rem;
        width: 88px;
        padding: 0 12px;
    }

    .gh-portal-accountdetail-data {
        line-height: 1em;
        margin-top: 4px;
        color: #777;
    }

    .gh-portal-accountdetail-data.small {
        font-size: 1.3rem;
        margin-top: 5px;
    }

    .gh-portal-setting-heading.paid-home {
        font-weight: 600;
    }

    /* Avatar styles */
    .gh-portal-avatar-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        width: 64px;
        height: 64px;
        margin-bottom: 8px;
        border-radius: 999px;
        box-shadow: 0 0 0 3px #fff;
    }
`;

const Divider = () => {
    return (
        <hr className='gh-portal-account-divider' />
    );
};

const UserAvatar = ({avatar}) => {
    return (
        <div className='gh-portal-avatar-container'>
            <MemberAvatar gravatar={avatar} style={{userIcon: {color: '#525252', width: '45px', height: '45px'}}} />
        </div>
    );
};

const AccountFooter = ({onLogout, onSettings, brandColor}) => {
    return (
        <div className='gh-portal-account-footer'>
            <ul className='gh-portal-account-footermenu'>
                <li><div className='gh-portal-text-disabled' role='button'>Contact support</div></li>
            </ul>
            <div className='flex flex-grow-1 justify-end'>
                <ul className='gh-portal-account-footermenu'>
                    {onSettings
                        ? <li><div className='gh-portal-link' style={{color: brandColor}} onClick={onSettings} role='button'>Settings</div></li>
                        : null
                    }
                    <li><div className='gh-portal-link' style={{color: brandColor}} onClick={onLogout} role='button'>Logout</div></li>
                </ul>
            </div>
        </div>
    );
};

const UserHeader = ({member}) => {
    const avatar = member.avatar_image;
    return (
        <div className='gh-portal-account-header'>
            <UserAvatar avatar={avatar} />
            <h2 className="gh-portal-main-title">Your Account</h2>
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
            <div className='gh-portal-section'>
                <p className='gh-portal-text-center'>
                    Hey <strong>{firstname || name || email}! </strong>
                    You are subscribed to free updates from <strong>{siteTitle}</strong>, but you don't have a paid subscription to unlock full access
                </p>
                {this.renderSubscribeButton()}
            </div>
        );
    }

    render() {
        const {member, brandColor} = this.context;
        return (
            <div>
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
            <div className='gh-portal-section'>
                <p className='gh-portal-text-center mb0'>
                    Hey <strong>{firstname || name || email}! </strong>
                    You have an active <strong>{siteTitle}</strong> account with access to all areas. Get in touch if you have any problems or need some help getting things updated, and thanks for subscribing.
                </p>
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
        const {name, email, subscriptions, subscribed} = this.context.member;

        const {
            plan,
            default_payment_card_last4: defaultCardLast4
        } = subscriptions[0];

        return (
            <div>
                <section className='gh-portal-accountdetail-section'>
                    <div className='flex flex-column flex-grow-1'>
                        <h3 className='gh-portal-setting-heading paid-home'>Profile</h3>
                        <div>
                            <div className='gh-portal-accountdetail-data'>{name}</div>
                            <div className='gh-portal-accountdetail-data small'>{email}</div>
                        </div>
                    </div>
                    <button className='gh-portal-btn gh-portal-btn-accountdetail' onClick={e => this.openEditProfile(e)}>Edit</button>
                </section>

                <section className='gh-portal-accountdetail-section'>
                    <div className='flex flex-column flex-grow-1'>
                        <h3 className='gh-portal-setting-heading paid-home'>Plan</h3>
                        <div>
                            <div className='gh-portal-accountdetail-data'>{this.getPlanLabel(plan)}</div>
                        </div>
                    </div>
                    <button className='gh-portal-btn gh-portal-btn-accountdetail' onClick={e => this.openUpdatePlan(e)}>Change</button>
                </section>
                
                <section className='gh-portal-accountdetail-section'>
                    <div className='flex flex-column flex-grow-1'>
                        <h3 className='gh-portal-setting-heading paid-home'>Billing Info</h3>
                        <div>
                            <div className='gh-portal-accountdetail-data'>{this.getCardLabel({defaultCardLast4})}</div>
                        </div>
                    </div>
                    <button className='gh-portal-btn gh-portal-btn-accountdetail' onClick={e => this.onEditBilling(e)}>Update</button>
                </section>
                
                <section className='gh-portal-accountdetail-section'>
                    <div className='flex flex-column flex-grow-1'>
                        <h3 className='gh-portal-setting-heading paid-home'>Newsletter</h3>
                        <div>
                            <div className='gh-portal-accountdetail-data'>You are subscribed to email newsletters</div>
                        </div>
                    </div>
                    <div>
                        <Switch onToggle={(e) => {
                            this.onToggleSubscription(e, subscribed);
                        }} checked={subscribed} />
                    </div>
                </section>
            </div>
        );
    }

    render() {
        const {member, brandColor} = this.context;
        return (
            <div>
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

    componentDidMount() {
        const {member} = this.context;
        if (!member && !isPreviewMode()) {
            this.context.onAction('switchPage', {
                page: 'signup'
            });
        }
    }

    render() {
        const {member} = this.context;
        if (member) {
            if (member.paid) {
                return (
                    <PaidAccountHomePage />
                );
            }
            return (
                <FreeAccountHomePage />
            );
        }
        return null;
    }
}