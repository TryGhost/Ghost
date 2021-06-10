import AppContext from '../../AppContext';
import MemberAvatar from '../common/MemberGravatar';
import ActionButton from '../common/ActionButton';
import CloseButton from '../common/CloseButton';
import Switch from '../common/Switch';
import {getMemberSubscription, hasOnlyFreePlan, isComplimentaryMember} from '../../utils/helpers';
import {getDateString} from '../../utils/date-time';
import {ReactComponent as LoaderIcon} from '../../images/icons/loader.svg';
import {useContext} from 'react';

const React = require('react');

export const AccountHomePageStyles = `
    .gh-portal-account-main {
        background: var(--grey13);
        padding: 32px 32px 0;
        max-height: calc(100vh - 12vw - 104px);
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

    .gh-portal-account-data {
        margin-bottom: 32px;
    }

    footer.gh-portal-account-footer {
        display: flex;
        padding: 32px;
        height: 104px;
        border-top: 1px solid #eaeaea;
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

    .gh-portal-cancelcontinue-container {
        margin: 24px 0 32px;
    }

    .gh-portal-billing-button-loader {
        width: 32px;
        height: 32px;
        margin-right: -3px;
        opacity: 0.6;
    }

    .gh-portal-product-icon {
        width: 52px;
        margin-right: 12px;
        border-radius: 2px;
    }
`;

const UserAvatar = ({avatar, brandColor}) => {
    return (
        <>
            <MemberAvatar gravatar={avatar} style={{userIcon: {color: brandColor, width: '56px', height: '56px', padding: '2px'}}} />
        </>
    );
};

const AccountFooter = ({onClose, handleSignout, supportAddress = ''}) => {
    const supportAddressMail = `mailto:${supportAddress}`;
    return (
        <footer className='gh-portal-account-footer'>
            <ul className='gh-portal-account-footermenu'>
                <li><button className='gh-portal-btn' name='logout' aria-label='logout' onClick={e => handleSignout(e)}>Sign out</button></li>
            </ul>
            <div className='gh-portal-account-footerright'>
                <ul className='gh-portal-account-footermenu'>
                    <li><a className='gh-portal-btn gh-portal-btn-branded' href={supportAddressMail} onClick={() => {
                        supportAddressMail && window.open(supportAddressMail);
                    }}>Contact support</a></li>
                </ul>
            </div>
        </footer>
    );
};

const UserHeader = () => {
    const {member, brandColor} = useContext(AppContext);
    const avatar = member.avatar_image;
    return (
        <header className='gh-portal-account-header'>
            <UserAvatar avatar={avatar} brandColor={brandColor} />
            <h2 className="gh-portal-main-title">Your account</h2>
        </header>
    );
};

const PaidAccountActions = () => {
    const {member, site, onAction} = useContext(AppContext);
    
    const onEditBilling = () => {
        const subscription = getMemberSubscription({member});
        onAction('editBilling', {subscriptionId: subscription.id});
    };

    const openUpdatePlan = () => {
        const {is_stripe_configured: isStripeConfigured} = site;
        if (isStripeConfigured) {
            onAction('switchPage', {
                page: 'accountPlan',
                lastPage: 'accountHome'
            });
        }
    };

    const PlanLabel = ({price, isComplimentary}) => {
        const {amount = 0, currency, interval} = price;
        let label = `${Intl.NumberFormat('en', {currency, style: 'currency'}).format(amount / 100)}/${interval}`;
        if (isComplimentary) {
            label = `Complimentary (${label})`;
        }
        return (
            <p>
                {label}
            </p>
        );
    };

    const PlanUpdateButton = ({isComplimentary}) => {
        if (isComplimentary || hasOnlyFreePlan({site})) {
            return null;
        }
        return (
            <button className='gh-portal-btn gh-portal-btn-list' onClick={e => openUpdatePlan(e)}>Change</button>
        );
    };

    const CardLabel = ({defaultCardLast4}) => {
        if (defaultCardLast4) {
            const label = `**** **** **** ${defaultCardLast4}`;
            return (
                <p>
                    {label}
                </p>
            );
        }
        return null;
    };

    const BillingSection = ({defaultCardLast4, isComplimentary}) => {
        const {action} = useContext(AppContext);
        const label = action === 'editBilling:running' ? (
            <LoaderIcon className='gh-portal-billing-button-loader' />
        ) : 'Update';
        if (isComplimentary) {
            return null;
        }

        return (
            <section>
                <div className='gh-portal-list-detail'>
                    <h3>Billing info</h3>
                    <CardLabel defaultCardLast4={defaultCardLast4} />
                </div>
                <button className='gh-portal-btn gh-portal-btn-list' onClick={e => onEditBilling(e)}>{label}</button>
            </section>
        );
    };

    const subscription = getMemberSubscription({member});
    if (subscription) {
        let isComplimentary = isComplimentaryMember({member});
        const {
            plan,
            price,
            default_payment_card_last4: defaultCardLast4
        } = subscription;
        return (
            <>
                <section>
                    <div className='gh-portal-list-detail'>
                        <h3>Plan</h3>
                        <PlanLabel plan={plan} price={price} isComplimentary={isComplimentary} />
                    </div>
                    <PlanUpdateButton isComplimentary={isComplimentary} />
                </section>
                <BillingSection isComplimentary={isComplimentary} defaultCardLast4={defaultCardLast4} />
            </>
        );
    }
    return null;
};

const AccountActions = () => {
    const {member, onAction} = useContext(AppContext);
    const {name, email, subscribed} = member;

    const openEditProfile = () => {
        onAction('switchPage', {
            page: 'accountProfile',
            lastPage: 'accountHome'
        });
    };

    const onToggleSubscription = (e, sub) => {
        e.preventDefault();
        onAction('updateNewsletter', {subscribed: !sub});
    };

    let label = subscribed ? 'Subscribed' : 'Unsubscribed';
    return (
        <div>
            <div className='gh-portal-list'>
                <section>
                    <div className='gh-portal-list-detail'>
                        <h3>{(name ? name : 'Account')}</h3>
                        <p>{email}</p>
                    </div>
                    <button className='gh-portal-btn gh-portal-btn-list' onClick={e => openEditProfile(e)}>Edit</button>
                </section>

                <PaidAccountActions />

                <section>
                    <div className='gh-portal-list-detail'>
                        <h3>Email newsletter</h3>
                        <p>{label}</p>
                    </div>
                    <div>
                        <Switch onToggle={(e) => {
                            onToggleSubscription(e, subscribed);
                        }} checked={subscribed} />
                    </div>
                </section>
            </div>
            {/* <ProductList openUpdatePlan={openUpdatePlan}></ProductList> */}
        </div>
    );
};

const SubscribeButton = () => {
    const {site, action, brandColor, onAction} = useContext(AppContext);
    const {is_stripe_configured: isStripeConfigured} = site;

    if (!isStripeConfigured || hasOnlyFreePlan({site})) {
        return null;
    }
    const isRunning = ['checkoutPlan:running'].includes(action);

    const openPlanPage = () => {
        onAction('switchPage', {
            page: 'accountPlan',
            lastPage: 'accountHome'
        });
    };
    return (
        <ActionButton
            isRunning={isRunning}
            label="View plans"
            onClick={() => openPlanPage()}
            brandColor={brandColor}
            style={{width: '100%'}}
        />
    );
};

const AccountWelcome = () => {
    const {member, site} = useContext(AppContext);
    const {is_stripe_configured: isStripeConfigured} = site;

    if (!isStripeConfigured) {
        return null;
    }

    if (member.paid) {
        const subscription = getMemberSubscription({member});
        const currentPeriodEnd = subscription.current_period_end;
        if (subscription.cancel_at_period_end) {
            return null;
        }
        return (
            <div className='gh-portal-section'>
                <p className='gh-portal-text-center gh-portal-free-ctatext'>Your subscription will renew on {getDateString(currentPeriodEnd)}</p>
            </div>
        );
    }

    return (
        <div className='gh-portal-section'>
            <p className='gh-portal-text-center gh-portal-free-ctatext'>You currently have a free membership, upgrade to a paid subscription for full access.</p>
            <SubscribeButton />
        </div>
    );
};

const ContinueSubscriptionButton = () => {
    const {member, onAction, action, brandColor} = useContext(AppContext);
    if (!member.paid) {
        return null;
    }
    const subscription = getMemberSubscription({member});
    if (!subscription) {
        return null;
    }

    // To show only continue button and not cancellation
    if (!subscription.cancel_at_period_end) {
        return null;
    }
    const label = subscription.cancel_at_period_end ? 'Continue subscription' : 'Cancel subscription';
    const isRunning = ['cancelSubscription:running'].includes(action);
    const disabled = (isRunning) ? true : false;
    const isPrimary = !!subscription.cancel_at_period_end;

    const CancelNotice = () => {
        if (!subscription.cancel_at_period_end) {
            return null;
        }
        const currentPeriodEnd = subscription.current_period_end;
        return (
            <p className='gh-portal-text-center gh-portal-free-ctatext'>Your subscription will expire on {getDateString(currentPeriodEnd)}</p>
        );
    };

    return (
        <div className='gh-portal-cancelcontinue-container'>
            <CancelNotice />
            <ActionButton
                onClick={(e) => {
                    onAction('continueSubscription', {
                        subscriptionId: subscription.id
                    });
                }}
                isRunning={isRunning}
                disabled={disabled}
                isPrimary={isPrimary}
                brandColor={brandColor}
                label={label}
                style={{
                    width: '100%'
                }}
            />
        </div>
    );
};

const AccountMain = () => {
    return (
        <div className='gh-portal-content gh-portal-account-main'>
            <CloseButton />
            <UserHeader />
            <section className='gh-portal-account-data'>
                <AccountWelcome />
                <ContinueSubscriptionButton />
                <AccountActions />
            </section>
        </div>
    );
};

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

    handleSignout(e) {
        e.preventDefault();
        this.context.onAction('signout');
    }

    render() {
        const {member, site} = this.context;
        const {members_support_address: supportAddress} = site;
        if (!member) {
            return null;
        }
        return (
            <div className='gh-portal-account-wrapper'>
                <AccountMain />
                <AccountFooter 
                    onClose={() => this.context.onAction('closePopup')}
                    handleSignout={e => this.handleSignout(e)}
                    supportAddress={supportAddress} 
                />
            </div>
        );
    }
}
