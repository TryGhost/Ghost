import React from 'react';
import * as Sentry from '@sentry/react';
import TriggerButton from './components/TriggerButton';
import Notification from './components/Notification';
import PopupModal from './components/PopupModal';
import setupGhostApi from './utils/api';
import AppContext from './AppContext';
import NotificationParser from './utils/notifications';
import * as Fixtures from './utils/fixtures';
import {hasMode} from './utils/check-mode';
import {transformPortalAnchorToRelative} from './utils/transform-portal-anchor-to-relative';
import {getActivePage, isAccountPage, isOfferPage} from './pages';
import ActionHandler from './actions';
import './App.css';
import {hasRecommendations, allowCompMemberUpgrade, createPopupNotification, getCurrencySymbol, getFirstpromoterId, getPriceIdFromPageQuery, getProductCadenceFromPrice, getProductFromId, getQueryPrice, getSiteDomain, isActiveOffer, isComplimentaryMember, isInviteOnlySite, isPaidMember, isRecentMember, isSentryEventAllowed, removePortalLinkFromUrl} from './utils/helpers';
import {handleDataAttributes} from './data-attributes';

import i18nLib from '@tryghost/i18n';

const DEV_MODE_DATA = {
    showPopup: true,
    site: Fixtures.site,
    member: Fixtures.member.free,
    page: 'accountEmail',
    ...Fixtures.paidMemberOnTier(),
    pageData: Fixtures.offer
};

function SentryErrorBoundary({site, children}) {
    const {portal_sentry: portalSentry} = site || {};
    if (portalSentry && portalSentry.dsn) {
        return (
            <Sentry.ErrorBoundary>
                {children}
            </Sentry.ErrorBoundary>
        );
    }
    return (
        <>
            {children}
        </>
    );
}

export default class App extends React.Component {
    constructor(props) {
        super(props);

        this.setupCustomTriggerButton(props);

        this.state = {
            site: null,
            member: null,
            page: 'loading',
            showPopup: false,
            action: 'init:running',
            initStatus: 'running',
            lastPage: null,
            customSiteUrl: props.customSiteUrl,
            locale: props.locale,
            scrollbarWidth: 0
        };
    }

    componentDidMount() {
        const scrollbarWidth = this.getScrollbarWidth();
        this.setState({scrollbarWidth});

        this.initSetup();
    }

    componentDidUpdate(prevProps, prevState) {
        /**Handle custom trigger class change on popup open state change */
        if (prevState.showPopup !== this.state.showPopup) {
            this.handleCustomTriggerClassUpdate();

            /** Remove background scroll when popup is opened */
            try {
                if (this.state.showPopup) {
                    /** When modal is opened, store current overflow and set as hidden */
                    this.bodyScroll = window.document?.body?.style?.overflow;
                    this.bodyMargin = window.getComputedStyle(document.body).getPropertyValue('margin-right');
                    window.document.body.style.overflow = 'hidden';
                    if (this.state.scrollbarWidth) {
                        window.document.body.style.marginRight = `calc(${this.bodyMargin} + ${this.state.scrollbarWidth}px)`;
                    }
                } else {
                    /** When the modal is hidden, reset overflow property for body */
                    window.document.body.style.overflow = this.bodyScroll || '';
                    if (!this.bodyMargin || this.bodyMargin === '0px') {
                        window.document.body.style.marginRight = '';
                    } else {
                        window.document.body.style.marginRight = this.bodyMargin;
                    }
                }
            } catch (e) {
                /** Ignore any errors for scroll handling */
            }
        }

        if (this.state.initStatus === 'success' && prevState.initStatus !== this.state.initStatus) {
            const {siteUrl} = this.props;
            const contextState = this.getContextFromState();
            this.sendPortalReadyEvent();
            handleDataAttributes({
                siteUrl,
                site: contextState.site,
                member: contextState.member
            });
        }
    }

    componentWillUnmount() {
        /**Clear timeouts and event listeners on unmount */
        clearTimeout(this.timeoutId);
        this.customTriggerButtons && this.customTriggerButtons.forEach((customTriggerButton) => {
            customTriggerButton.removeEventListener('click', this.clickHandler);
        });
        window.removeEventListener('hashchange', this.hashHandler, false);
    }

    sendPortalReadyEvent() {
        if (window.self !== window.parent) {
            window.parent.postMessage({
                type: 'portal-ready',
                payload: {}
            }, '*');
        }
    }

    // User for adding trailing margin to prevent layout shift when popup appears
    getScrollbarWidth() {
        // Create a temporary div
        const div = document.createElement('div');
        div.style.visibility = 'hidden';
        div.style.overflow = 'scroll'; // forcing scrollbar to appear
        document.body.appendChild(div);

        // Create an inner div
        // const inner = document.createElement('div');
        document.body.appendChild(div);

        // Calculate the width difference
        const scrollbarWidth = div.offsetWidth - div.clientWidth;

        // Clean up
        document.body.removeChild(div);

        return scrollbarWidth;
    }

    /** Setup custom trigger buttons handling on page */
    setupCustomTriggerButton() {
        // Handler for custom buttons
        this.clickHandler = (event) => {
            event.preventDefault();
            const target = event.currentTarget;
            const pagePath = (target && target.dataset.portal);
            const {page, pageQuery, pageData} = this.getPageFromLinkPath(pagePath) || {};
            if (this.state.initStatus === 'success') {
                if (pageQuery && pageQuery !== 'free') {
                    this.handleSignupQuery({site: this.state.site, pageQuery});
                } else {
                    this.dispatchAction('openPopup', {page, pageQuery, pageData});
                }
            }
        };
        const customTriggerSelector = '[data-portal]';
        const popupCloseClass = 'gh-portal-close';
        this.customTriggerButtons = document.querySelectorAll(customTriggerSelector) || [];
        this.customTriggerButtons.forEach((customTriggerButton) => {
            customTriggerButton.classList.add(popupCloseClass);
            // Remove any existing event listener
            customTriggerButton.removeEventListener('click', this.clickHandler);
            customTriggerButton.addEventListener('click', this.clickHandler);
        });
    }

    /** Handle portal class set on custom trigger buttons */
    handleCustomTriggerClassUpdate() {
        const popupOpenClass = 'gh-portal-open';
        const popupCloseClass = 'gh-portal-close';
        this.customTriggerButtons?.forEach((customButton) => {
            const elAddClass = this.state.showPopup ? popupOpenClass : popupCloseClass;
            const elRemoveClass = this.state.showPopup ? popupCloseClass : popupOpenClass;
            customButton.classList.add(elAddClass);
            customButton.classList.remove(elRemoveClass);
        });
    }

    /** Initialize portal setup on load, fetch data and setup state*/
    async initSetup() {
        try {
            // Fetch data from API, links, preview, dev sources
            const {site, member, page, showPopup, popupNotification, lastPage, pageQuery, pageData} = await this.fetchData();
            const i18nLanguage = this.props.siteI18nEnabled ? this.props.locale || site.locale || 'en' : 'en';
            const i18n = i18nLib(i18nLanguage, 'portal');

            const state = {
                site,
                member,
                page,
                lastPage,
                pageQuery,
                showPopup,
                pageData,
                popupNotification,
                t: i18n.t,
                dir: i18n.dir() || 'ltr',
                action: 'init:success',
                initStatus: 'success',
                locale: i18nLanguage
            };

            this.handleSignupQuery({site, pageQuery, member});

            this.setState(state);

            // Listen to preview mode changes
            this.hashHandler = () => {
                this.updateStateForPreviewLinks();
            };
            window.addEventListener('hashchange', this.hashHandler, false);

            // the signup card will ship hidden by default,
            // so we need to show it if the member is not logged in
            if (!member) {
                const formElements = document.querySelectorAll('[data-lexical-signup-form]');
                if (formElements.length > 0){
                    formElements.forEach((element) => {
                        element.style.display = '';
                    });
                }
            }

            this.setupRecommendationButtons();

            // avoid portal links switching to homepage (e.g. from absolute link copy/pasted from Admin)
            this.transformPortalLinksToRelative();
        } catch (e) {
            /* eslint-disable no-console */
            console.error(`[Portal] Failed to initialize:`, e);
            /* eslint-enable no-console */
            this.setState({
                action: 'init:failed',
                initStatus: 'failed'
            });
        }
    }

    /** Fetch state data from all available sources */
    async fetchData() {
        const {site: apiSiteData, member} = await this.fetchApiData();
        const {site: devSiteData, ...restDevData} = this.fetchDevData();
        const {site: linkSiteData, ...restLinkData} = this.fetchLinkData(apiSiteData, member);
        const {site: previewSiteData, ...restPreviewData} = this.fetchPreviewData();
        const {site: notificationSiteData, ...restNotificationData} = this.fetchNotificationData();
        let page = '';
        return {
            member,
            page,
            site: {
                ...apiSiteData,
                ...linkSiteData,
                ...previewSiteData,
                ...notificationSiteData,
                ...devSiteData,
                plans: {
                    ...(devSiteData || {}).plans,
                    ...(apiSiteData || {}).plans,
                    ...(previewSiteData || {}).plans
                }
            },
            ...restDevData,
            ...restLinkData,
            ...restNotificationData,
            ...restPreviewData
        };
    }

    /** Fetch state for Dev mode */
    fetchDevData() {
        // Setup custom dev mode data from fixtures
        if (hasMode(['dev']) && !this.state.customSiteUrl) {
            return DEV_MODE_DATA;
        }

        // Setup test mode data
        if (hasMode(['test'])) {
            return {
                showPopup: this.props.showPopup !== undefined ? this.props.showPopup : true
            };
        }
        return {};
    }

    /**Fetch state from Offer Preview mode query string*/
    fetchOfferQueryStrData(qs = '') {
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

    /** Fetch state from Preview mode Query String */
    fetchQueryStrData(qs = '') {
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
            } else if (key === 'allowSelfSignup') {
                data.site.allow_self_signup = JSON.parse(value);
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

    /**Fetch state data for billing notification */
    fetchNotificationData() {
        const {type, status, duration, autoHide, closeable} = NotificationParser({billingOnly: true}) || {};
        if (['stripe:billing-update'].includes(type)) {
            if (status === 'success') {
                const popupNotification = createPopupNotification({
                    type, status, duration, closeable, autoHide, state: this.state,
                    message: status === 'success' ? 'Billing info updated successfully' : ''
                });
                return {
                    showPopup: true,
                    popupNotification
                };
            }
            return {
                showPopup: true
            };
        }
        return {};
    }

    /** Fetch state from Portal Links */
    fetchLinkData(site, member) {
        const qParams = new URLSearchParams(window.location.search);
        if (qParams.get('action') === 'unsubscribe') {
            // if the user is unsubscribing from a newsletter with an old unsubscribe link that we can't validate, push them to newsletter mgmt where they have to log in
            if (qParams.get('key') && qParams.get('uuid')) {
                return {
                    showPopup: true,
                    page: 'unsubscribe',
                    pageData: {
                        uuid: qParams.get('uuid'),
                        key: qParams.get('key'),
                        newsletterUuid: qParams.get('newsletter'),
                        comments: qParams.get('comments')
                    }
                };
            } else { // any malformed unsubscribe links should simply go to email prefs
                return {
                    showPopup: true,
                    page: 'accountEmail',
                    pageData: {
                        newsletterUuid: qParams.get('newsletter'),
                        action: 'unsubscribe',
                        redirect: site.url + '#/portal/account/newsletters'
                    }
                };
            }
        }

        if (hasRecommendations({site}) && qParams.get('action') === 'signup' && qParams.get('success') === 'true') {
            // After a successful signup, we show the recommendations if they are enabled
            return {
                showPopup: true,
                page: 'recommendations',
                pageData: {
                    signup: true
                }
            };
        }

        const [path, hashQueryString] = window.location.hash.substr(1).split('?');
        const hashQuery = new URLSearchParams(hashQueryString ?? '');
        const productMonthlyPriceQueryRegex = /^(?:(\w+?))?\/monthly$/;
        const productYearlyPriceQueryRegex = /^(?:(\w+?))?\/yearly$/;
        const offersRegex = /^offers\/(\w+?)\/?$/;
        const linkRegex = /^\/portal\/?(?:\/(\w+(?:\/\w+)*))?\/?$/;
        const feedbackRegex = /^\/feedback\/(\w+?)\/(\w+?)\/?$/;

        if (path && feedbackRegex.test(path)) {
            const [, postId, scoreString] = path.match(feedbackRegex);
            const score = parseInt(scoreString);
            if (score === 1 || score === 0) {
                // if logged in, submit feedback
                if (member || (hashQuery.get('uuid') && hashQuery.get('key'))) {
                    return {
                        showPopup: true,
                        page: 'feedback',
                        pageData: {
                            uuid: member ? null : hashQuery.get('uuid'),
                            key: member ? null : hashQuery.get('key'),
                            postId,
                            score
                        }
                    };
                } else {
                    return {
                        showPopup: true,
                        page: 'signin',
                        pageData: {
                            redirect: site.url + `#/feedback/${postId}/${score}/`
                        }
                    };
                }
            }
        }
        if (path && linkRegex.test(path)) {
            const [,pagePath] = path.match(linkRegex);
            const {page, pageQuery, pageData} = this.getPageFromLinkPath(pagePath, site) || {};
            const lastPage = ['accountPlan', 'accountProfile'].includes(page) ? 'accountHome' : null;
            const showPopup = (
                ['monthly', 'yearly'].includes(pageQuery) ||
                productMonthlyPriceQueryRegex.test(pageQuery) ||
                productYearlyPriceQueryRegex.test(pageQuery) ||
                offersRegex.test(pageQuery)
            ) ? false : true;
            return {
                showPopup,
                ...(page ? {page} : {}),
                ...(pageQuery ? {pageQuery} : {}),
                ...(pageData ? {pageData} : {}),
                ...(lastPage ? {lastPage} : {})
            };
        }
        return {};
    }

    /** Fetch state from Preview mode */
    fetchPreviewData() {
        const [, qs] = window.location.hash.substr(1).split('?');
        if (hasMode(['preview'])) {
            let data = {};
            if (hasMode(['offerPreview'])) {
                data = this.fetchOfferQueryStrData(qs);
            } else {
                data = this.fetchQueryStrData(qs);
            }
            return {
                ...data,
                showPopup: true
            };
        }
        return {};
    }

    /* Get the accent color from data attributes */
    getColorOverride() {
        const scriptTag = document.querySelector('script[data-ghost]');
        if (scriptTag && scriptTag.dataset.accentColor) {
            return scriptTag.dataset.accentColor;
        }
        return false;
    }

    /** Fetch site and member session data with Ghost Apis  */
    async fetchApiData() {
        const {siteUrl, customSiteUrl, apiUrl, apiKey} = this.props;
        try {
            this.GhostApi = this.props.api || setupGhostApi({siteUrl, apiUrl, apiKey});
            const {site, member} = await this.GhostApi.init();

            const colorOverride = this.getColorOverride();
            if (colorOverride) {
                site.accent_color = colorOverride;
            }

            this.setupFirstPromoter({site, member});
            this.setupSentry({site});
            return {site, member};
        } catch (e) {
            if (hasMode(['dev', 'test'], {customSiteUrl})) {
                return {};
            }

            throw e;
        }
    }

    /** Setup Sentry */
    setupSentry({site}) {
        if (hasMode(['test'])) {
            return null;
        }
        const {portal_sentry: portalSentry, portal_version: portalVersion, version: ghostVersion} = site;
        // eslint-disable-next-line no-undef
        const appVersion = REACT_APP_VERSION || portalVersion;
        const releaseTag = `portal@${appVersion}|ghost@${ghostVersion}`;
        if (portalSentry && portalSentry.dsn) {
            Sentry.init({
                dsn: portalSentry.dsn,
                environment: portalSentry.env || 'development',
                release: releaseTag,
                beforeSend: (event) => {
                    if (isSentryEventAllowed({event})) {
                        return event;
                    }
                    return null;
                },
                allowUrls: [
                    /https?:\/\/((www)\.)?unpkg\.com\/@tryghost\/portal/
                ]
            });
        }
    }

    /** Setup Firstpromoter script */
    setupFirstPromoter({site, member}) {
        if (hasMode(['test'])) {
            return null;
        }
        const firstPromoterId = getFirstpromoterId({site});
        let siteDomain = getSiteDomain({site});
        // Replace any leading subdomain and prefix the siteDomain with
        // a `.` to allow the FPROM cookie to be accessible across all subdomains
        // or the root.
        siteDomain = siteDomain?.replace(/^(\S*\.)?(\S*\.\S*)$/i, '.$2');

        if (firstPromoterId && siteDomain) {
            const t = document.createElement('script');
            t.type = 'text/javascript';
            t.async = !0;
            t.src = 'https://cdn.firstpromoter.com/fprom.js';
            t.onload = t.onreadystatechange = function () {
                let _t = this.readyState;
                if (!_t || 'complete' === _t || 'loaded' === _t) {
                    try {
                        window.$FPROM.init(firstPromoterId, siteDomain);
                        if (isRecentMember({member})) {
                            const email = member.email;
                            const uid = member.uuid;
                            if (window.$FPROM) {
                                window.$FPROM.trackSignup({email: email, uid: uid});
                            } else {
                                const _fprom = window._fprom || [];
                                window._fprom = _fprom;
                                _fprom.push(['event', 'signup']);
                                _fprom.push(['email', email]);
                                _fprom.push(['uid', uid]);
                            }
                        }
                    } catch (err) {
                        // Log FP tracking failure
                    }
                }
            };
            const e = document.getElementsByTagName('script')[0];
            e.parentNode.insertBefore(t, e);
        }
    }

    /** Handle actions from across App and update App state */
    async dispatchAction(action, data) {
        clearTimeout(this.timeoutId);
        this.setState({
            action: `${action}:running`
        });
        try {
            const updatedState = await ActionHandler({action, data, state: this.state, api: this.GhostApi});
            this.setState(updatedState);

            /** Reset action state after short timeout if not failed*/
            if (updatedState && updatedState.action && !updatedState.action.includes(':failed')) {
                this.timeoutId = setTimeout(() => {
                    this.setState({
                        action: ''
                    });
                }, 2000);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error(`[Portal] Failed to dispatch action: ${action}`, error);

            if (data && data.throwErrors) {
                throw error;
            }

            const popupNotification = createPopupNotification({
                type: `${action}:failed`,
                autoHide: true, closeable: true, status: 'error', state: this.state,
                meta: {
                    error
                }
            });
            this.setState({
                action: `${action}:failed`,
                popupNotification
            });
        }
    }

    /**Handle state update for preview url and Portal Link changes */
    updateStateForPreviewLinks() {
        const {site: previewSite, ...restPreviewData} = this.fetchPreviewData();
        const {site: linkSite, ...restLinkData} = this.fetchLinkData();

        const updatedState = {
            site: {
                ...this.state.site,
                ...(linkSite || {}),
                ...(previewSite || {}),
                plans: {
                    ...(this.state.site && this.state.site.plans),
                    ...(linkSite || {}).plans,
                    ...(previewSite || {}).plans
                }
            },
            ...restLinkData,
            ...restPreviewData
        };
        this.handleSignupQuery({site: updatedState.site, pageQuery: updatedState.pageQuery});
        this.setState(updatedState);
    }

    /** Handle Portal offer urls */
    async handleOfferQuery({site, offerId, member = this.state.member}) {
        const {portal_button: portalButton} = site;
        removePortalLinkFromUrl();
        if (!isPaidMember({member})) {
            try {
                const offerData = await this.GhostApi.site.offer({offerId});
                const offer = offerData?.offers[0];
                if (isActiveOffer({site, offer})) {
                    if (!portalButton) {
                        const product = getProductFromId({site, productId: offer.tier.id});
                        const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;
                        this.dispatchAction('openPopup', {
                            page: 'loading'
                        });
                        if (member) {
                            const {tierId, cadence} = getProductCadenceFromPrice({site, priceId: price.id});
                            this.dispatchAction('checkoutPlan', {plan: price.id, offerId, tierId, cadence});
                        } else {
                            const {tierId, cadence} = getProductCadenceFromPrice({site, priceId: price.id});
                            this.dispatchAction('signup', {plan: price.id, offerId, tierId, cadence});
                        }
                    } else {
                        this.dispatchAction('openPopup', {
                            page: 'offer',
                            pageData: offerData?.offers[0]
                        });
                    }
                }
            } catch (e) {
                // ignore invalid portal url
            }
        }
    }

    /** Handle direct signup link for a price */
    handleSignupQuery({site, pageQuery, member}) {
        const offerQueryRegex = /^offers\/(\w+?)\/?$/;
        let priceId = pageQuery;
        if (offerQueryRegex.test(pageQuery || '')) {
            const [, offerId] = pageQuery.match(offerQueryRegex);
            this.handleOfferQuery({site, offerId, member});
            return;
        }
        if (getPriceIdFromPageQuery({site, pageQuery})) {
            priceId = getPriceIdFromPageQuery({site, pageQuery});
        }
        const queryPrice = getQueryPrice({site: site, priceId});
        if (pageQuery
            && pageQuery !== 'free'
        ) {
            removePortalLinkFromUrl();
            const plan = queryPrice?.id || priceId;
            if (plan !== 'free') {
                this.dispatchAction('openPopup', {
                    page: 'loading'
                });
            }
            const {tierId, cadence} = getProductCadenceFromPrice({site, priceId: plan});
            this.dispatchAction('signup', {plan, tierId, cadence});
        }
    }

    /**Get Portal page from Link/Data-attribute path*/
    getPageFromLinkPath(path) {
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

    /**Get Accent color from site data*/
    getAccentColor() {
        const {accent_color: accentColor} = this.state.site || {};
        return accentColor;
    }

    /**Get final page set in App context from state data*/
    getContextPage({site, page, member}) {
        /**Set default page based on logged-in status */
        if (!page || page === 'default') {
            const loggedOutPage = isInviteOnlySite({site}) ? 'signin' : 'signup';
            page = member ? 'accountHome' : loggedOutPage;
        }

        if (page === 'accountPlan' && isComplimentaryMember({member}) && !allowCompMemberUpgrade({member})) {
            page = 'accountHome';
        }

        return getActivePage({page});
    }

    /**Get final member set in App context from state data*/
    getContextMember({page, member, customSiteUrl}) {
        if (hasMode(['dev', 'preview'], {customSiteUrl})) {
            /** Use dummy member(free or paid) for account pages in dev/preview mode*/
            if (isAccountPage({page}) || isOfferPage({page})) {
                if (hasMode(['dev'], {customSiteUrl})) {
                    return member || Fixtures.member.free;
                } else if (hasMode(['preview'])) {
                    return Fixtures.member.preview;
                } else {
                    return Fixtures.member.paid;
                }
            }

            /** Ignore member for non-account pages in dev/preview mode*/
            return null;
        }
        return member;
    }

    /**Get final App level context from App state*/
    getContextFromState() {
        const {site, member, action, page, lastPage, showPopup, pageQuery, pageData, popupNotification, customSiteUrl, t, dir, scrollbarWidth} = this.state;
        const contextPage = this.getContextPage({site, page, member});
        const contextMember = this.getContextMember({page: contextPage, member, customSiteUrl});
        return {
            api: this.GhostApi,
            site,
            action,
            brandColor: this.getAccentColor(),
            page: contextPage,
            pageQuery,
            pageData,
            member: contextMember,
            lastPage,
            showPopup,
            popupNotification,
            customSiteUrl,
            t,
            dir,
            scrollbarWidth,
            onAction: (_action, data) => this.dispatchAction(_action, data)
        };
    }

    getRecommendationButtons() {
        const customTriggerSelector = '[data-recommendation]';
        return document.querySelectorAll(customTriggerSelector) || [];
    }

    /** Setup click tracking for recommendation buttons */
    setupRecommendationButtons() {
        // Handler for custom buttons
        const clickHandler = (event) => {
            // Send beacons for recommendation clicks
            const recommendationId = event.currentTarget.dataset.recommendation;

            if (recommendationId) {
                this.dispatchAction('trackRecommendationClicked', {
                    recommendationId
                // eslint-disable-next-line no-console
                }).catch(console.error);
            } else {
                // eslint-disable-next-line no-console
                console.warn('[Portal] Invalid usage of data-recommendation attribute');
            }
        };

        const elements = this.getRecommendationButtons();
        for (const element of elements) {
            element.addEventListener('click', clickHandler, {passive: true});
        }
    }

    /**
     * Transform any portal links to use relative paths
     *
     * Prevents unwanted/unnecessary switches to the home page when opening the
     * portal. Especially useful for copy/pasted links from Admin screens.
     */
    transformPortalLinksToRelative() {
        document.querySelectorAll('a[href*="#/portal"]').forEach(transformPortalAnchorToRelative);
    }

    render() {
        if (this.state.initStatus === 'success') {
            return (
                <SentryErrorBoundary site={this.state.site}>
                    <AppContext.Provider value={this.getContextFromState()}>
                        <PopupModal />
                        <TriggerButton />
                        <Notification />
                    </AppContext.Provider>
                </SentryErrorBoundary>
            );
        }
        return null;
    }
}
