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
            stripe_price_id: subscription.price.id,
            id: subscription.price.price_id,
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
    } else if (plan) {
        return prices && prices.length > 0 && prices.find(p => p.id === plan);
    }
    return false;
}

export function getQueryPrice({site = {}, priceId}) {
    const prices = getAvailablePrices({site});
    if (priceId === 'free') {
        return !prices || prices.length === 0 || prices.find(p => p.type === 'free');
    } else if (prices && prices.length > 0 && priceId === 'monthly') {
        const monthlyByName = prices.find(p => p.name === 'Monthly');
        const monthlyByInterval = prices.find(p => p.interval === 'month');
        return monthlyByName || monthlyByInterval;
    } else if (prices && prices.length > 0 && priceId === 'yearly') {
        const yearlyByName = prices.find(p => p.name === 'Yearly');
        const yearlyByInterval = prices.find(p => p.interval === 'year');
        return yearlyByName || yearlyByInterval;
    } else if (prices && prices.length > 0 && priceId) {
        return prices.find(p => p.id === priceId);
    }
    return null;
}

export function capitalize(str) {
    if (typeof str !== 'string' || !str) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function isInviteOnlySite({site = {}, pageQuery = ''}) {
    const prices = getSitePrices({site, pageQuery});
    return prices.length === 0 || (site && site.members_signup_access === 'invite');
}

export function hasMultipleProducts({site = {}}) {
    const {
        products = []
    } = site || {};
    if (products?.length > 1) {
        return true;
    }
    return false;
}

export function getProducts({site = {}}) {
    const products = site?.products || [];
    return products.filter(product => !!product).sort((productA, productB) => {
        return productA?.monthlyPrice?.amount - productB?.monthlyPrice.amount;
    });
}

export function getAvailablePrices({site = {}, includeFree = true} = {}) {
    let {
        prices,
        products,
        allow_self_signup: allowSelfSignup,
        is_stripe_configured: isStripeConfigured
    } = site || {};

    if (!prices) {
        prices = [];
    }

    if (products) {
        prices = [];
        products.forEach((product) => {
            if (product.prices) {
                prices = prices.concat(product.prices);
            }
        });
    }

    const plansData = [];

    const stripePrices = prices.filter((d) => {
        return !!(d && d.id);
    }).map((d) => {
        return {
            ...d,
            price_id: d.id,
            price: d.amount / 100,
            name: d.nickname,
            currency_symbol: getCurrencySymbol(d.currency)
        };
    }).filter((price) => {
        return price.amount !== 0 && price.type === 'recurring';
    });

    if (allowSelfSignup && includeFree) {
        plansData.push({
            id: 'free',
            type: 'free',
            price: 0,
            currency: 'usd',
            currency_symbol: '$',
            name: 'Free'
        });
    }

    if (isStripeConfigured) {
        stripePrices.forEach((price) => {
            plansData.push(price);
        });
    }
    return plansData;
}

export function getSitePrices({site = {}, includeFree = true, pageQuery = ''} = {}) {
    const {
        prices = [],
        allow_self_signup: allowSelfSignup,
        is_stripe_configured: isStripeConfigured,
        portal_plans: portalPlans
    } = site || {};

    if (!prices) {
        return [];
    }

    const plansData = [];

    const stripePrices = prices.filter((d) => {
        return !!(d && d.id);
    }).map((d) => {
        return {
            ...d,
            price_id: d.id,
            price: d.amount / 100,
            name: d.nickname,
            currency_symbol: getCurrencySymbol(d.currency)
        };
    }).filter((price) => {
        return price.amount !== 0 && price.type === 'recurring';
    }).filter((price) => {
        if (price.interval === 'month') {
            return (portalPlans || []).includes('monthly');
        }
        if (price.interval === 'year') {
            return (portalPlans || []).includes('yearly');
        }
        return false;
    }).sort((a, b) => {
        return a.amount - b.amount;
    }).sort((a, b) => {
        if (!a.currency || !b.currency) {
            return 0;
        }
        return a.currency.localeCompare(b.currency, undefined, {ignorePunctuation: true});
    }).sort((a, b) => {
        return (a.active === b.active) ? 0 : (a.active ? -1 : 1);
    });
    let freePriceCurrencyDetail = {
        currency: 'usd',
        currency_symbol: '$'
    };
    if (stripePrices && stripePrices.length > 0) {
        freePriceCurrencyDetail.currency = stripePrices[0].currency;
        freePriceCurrencyDetail.currency_symbol = stripePrices[0].currency_symbol;
    }

    if (allowSelfSignup && portalPlans.includes('free') && includeFree) {
        plansData.push({
            id: 'free',
            type: 'free',
            price: 0,
            amount: 0,
            name: 'Free',
            ...freePriceCurrencyDetail

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

export const getStripeAmount = (amount) => {
    if (isNaN(amount)) {
        return 0;
    }
    return (amount / 100);
};

export const getPriceString = (price = {}) => {
    const symbol = getCurrencySymbol(price.currency);
    const amount = getStripeAmount(price.amount);
    return `${symbol}${amount}/${price.interval}`;
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
