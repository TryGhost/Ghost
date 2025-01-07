import {getDateString} from './date-time';

export function removePortalLinkFromUrl() {
    const [path] = window.location.hash.substr(1).split('?');
    const linkRegex = /^\/portal\/?(?:\/(\w+(?:\/\w+)*))?\/?$/;
    if (path && linkRegex.test(path)) {
        window.history.pushState('', document.title, window.location.pathname + window.location.search);
    }
}

export function getPortalLinkPath({page}) {
    const Links = {
        signin: '#/portal/signin',
        signup: '#/portal/signup'
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

export function isSentryEventAllowed({event: sentryEvent}) {
    const frames = sentryEvent?.exception?.values?.[0]?.stacktrace?.frames || [];
    const fileNames = frames.map(frame => frame.filename).filter(filename => !!filename);
    const lastFileName = fileNames[fileNames.length - 1] || '';
    return lastFileName.includes('@tryghost/portal');
}

export function getMemberSubscription({member = {}}) {
    if (isPaidMember({member})) {
        const subscriptions = member.subscriptions || [];
        const activeSubscription = subscriptions.find((sub) => {
            return ['active', 'trialing', 'unpaid', 'past_due'].includes(sub.status);
        });
        if (!activeSubscription?.price && activeSubscription?.plan) {
            activeSubscription.price = activeSubscription.plan;
        }
        return activeSubscription;
    }
    return null;
}

export function isComplimentaryMember({member = {}}) {
    if (!member) {
        return false;
    }
    const subscription = getMemberSubscription({member});
    if (subscription) {
        const {price} = subscription;
        return (price && price.amount === 0);
    } else if (!subscription && !!member.paid) {
        return true;
    }
    return false;
}

export function isPaidMember({member = {}}) {
    return (member && member.paid);
}

export function getProductCurrency({product}) {
    if (!product?.monthlyPrice) {
        return null;
    }
    return product.monthlyPrice.currency;
}

export function getNewsletterFromUuid({site, uuid}) {
    if (!uuid) {
        return null;
    }

    const newsletters = getSiteNewsletters({site});
    return newsletters?.find((newsletter) => {
        return newsletter.uuid = uuid;
    });
}

export function hasNewsletterSendingEnabled({site}) {
    return site?.editor_default_email_recipients === 'visibility';
}

export function allowCompMemberUpgrade({member}) {
    return member?.subscriptions?.[0]?.tier?.expiry_at !== undefined;
}

export function getCompExpiry({member}) {
    const subscription = getMemberSubscription({member});
    if (subscription?.tier?.expiry_at) {
        return getDateString(subscription.tier.expiry_at);
    }
    return '';
}

export function getUpgradeProducts({site, member}) {
    const activePrice = getMemberActivePrice({member});
    const activePriceCurrency = activePrice?.currency;
    const availableProducts = getAvailableProducts({site});
    if (!activePrice?.id) {
        return availableProducts;
    }
    return availableProducts.filter((product) => {
        return (isSameCurrency(getProductCurrency({product}), activePriceCurrency));
    });
}

export function getFilteredPrices({prices, currency}) {
    return prices.filter((d) => {
        return isSameCurrency((d.currency || ''), (currency || ''));
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
            tierId: subscription.tier?.id,
            cadence: subscription.price?.interval === 'month' ? 'month' : 'year',
            currency: subscription.price.currency.toLowerCase(),
            currency_symbol: getCurrencySymbol(subscription.price.currency)
        };
    }
    return null;
}

export function getMemberActivePrice({member}) {
    const subscription = getMemberSubscription({member});
    return getPriceFromSubscription({subscription});
}

export function getMemberActiveProduct({member, site}) {
    const subscription = getMemberSubscription({member});
    const price = getPriceFromSubscription({subscription});
    const allProducts = getAllProductsForSite({site});
    return allProducts.find((product) => {
        return product.id === price?.product.product_id;
    });
}

export function isMemberActivePrice({priceId, site, member}) {
    const activePrice = getMemberActivePrice({member});
    const {tierId, cadence} = getProductCadenceFromPrice({site, priceId});
    if (activePrice?.tierId === tierId && activePrice?.cadence === cadence) {
        return true;
    }
    return false;
}

export function getSubscriptionFromId({member, subscriptionId}) {
    if (isPaidMember({member})) {
        const subscriptions = member.subscriptions || [];
        return subscriptions.find(d => d.id === subscriptionId);
    }
    return null;
}

export function getMemberTierName({member}) {
    const subscription = getMemberSubscription({member});

    return subscription?.tier?.name || '';
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

export function getCheckoutSessionDataFromPlanAttribute(site, plan) {
    const products = getAvailableProducts({site});
    const defaultTier = products.find(p => p.type === 'paid');
    if (plan === 'monthly') {
        return {
            cadence: 'month',
            tierId: defaultTier.id
        };
    }
    if (plan === 'yearly') {
        return {
            cadence: 'year',
            tierId: defaultTier.id
        };
    }
    return {
        priceId: plan
    };
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

export function isPaidMembersOnly({site}) {
    return site?.members_signup_access === 'paid';
}

export function isInviteOnly({site = {}}) {
    return site?.members_signup_access === 'invite';
}

export function hasAvailablePrices({site = {}, pageQuery = ''}) {
    const prices = getSitePrices({site, pageQuery});
    return prices.length > 0;
}

export function hasRecommendations({site}) {
    return site?.recommendations_enabled === true;
}

export function isSigninAllowed({site}) {
    return site?.members_signup_access !== 'none';
}

export function isSignupAllowed({site}) {
    const hasSignupAccess = site?.members_signup_access === 'all' || site?.members_signup_access === 'paid';
    const hasSignupConfigured = site?.is_stripe_configured || hasOnlyFreePlan({site});

    return hasSignupAccess && hasSignupConfigured;
}

export function isFreeSignupAllowed({site}) {
    return site?.members_signup_access === 'all';
}

export function hasMultipleProducts({site}) {
    const products = getAvailableProducts({site});

    if (products?.length > 1) {
        return true;
    }
    return false;
}

export function getRefDomain() {
    const referrerSource = window.location.hostname.replace(/^www\./, '');
    return referrerSource;
}

export function hasMultipleProductsFeature({site}) {
    const {portal_products: portalProducts} = site || {};
    return !!portalProducts;
}

export function hasCommentsEnabled({site}) {
    return site?.comments_enabled && site?.comments_enabled !== 'off';
}

export function transformApiSiteData({site}) {
    try {
        if (!site) {
            return null;
        }

        if (site.tiers) {
            site.products = site.tiers;
        }

        site.products = site.products?.map((product) => {
            return {
                ...product,
                monthlyPrice: product.monthly_price,
                yearlyPrice: product.yearly_price
            };
        });

        site.is_stripe_configured = !!site.paid_members_enabled;

        // Map tier visibility to old settings
        if (site.products?.[0]?.visibility) {
        // Map paid tier visibility to portal products
            site.portal_products = site.products.filter((p) => {
                return p.visibility !== 'none' && p.type === 'paid';
            }).map(p => p.id);

            // Map free tier visibility to portal plans
            const freeProduct = site.products.find(p => p.type === 'free');
            if (freeProduct) {
                site.portal_plans = site.portal_plans?.filter(d => d !== 'free');
                if (freeProduct?.visibility === 'public') {
                    site.portal_plans?.push('free');
                }
            }
        }

        return site;
    } catch (error) {
        /* eslint-disable no-console */
        console.warn(`[Portal] Failed to read site data:`, error);
    }
}

export function getAvailableProducts({site}) {
    const {portal_products: portalProducts, products = [], portal_plans: portalPlans = []} = site || {};

    if (!portalPlans.includes('monthly') && !portalPlans.includes('yearly')) {
        return [];
    }

    return products.filter(product => !!product).filter((product) => {
        if (site.is_stripe_configured) {
            return true;
        }
        return product.type !== 'paid';
    }).filter((product) => {
        return !!(product.monthlyPrice && product.yearlyPrice);
    }).filter((product) => {
        return !!(Object.keys(product.monthlyPrice).length > 0 && Object.keys(product.yearlyPrice).length > 0);
    }).filter((product) => {
        if (portalProducts && products.length > 1) {
            return portalProducts.includes(product.id);
        }
        return true;
    }).sort((productA, productB) => {
        return productA?.monthlyPrice?.amount - productB?.monthlyPrice?.amount;
    }).map((product) => {
        product.monthlyPrice = {
            ...product.monthlyPrice,
            currency_symbol: getCurrencySymbol(product.monthlyPrice.currency)
        };
        product.yearlyPrice = {
            ...product.yearlyPrice,
            currency_symbol: getCurrencySymbol(product.yearlyPrice.currency)
        };
        return product;
    });
}

export function getFreeProduct({site}) {
    const {products = []} = site || {};
    return products.find(product => product.type === 'free');
}

export function getAllProductsForSite({site}) {
    const {products = [], portal_plans: portalPlans = []} = site || {};

    if (!portalPlans.includes('monthly') && !portalPlans.includes('yearly')) {
        return [];
    }

    return products.filter(product => !!product).filter((product) => {
        return !!(product.monthlyPrice && product.yearlyPrice);
    }).filter((product) => {
        return !!(Object.keys(product.monthlyPrice).length > 0 && Object.keys(product.yearlyPrice).length > 0);
    }).sort((productA, productB) => {
        return productA?.monthlyPrice?.amount - productB?.monthlyPrice?.amount;
    }).map((product) => {
        product.monthlyPrice = {
            ...product.monthlyPrice,
            currency_symbol: getCurrencySymbol(product.monthlyPrice.currency)
        };
        product.yearlyPrice = {
            ...product.yearlyPrice,
            currency_symbol: getCurrencySymbol(product.yearlyPrice.currency)
        };
        return product;
    });
}

export function hasBenefits({prices, site}) {
    if (!hasMultipleProductsFeature({site})) {
        return false;
    }
    if (!prices?.length) {
        return false;
    }
    return prices.some((price) => {
        return price?.benefits?.length;
    });
}

export function getSiteProducts({site, pageQuery}) {
    const products = getAvailableProducts({site});
    const showOnlyFree = pageQuery === 'free';
    if (showOnlyFree) {
        return [];
    }
    if (hasFreeProductPrice({site})) {
        products.unshift({
            id: 'free',
            type: 'free'
        });
    }
    return products;
}

export function hasFreeTrialTier({site, pageQuery}) {
    const tiers = getSiteProducts({site, pageQuery});
    return tiers.some((tier) => {
        return !!tier?.trial_days;
    });
}

export function getFreeProductBenefits({site}) {
    const freeProduct = getFreeProduct({site});
    return freeProduct?.benefits || [];
}

export function getFreeTierTitle({site}) {
    const freeProduct = getFreeProduct({site});
    return freeProduct?.name || 'Free';
}

export function getFreeTierDescription({site}) {
    const freeProduct = getFreeProduct({site});
    return freeProduct?.description;
}

export function freeHasBenefitsOrDescription({site}) {
    const freeProduct = getFreeProduct({site});

    if (freeProduct?.description || freeProduct?.benefits?.length) {
        return true;
    }
    return false;
}

export function getProductBenefits({product}) {
    if (product?.monthlyPrice && product?.yearlyPrice) {
        const productBenefits = product?.benefits || [];
        const monthlyBenefits = productBenefits;
        const yearlyBenefits = productBenefits;
        return {
            monthly: monthlyBenefits,
            yearly: yearlyBenefits
        };
    }
}

export function getProductFromId({site, productId}) {
    const availableProducts = getAllProductsForSite({site});
    return availableProducts.find(product => product.id === productId);
}

export function getPricesFromProducts({site = null, products = null}) {
    if (!site && !products) {
        return [];
    }

    const availableProducts = products || getAvailableProducts({site});
    const prices = availableProducts.reduce((accumPrices, product) => {
        if (product.monthlyPrice && product.yearlyPrice) {
            accumPrices.push(product.monthlyPrice);
            accumPrices.push(product.yearlyPrice);
        }
        return accumPrices;
    }, []);
    return prices;
}

export function hasFreeProductPrice({site}) {
    const {portal_plans: portalPlans} = site || {};

    return isFreeSignupAllowed({site}) && portalPlans.includes('free');
}

export function getSiteNewsletters({site}) {
    const {
        newsletters = []
    } = site || {};
    newsletters?.sort((a, b) => {
        return a.sort_order - b.sort_order;
    });
    return newsletters;
}

export function hasMultipleNewsletters({site}) {
    const {
        newsletters
    } = site || {};
    return newsletters?.length > 1;
}

export function isEmailSuppressed({member}) {
    return member?.email_suppression?.suppressed;
}

export function hasOnlyFreeProduct({site}) {
    const products = getSiteProducts({site});
    return (products.length === 1 && hasFreeProductPrice({site}));
}

export function getSubFreeTrialDaysLeft({sub} = {}) {
    if (!subscriptionHasFreeTrial({sub})) {
        return 0;
    }
    const today = (new Date()).setHours(0, 0, 0, 0);
    const freeTrialEnd = (new Date(sub.trial_end_at)).setHours(0, 0, 0, 0);
    const ONE_DAY = 1000 * 60 * 60 * 24;
    return Math.ceil(((freeTrialEnd - today) / ONE_DAY));
}

export function subscriptionHasFreeTrial({sub} = {}) {
    if (sub?.trial_end_at && !isInThePast(new Date(sub?.trial_end_at))) {
        return true;
    }
    return false;
}

export function isInThePast(date) {
    return date < new Date();
}

export function getProductFromPrice({site, priceId}) {
    if (priceId === 'free') {
        return getFreeProduct({site});
    }
    const products = getAllProductsForSite({site});
    return products.find((product) => {
        return (product?.monthlyPrice?.id === priceId) || (product?.yearlyPrice?.id === priceId);
    });
}

export function getProductCadenceFromPrice({site, priceId}) {
    if (priceId === 'free') {
        return getFreeProduct({site});
    }
    const products = getAllProductsForSite({site});
    const tier = products.find((product) => {
        return (product?.monthlyPrice?.id === priceId) || (product?.yearlyPrice?.id === priceId);
    });
    let cadence = 'month';
    if (tier?.yearlyPrice?.id === priceId) {
        cadence = 'year';
    }
    return {
        tierId: tier?.id,
        cadence
    };
}

export function getAvailablePrices({site, products = null}) {
    const {
        portal_plans: portalPlans = [],
        is_stripe_configured: isStripeConfigured
    } = site || {};

    if (!isStripeConfigured) {
        return [];
    }

    const productPrices = getPricesFromProducts({site, products});

    return productPrices.filter((d) => {
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
            return portalPlans.includes('monthly');
        }
        if (price.interval === 'year') {
            return portalPlans.includes('yearly');
        }
        return false;
    }).sort((a, b) => {
        return a.amount - b.amount;
    }).sort((a, b) => {
        if (!a.currency || !b.currency) {
            return 0;
        }
        return a.currency.localeCompare(b.currency, undefined, {ignorePunctuation: true});
    });
}

export function getFreePriceCurrency({site}) {
    const stripePrices = getAvailablePrices({site});

    let freePriceCurrencyDetail = {
        currency: 'usd',
        currency_symbol: '$'
    };
    if (stripePrices?.length > 0) {
        freePriceCurrencyDetail.currency = stripePrices[0].currency;
        freePriceCurrencyDetail.currency_symbol = stripePrices[0].currency_symbol;
    }
    return freePriceCurrencyDetail;
}

export function getSitePrices({site = {}, pageQuery = ''} = {}) {
    const plansData = [];

    if (hasFreeProductPrice({site})) {
        const freePriceCurrencyDetail = getFreePriceCurrency({site});
        plansData.push({
            id: 'free',
            type: 'free',
            price: 0,
            amount: 0,
            name: getFreeTierTitle({site}),
            ...freePriceCurrencyDetail

        });
    }
    const showOnlyFree = pageQuery === 'free' && hasFreeProductPrice({site});

    if (!showOnlyFree) {
        const stripePrices = getAvailablePrices({site});
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

export const hasMemberGotEmailSuppression = ({member}) => {
    if (!member) {
        return '';
    }
    return member.email_suppression;
};

export const getFirstpromoterId = ({site}) => {
    return (site && site.firstpromoter_account);
};

export const getMemberName = ({member}) => {
    if (!member) {
        return '';
    }
    return member.name;
};

export const getSupportAddress = ({site}) => {
    const {members_support_address: oldSupportAddress, support_email_address: supportAddress} = site || {};

    // If available, use the calculated setting support_email_address
    if (supportAddress) {
        return supportAddress;
    }

    // Deprecated: use the saved setting members_support_address
    if (oldSupportAddress?.indexOf('@') < 0) {
        const siteDomain = getSiteDomain({site});
        const updatedDomain = siteDomain?.replace(/^(www)\.(?=[^/]*\..{2,5})/, '') || '';
        return `${oldSupportAddress}@${updatedDomain}`;
    }

    if (oldSupportAddress?.split('@')?.length > 1) {
        const [recipient, domain] = oldSupportAddress.split('@');
        const updatedDomain = domain?.replace(/^(www)\.(?=[^/]*\..{2,5})/, '') || '';
        return `${recipient}@${updatedDomain}`;
    }

    return oldSupportAddress || '';
};

export const getDefaultNewsletterSender = ({site}) => {
    const {default_email_address: defaultEmailAddress} = site || {};

    // If available, use the calculated setting default_email_address as default
    const defaultAddress = defaultEmailAddress || `noreply@${getSiteDomain({site})}`;

    const newsletters = getSiteNewsletters({site});
    const defaultNewsletter = newsletters?.[0];

    if (defaultNewsletter && defaultNewsletter.sender_email) {
        return defaultNewsletter.sender_email;
    } else {
        return defaultAddress;
    }
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

export const createPopupNotification = ({type, status, autoHide, duration = 2600, closeable, state, message, meta = {}}) => {
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

export function isSameCurrency(currency1, currency2) {
    return currency1?.toLowerCase() === currency2?.toLowerCase();
}

export function getPriceIdFromPageQuery({site, pageQuery}) {
    const productMonthlyPriceQueryRegex = /^(?:(\S+?))?\/monthly$/;
    const productYearlyPriceQueryRegex = /^(?:(\S+?))?\/yearly$/;
    if (productMonthlyPriceQueryRegex.test(pageQuery || '')) {
        const [, productId] = pageQuery.match(productMonthlyPriceQueryRegex);
        const product = getProductFromId({site, productId});
        return product?.monthlyPrice?.id;
    } else if (productYearlyPriceQueryRegex.test(pageQuery || '')) {
        const [, productId] = pageQuery.match(productYearlyPriceQueryRegex);
        const product = getProductFromId({site, productId});
        return product?.yearlyPrice?.id;
    }
    return null;
}

export const getOfferOffAmount = ({offer}) => {
    if (offer.type === 'fixed') {
        return `${getCurrencySymbol(offer.currency)}${offer.amount / 100}`;
    } else if (offer.type === 'percent') {
        return `${offer.amount}%`;
    }
    return '';
};

export const getUpdatedOfferPrice = ({offer, price, useFormatted = false}) => {
    const originalAmount = price.amount;
    let updatedAmount;
    if (offer.type === 'fixed' && isSameCurrency(offer.currency, price.currency)) {
        updatedAmount = ((originalAmount - offer.amount)) / 100;
        updatedAmount = updatedAmount > 0 ? updatedAmount : 0;
    } else if (offer.type === 'percent') {
        updatedAmount = (originalAmount - ((originalAmount * offer.amount) / 100)) / 100;
    } else {
        updatedAmount = originalAmount / 100;
    }
    if (useFormatted) {
        return Intl.NumberFormat('en', {currency: price?.currency, style: 'currency'}).format(updatedAmount);
    }
    return updatedAmount;
};

export const isActiveOffer = ({site, offer}) => {
    if (offer?.status !== 'active') {
        return false;
    }

    // Check if the corresponding tier has been archived
    const product = getProductFromId({site, productId: offer.tier.id});
    return !!product;
};

function createMonthlyPrice({tier, priceId}) {
    if (tier?.monthly_price) {
        return {
            id: `price-${priceId}`,
            active: true,
            type: 'recurring',
            nickname: 'Monthly',
            currency: tier.currency,
            amount: tier.monthly_price,
            interval: 'month'
        };
    }
    return null;
}

function createYearlyPrice({tier, priceId}) {
    if (tier?.yearly_price) {
        return {
            id: `price-${priceId}`,
            active: true,
            type: 'recurring',
            nickname: 'Yearly',
            currency: tier.currency,
            amount: tier.yearly_price,
            interval: 'year'
        };
    }
    return null;
}

function createBenefits({tier}) {
    return tier?.benefits?.map((benefit) => {
        return {
            name: benefit
        };
    });
}

export const transformApiTiersData = ({tiers}) => {
    let priceId = 0;

    return tiers.map((tier) => {
        let monthlyPrice = createMonthlyPrice({tier, priceId});
        priceId += 1;

        let yearlyPrice = createYearlyPrice({tier, priceId});
        priceId += 1;

        let benefits = createBenefits({tier});
        return {
            ...tier,
            benefits: benefits,
            monthly_price: monthlyPrice,
            yearly_price: yearlyPrice
        };
    });
};

/**
 * Returns the member attribution URL history, which is stored in localStorage, if there is any.
 * @warning If you make changes here, please also update the one in signup-form!
 * @returns {Object[]|undefined}
 */
export function getUrlHistory() {
    const STORAGE_KEY = 'ghost-history';

    try {
        const historyString = localStorage.getItem(STORAGE_KEY);
        if (historyString) {
            const parsed = JSON.parse(historyString);

            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (error) {
        // Failed to access localStorage or something related to that.
        // Log a warning, as this shouldn't happen on a modern browser.

        /* eslint-disable no-console */
        console.warn(`[Portal] Failed to load member URL history:`, error);
    }
}

// Check if member is a recent member, i.e. created in last 24 hours
export function isRecentMember({member}) {
    if (!member?.created_at) {
        return false;
    }

    const now = new Date();
    const created = new Date(member.created_at);
    const diff = now.getTime() - created.getTime();
    const diffHours = Math.round(diff / (1000 * 60 * 60));

    return diffHours < 24;
}
