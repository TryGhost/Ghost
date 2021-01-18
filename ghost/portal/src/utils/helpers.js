import CalculateDiscount from './discount';

export function removePortalLinkFromUrl() {
    const [path] = window.location.hash.substr(1).split('?');
    const linkRegex = /^\/portal(?:\/(\w+(?:\/\w+)?))?$/;
    if (path && linkRegex.test(path)) {
        window.history.pushState('', document.title, window.location.pathname + window.location.search);
    }
}

export function getPortalLinkPath({page}) {
    const Links = {
        default: '#/portal',
        signin: '#/portal/signin',
        signup: '#/portal/signup',
        account: '#/portal/account',
        'account-plans': '#/portal/account/plans',
        'account-profile': '#/portal/account/profile'
    };
    if (Object.keys(Links).includes(page)) {
        return Links[page];
    }
    return Links.default;
}

export function getPortalLink({page, siteUrl}) {
    const url = siteUrl || `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    const portalLinkPath = getPortalLinkPath({page});
    return `${url}${portalLinkPath}`;
}

export function isCookiesDisabled() {
    return !(navigator && navigator.cookieEnabled);
}

export function getMemberSubscription({member = {}}) {
    if (isPaidMember({member})) {
        const subscriptions = member.subscriptions || [];
        const activeSubscription = subscriptions.find((sub) => {
            return ['active', 'trialing', 'unpaid', 'past_due'].includes(sub.status);
        });
        return activeSubscription;
    }
    return null;
}

export function isComplimentaryMember({member = {}}) {
    const subscription = getMemberSubscription({member});
    if (subscription) {
        const {plan} = subscription;
        return (plan.nickname === 'Complimentary');
    }
    return false;
}

export function isPaidMember({member = {}}) {
    return (member && member.paid);
}

export function getPlanFromSubscription({subscription}) {
    if (subscription && subscription.plan) {
        return {
            type: subscription.plan.interval,
            price: subscription.plan.amount / 100,
            currency: subscription.plan.currency_symbol,
            name: subscription.plan.nickname
        };
    }
    return null;
}

export function getMemberActivePlan({member}) {
    const subscription = getMemberSubscription({member});
    return getPlanFromSubscription({subscription});
}

export function getSubscriptionFromId({member, subscriptionId}) {
    if (isPaidMember({member})) {
        const subscriptions = member.subscriptions || [];
        return subscriptions.find(d => d.id === subscriptionId);
    }
    return null;
}

export function hasOnlyFreePlan({site = {}}) {
    const plans = getSitePlans({site});
    return !plans || plans.length === 0 || (plans.length === 1 && plans[0].type === 'free');
}

export function hasPlan({site = {}, plan}) {
    const plans = getSitePlans({site});
    if (plan === 'free') {
        return !plans || plans.length === 0 || plans.find(p => p.type === 'free');
    } else if (plan === 'monthly') {
        return plans && plans.length > 0 && plans.find(p => p.type === 'month');
    } else if (plan === 'yearly') {
        return plans && plans.length > 0 && plans.find(p => p.type === 'year');
    }
    return false;
}

export function capitalize(str) {
    if (typeof str !== 'string' || !str) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getSitePlans({site = {}, includeFree = true, pageQuery} = {}) {
    const {
        plans,
        allow_self_signup: allowSelfSignup,
        is_stripe_configured: isStripeConfigured,
        portal_plans: portalPlans
    } = site || {};

    if (!plans) {
        return [];
    }

    const plansData = [];
    const discount = CalculateDiscount(plans.monthly, plans.yearly);
    const stripePlans = [
        {
            type: 'month',
            price: plans.monthly,
            currency: plans.currency_symbol,
            name: 'Monthly'
        },
        {
            type: 'year',
            price: plans.yearly,
            currency: plans.currency_symbol,
            name: 'Yearly',
            discount
        }
    ];

    if (allowSelfSignup && portalPlans.includes('free') && includeFree) {
        plansData.push({
            type: 'free',
            price: 0,
            currency: plans.currency_symbol,
            name: 'Free'
        });
    }
    const showOnlyFree = pageQuery === 'free' && hasPlan({site, plan: 'free'});

    if (isStripeConfigured && !showOnlyFree) {
        stripePlans.forEach((plan) => {
            if (portalPlans.includes(plan.name.toLowerCase())) {
                plansData.push(plan);
            }
        });
    }
    return plansData;
}

export const getMemberEmail = ({member}) => {
    if (!member) {
        return '';
    }
    return member.email;
};

export const getFirstpromoterId = ({site}) => {
    return (site && site.firstpromoter_id);
};

export const getMemberName = ({member}) => {
    if (!member) {
        return '';
    }
    return member.name;
};

export const getSupportAddress = ({site}) => {
    const {members_support_address: supportAddress} = site || {};
    return supportAddress || '';
};

export const getSiteDomain = ({site}) => {
    try {
        return ((new URL(site.url)).origin).replace(/^http(s?):\/\//, '').replace(/\/$/, '');
    } catch (e) {
        return site.url.replace(/^http(s?):\/\//, '').replace(/\/$/, '');
    }
};

export const createPopupNotification = ({type, status, autoHide, duration, closeable, state, message, meta = {}}) => {
    let count = 0;
    if (state && state.popupNotification) {
        count = (state.popupNotification.count || 0) + 1;
    }
    return {
        type,
        status,
        autoHide,
        closeable,
        duration,
        meta,
        message,
        count
    };
};
