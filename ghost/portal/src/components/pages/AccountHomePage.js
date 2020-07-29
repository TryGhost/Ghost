import AppContext from '../../AppContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';
import Switch from '../common/Switch';

const React = require('react');

export const AccountHomePageStyles = `
    .gh-portal-account-main {
        background: var(--grey13);
        border-bottom: 1px solid #eaeaea;
        margin: -32px -32px 0;
        padding: 32px;
    }

    .gh-portal-account-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 0 0 32px;
    }

    .gh-portal-account-header .gh-portal-avatar {
        margin: 6px 0 8px !important;
    }

    .gh-portal-account-footer {
        display: flex;
        margin-top: 32px;
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

    .gh-portal-account-footerright {
        display: flex;
        flex-grow: 1;
        align-items: center;
        justify-content: flex-end;
    }

    .gh-portal-account-footermenu li {
        margin-right: 16px;
    }

    .gh-portal-account-footermenu li:last-of-type {
        margin-right: 0;
    }

    .gh-portal-freeaccount-newsletter {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 24px;
    }

    .gh-portal-freeaccount-newsletter .label {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }

    .gh-portal-free-ctatext {
        margin-top: -12px;
    }
`;

const UserAvatar = ({avatar, brandColor}) => {
    return (
        <div>
            <MemberAvatar gravatar={avatar} style={{userIcon: {color: brandColor, width: '56px', height: '56px', padding: '2px'}}} />
        </div>
    );
};

const AccountFooter = ({onClose}) => {
    return (
        <footer className='gh-portal-account-footer'>
            <ul className='gh-portal-account-footermenu'>
                <li><button className='gh-portal-btn'>Contact support</button></li>
            </ul>
            <div className='gh-portal-account-footerright'>
                <ul className='gh-portal-account-footermenu'>
                    <li>
                        <button className='gh-portal-btn gh-portal-btn-branded' onClick={onClose}>OK</button>
                    </li>
                </ul>
            </div>
        </footer>
    );
};

const UserHeader = ({member, brandColor}) => {
    const avatar = member.avatar_image;
    return (
        <header className='gh-portal-account-header'>
            <UserAvatar avatar={avatar} brandColor={brandColor} />
            <h2 className="gh-portal-main-title">Your account</h2>
        </header>
    );
};

class FreeAccountHomePage extends React.Component {
    static contextType = AppContext;

    openSubscribe(e) {
        this.context.onAction('switchPage', {
            page: 'accountPlan',
            lastPage: 'accountHome'
        });
    }

    openEditProfile() {
        this.context.onAction('switchPage', {
            page: 'accountProfile',
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

    onToggleSubscription(e, subscribed) {
        this.context.onAction('updateMember', {subscribed: !subscribed});
    }

    renderAccountDetail(e) {
        const {name, firstname, email, subscribed} = this.context.member;
        const {title: siteTitle} = this.context.site;

        const label = subscribed ? 'Subscribed to email newsletters' : 'Not subscribed to email newsletters';
        return (
            <section>
                <div className='gh-portal-section'>
                    <p className='gh-portal-text-center gh-portal-free-ctatext'>
                        Hey <strong>{firstname || name || email}! </strong>
                        You are subscribed to free updates from <strong>{siteTitle}</strong>, but you don't have a paid subscription to unlock full access
                    </p>
                    {this.renderSubscribeButton()}
                </div>
                <div className='gh-portal-list'>
                    <section>
                        <div className='gh-portal-list-detail'>
                            <h3>{name}</h3>
                            <p>{email}</p>
                        </div>
                        <button className='gh-portal-btn gh-portal-btn-list' onClick={e => this.openEditProfile(e)}>Edit</button>
                    </section>
                    <section>
                        <div className='gh-portal-list-detail'>
                            <h3>Newsletter</h3>
                            <p>{label}</p>
                        </div>
                        <div>
                            <Switch onToggle={(e) => {
                                this.onToggleSubscription(e, subscribed);
                            }} checked={subscribed} />
                        </div>
                    </section>
                </div>
            </section>
        );
    }

    render() {
        const {member, brandColor} = this.context;
        return (
            <div>
                <div className='gh-portal-account-main'>
                    <UserHeader member={member} brandColor={brandColor} />
                    {this.renderAccountDetail()}
                </div>
                <AccountFooter onClose={() => this.context.onAction('closePopup')} />
            </div>
        );
    }
}

class PaidAccountHomePage extends React.Component {
    static contextType = AppContext;

    renderAccountWelcome() {
        const {name, firstname, email} = this.context.member;
        const siteTitle = this.context.site.title;

        return (
            <section className='gh-portal-section'>
                <p className='gh-portal-text-center'>
                    Hey <strong>{firstname || name || email}! </strong>
                    You have an active <strong>{siteTitle}</strong> account with access to all areas. Get in touch if you have any problems or need some help getting things updated, and thanks for subscribing.
                </p>
            </section>
        );
    }

    getPlanLabel({amount = 0, currency_symbol: currencySymbol = '$', interval}) {
        return `${currencySymbol}${amount / 100}/${interval}`;
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

        const label = subscribed ? 'Subscribed to email newsletters' : 'Not subscribed to email newsletters';
        return (
            <div className='gh-portal-list'>
                <section>
                    <div className='gh-portal-list-detail'>
                        <h3>{name}</h3>
                        <p>{email}</p>
                    </div>
                    <button className='gh-portal-btn gh-portal-btn-list' onClick={e => this.openEditProfile(e)}>Edit</button>
                </section>

                <section>
                    <div className='gh-portal-list-detail'>
                        <h3>Plan</h3>
                        <p>{this.getPlanLabel(plan)}</p>
                    </div>
                    <button className='gh-portal-btn gh-portal-btn-list' onClick={e => this.openUpdatePlan(e)}>Change</button>
                </section>

                <section>
                    <div className='gh-portal-list-detail'>
                        <h3>Billing Info</h3>
                        <p>{this.getCardLabel({defaultCardLast4})}</p>
                    </div>
                    <button className='gh-portal-btn gh-portal-btn-list' onClick={e => this.onEditBilling(e)}>Update</button>
                </section>

                <section>
                    <div className='gh-portal-list-detail'>
                        <h3>Newsletter</h3>
                        <p>{label}</p>
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
                <div className='gh-portal-account-main'>
                    <UserHeader member={member} brandColor={brandColor} />
                    {this.renderAccountDetails()}
                </div>
                <AccountFooter onClose={() => this.context.onAction('closePopup')} />
            </div>
        );
    }
}
export default class AccountHomePage extends React.Component {
    static contextType = AppContext;

    componentDidMount() {
        const {member} = this.context;
        if (!member) {
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