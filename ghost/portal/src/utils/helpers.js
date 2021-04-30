export function removePortalLinkFromUrl() {
    const [path] = window.location.hash.substr(1).split('?');
    const linkRegex = /^\/portal\/?(?:\/(\w+(?:\/\w+)?))?\/?$/;
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
        const {price} = subscription;
        return (price.amount === 0);
    }
    return false;
}

export function isPaidMember({member = {}}) {
    return (member && member.paid);
}

export function getFilteredPrices({prices, currency}) {
    return prices.filter((d) => {
        return (d.currency || '').toLowerCase() === (currency || '').toLowerCase();
    });
}

export function getPriceFromSubscription({subscription}) {
    if (subscription && subscription.price) {
        return {
            ...subscription.price,
            price: subscription.price.amount / 100,
            name: subscription.price.nickname,
            currency_symbol: getCurrencySymbol(subscription.price.currency)
        };
    }
    return null;
}

export function getMemberActivePrice({member}) {
    const subscription = getMemberSubscription({member});
    return getPriceFromSubscription({subscription});
}

export function getSubscriptionFromId({member, subscriptionId}) {
    if (isPaidMember({member})) {
        const subscriptions = member.subscriptions || [];
        return subscriptions.find(d => d.id === subscriptionId);
    }
    return null;
}

export function hasOnlyFreePlan({plans, site = {}}) {
    plans = plans || getSitePrices({site});
    return !plans || plans.length === 0 || (plans.length === 1 && plans[0].type === 'free');
}

export function hasPrice({site = {}, plan}) {
    const prices = getSitePrices({site});
    if (plan === 'free') {
        return !prices || prices.length === 0 || prices.find(p => p.type === 'free');
    } else if (plan === 'monthly') {
        return prices && prices.length > 0 && prices.find(p => p.name === 'Monthly');
    } else if (plan === 'yearly') {
        return prices && prices.length > 0 && prices.find(p => p.name === 'Yearly');
    }
    return false;
}

export function capitalize(str) {
    if (typeof str !== 'string' || !str) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isInviteOnlySite({site = {}, pageQuery}) {
    const prices = getSitePrices({site, pageQuery});
    return prices.length === 0 || (site && site.members_signup_access === 'invite');
}

export function getSitePrices({site = {}, includeFree = true, pageQuery} = {}) {
    const {
        prices,
        allow_self_signup: allowSelfSignup,
        is_stripe_configured: isStripeConfigured,
        portal_plans: portalPlans
    } = site || {};

    if (!prices) {
        return [];
    }

    const plansData = [];

    const stripePrices = prices.map((d) => {
        return {
            ...d,
            price_id: d.id,
            id: d.stripe_price_id,
            price: d.amount / 100,
            name: d.nickname,
            currency_symbol: getCurrencySymbol(d.currency)
        };
    }).filter((price) => {
        return price.amount !== 0 && price.type === 'recurring';
    }).filter((price) => {
        return (portalPlans || []).includes(price.price_id);
    });

    if (allowSelfSignup && portalPlans.includes('free') && includeFree) {
        plansData.push({
            id: 'free',
            type: 'free',
            price: 0,
            currency_symbol: '$',
            name: 'Free'
        });
    }
    const showOnlyFree = pageQuery === 'free' && hasPrice({site, plan: 'free'});

    if (isStripeConfigured && !showOnlyFree) {
        stripePrices.forEach((price) => {
            plansData.push(price);
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

export const getCurrencySymbol = (currency) => {
    return Intl.NumberFormat('en', {currency, style: 'currency'}).format(0).replace(/[\d\s.]/g, '');
};

export const formatNumber = (amount) => {
    if (amount === undefined || amount === null) {
        return '';
    }
    return amount.toLocaleString();
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
