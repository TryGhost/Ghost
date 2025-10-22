import * as Fixtures from './fixtures';
import {getCurrencySymbol} from './helpers';

/**
 * Parse offer query string parameters from preview mode
 * @param {string} qs - Query string to parse
 * @returns {Object} Parsed offer data with page and pageData
 */
export function parseOfferQueryString(qs = '') {
    const qsParams = new URLSearchParams(qs);
    const data = {};

    // Handle the query params key/value pairs
    for (let pair of qsParams.entries()) {
        const key = pair[0];
        const value = decodeURIComponent(pair[1]);

        if (key === 'name') {
            data.name = value || '';
        } else if (key === 'code') {
            data.code = value || '';
        } else if (key === 'display_title') {
            data.display_title = value || '';
        } else if (key === 'display_description') {
            data.display_description = value || '';
        } else if (key === 'type') {
            data.type = value || '';
        } else if (key === 'cadence') {
            data.cadence = value || '';
        } else if (key === 'duration') {
            data.duration = value || '';
        } else if (key === 'duration_in_months' && !isNaN(Number(value))) {
            data.duration_in_months = Number(value);
        } else if (key === 'amount' && !isNaN(Number(value))) {
            data.amount = Number(value);
        } else if (key === 'currency') {
            data.currency = value || '';
        } else if (key === 'status') {
            data.status = value || '';
        } else if (key === 'tier_id') {
            data.tier = {
                id: value || Fixtures.offer.tier.id
            };
        }
    }

    return {
        page: 'offer',
        pageData: data
    };
}

/**
 * Parse preview mode query string parameters
 * @param {string} qs - Query string to parse
 * @returns {Object} Parsed site configuration with site.plans structure
 */
export function parsePreviewQueryString(qs = '') {
    const qsParams = new URLSearchParams(qs);
    const data = {
        site: {
            plans: {}
        }
    };

    const allowedPlans = [];
    let portalPrices;
    let portalProducts = null;
    let monthlyPrice, yearlyPrice, currency;

    // Handle the query params key/value pairs
    for (let pair of qsParams.entries()) {
        const key = pair[0];

        // Note: this needs to be cleaned up, there is no reason why we need to double encode/decode
        const value = decodeURIComponent(pair[1]);

        if (key === 'button') {
            data.site.portal_button = JSON.parse(value);
        } else if (key === 'name') {
            data.site.portal_name = JSON.parse(value);
        } else if (key === 'isFree' && JSON.parse(value)) {
            allowedPlans.push('free');
        } else if (key === 'isMonthly' && JSON.parse(value)) {
            allowedPlans.push('monthly');
        } else if (key === 'isYearly' && JSON.parse(value)) {
            allowedPlans.push('yearly');
        } else if (key === 'portalPrices') {
            portalPrices = value ? value.split(',') : [];
        } else if (key === 'portalProducts') {
            portalProducts = value ? value.split(',') : [];
        } else if (key === 'page' && value) {
            data.page = value;
        } else if (key === 'accentColor' && (value === '' || value)) {
            data.site.accent_color = value;
        } else if (key === 'buttonIcon' && value) {
            data.site.portal_button_icon = value;
        } else if (key === 'signupButtonText') {
            data.site.portal_button_signup_text = value || '';
        } else if (key === 'signupTermsHtml') {
            data.site.portal_signup_terms_html = value || '';
        } else if (key === 'signupCheckboxRequired') {
            data.site.portal_signup_checkbox_required = JSON.parse(value);
        } else if (key === 'buttonStyle' && value) {
            data.site.portal_button_style = value;
        } else if (key === 'monthlyPrice' && !isNaN(Number(value))) {
            data.site.plans.monthly = Number(value);
            monthlyPrice = Number(value);
        } else if (key === 'yearlyPrice' && !isNaN(Number(value))) {
            data.site.plans.yearly = Number(value);
            yearlyPrice = Number(value);
        } else if (key === 'currency' && value) {
            const currencyValue = value.toUpperCase();
            data.site.plans.currency = currencyValue;
            data.site.plans.currency_symbol = getCurrencySymbol(currencyValue);
            currency = currencyValue;
        } else if (key === 'disableBackground') {
            data.site.disableBackground = JSON.parse(value);
        } else if (key === 'membersSignupAccess' && value) {
            data.site.members_signup_access = value;
        } else if (key === 'portalDefaultPlan' && value) {
            data.site.portal_default_plan = value;
        }
    }

    data.site.portal_plans = allowedPlans;
    data.site.portal_products = portalProducts;

    if (portalPrices) {
        data.site.portal_plans = portalPrices;
    } else if (monthlyPrice && yearlyPrice && currency) {
        data.site.prices = [
            {
                id: 'monthly',
                stripe_price_id: 'dummy_stripe_monthly',
                stripe_product_id: 'dummy_stripe_product',
                active: 1,
                nickname: 'Monthly',
                currency: currency,
                amount: monthlyPrice,
                type: 'recurring',
                interval: 'month'
            },
            {
                id: 'yearly',
                stripe_price_id: 'dummy_stripe_yearly',
                stripe_product_id: 'dummy_stripe_product',
                active: 1,
                nickname: 'Yearly',
                currency: currency,
                amount: yearlyPrice,
                type: 'recurring',
                interval: 'year'
            }
        ];
    }

    return data;
}

/**
 * Parse portal link path to determine page and query parameters
 * @param {string} path - URL path segment (e.g., "signup/monthly", "account/plans")
 * @returns {Object} Object with page, pageQuery, and/or pageData properties
 */
export function parsePortalLinkPath(path) {
    const customPricesSignupRegex = /^signup\/?(?:\/(\w+?))?\/?$/;
    const customMonthlyProductSignup = /^signup\/?(?:\/(\w+?))\/monthly\/?$/;
    const customYearlyProductSignup = /^signup\/?(?:\/(\w+?))\/yearly\/?$/;
    const customOfferRegex = /^offers\/(\w+?)\/?$/;

    if (path === undefined || path === '') {
        return {
            page: 'default'
        };
    } else if (customOfferRegex.test(path)) {
        return {
            pageQuery: path
        };
    } else if (path === 'signup') {
        return {
            page: 'signup'
        };
    } else if (customMonthlyProductSignup.test(path)) {
        const [, productId] = path.match(customMonthlyProductSignup);
        return {
            page: 'signup',
            pageQuery: `${productId}/monthly`
        };
    } else if (customYearlyProductSignup.test(path)) {
        const [, productId] = path.match(customYearlyProductSignup);
        return {
            page: 'signup',
            pageQuery: `${productId}/yearly`
        };
    } else if (customPricesSignupRegex.test(path)) {
        const [, pageQuery] = path.match(customPricesSignupRegex);
        return {
            page: 'signup',
            pageQuery: pageQuery
        };
    } else if (path === 'signup/free') {
        return {
            page: 'signup',
            pageQuery: 'free'
        };
    } else if (path === 'signup/monthly') {
        return {
            page: 'signup',
            pageQuery: 'monthly'
        };
    } else if (path === 'signup/yearly') {
        return {
            page: 'signup',
            pageQuery: 'yearly'
        };
    } else if (path === 'signin') {
        return {
            page: 'signin'
        };
    } else if (path === 'account') {
        return {
            page: 'accountHome'
        };
    } else if (path === 'account/plans') {
        return {
            page: 'accountPlan'
        };
    } else if (path === 'account/profile') {
        return {
            page: 'accountProfile'
        };
    } else if (path === 'account/newsletters') {
        return {
            page: 'accountEmail'
        };
    } else if (path === 'support') {
        return {
            page: 'support'
        };
    } else if (path === 'support/success') {
        return {
            page: 'supportSuccess'
        };
    } else if (path === 'support/error') {
        return {
            page: 'supportError'
        };
    } else if (path === 'recommendations') {
        return {
            page: 'recommendations',
            pageData: {
                signup: false
            }
        };
    } else if (path === 'account/newsletters/help') {
        return {
            page: 'emailReceivingFAQ',
            pageData: {
                direct: true
            }
        };
    } else if (path === 'account/newsletters/disabled') {
        return {
            page: 'emailSuppressionFAQ',
            pageData: {
                direct: true
            }
        };
    }

    return {
        page: 'default'
    };
}
