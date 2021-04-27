import TriggerButton from './components/TriggerButton';
import Notification from './components/Notification';
import PopupModal from './components/PopupModal';
import setupGhostApi from './utils/api';
import AppContext from './AppContext';
import {hasMode} from './utils/check-mode';
import {getActivePage, isAccountPage} from './pages';
import * as Fixtures from './utils/fixtures';
import ActionHandler from './actions';
import './App.css';
import NotificationParser from './utils/notifications';
import {capitalize, createPopupNotification, getCurrencySymbol, getFirstpromoterId, getSiteDomain, hasPlan, isComplimentaryMember, removePortalLinkFromUrl} from './utils/helpers';
const React = require('react');

const DEV_MODE_DATA = {
    showPopup: true,
    site: Fixtures.site,
    member: Fixtures.member.paid,
    page: 'accountHome'
};
export default class App extends React.Component {
    constructor(props) {
        super(props);

        if (!props.testState) {
            // Setup custom trigger button handling
            this.setupCustomTriggerButton();
        }

        // testState is used by App.test to pass custom default state for testing
        this.state = props.testState || {
            site: null,
            member: null,
            page: 'loading',
            showPopup: false,
            action: 'init:running',
            initStatus: 'running',
            lastPage: null
        };
    }

    componentDidMount() {
        if (!this.props.testState) {
            this.initSetup();
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.showPopup !== this.state.showPopup) {
            this.handleCustomTriggerClassUpdate();
        }
    }

    componentWillUnmount() {
        clearTimeout(this.timeoutId);
        this.customTriggerButtons && this.customTriggerButtons.forEach((customTriggerButton) => {
            customTriggerButton.removeEventListener('click', this.clickHandler);
        });
    }

    /** Setup custom trigger buttons handling on page */
    setupCustomTriggerButton() {
        // Handler for custom buttons
        this.clickHandler = (event) => {
            event.preventDefault();
            const target = event.currentTarget;
            const pagePath = (target && target.dataset.portal);
            const {page, pageQuery} = this.getPageFromLinkPath(pagePath) || {};

            if (this.state.initStatus === 'success' && !this.state.member && ['monthly', 'yearly'].includes(pageQuery) && hasPlan({site: this.state.site, plan: pageQuery})) {
                removePortalLinkFromUrl();
                this.onAction('signup', {plan: capitalize(pageQuery)});
            }

            if (page) {
                this.onAction('openPopup', {page, pageQuery});
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
        this.customTriggerButtons.forEach((customButton) => {
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
            const {site, member, page, showPopup, popupNotification, lastPage, pageQuery} = await this.fetchData();
            const state = {
                site,
                member,
                page,
                lastPage,
                pageQuery,
                showPopup,
                popupNotification,
                action: 'init:success',
                initStatus: 'success'
            };

            if (!member && ['monthly', 'yearly'].includes(pageQuery) && hasPlan({site, plan: pageQuery})) {
                removePortalLinkFromUrl();
                this.onAction('signup', {plan: capitalize(pageQuery)});
            }

            this.setState(state);

            // Listen to preview mode changes
            this.hashHandler = () => {
                this.updateStateForPreviewLinks();
            };
            window.addEventListener('hashchange', this.hashHandler, false);
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

    /** Fetch data from all available sources */
    async fetchData() {
        const {site: apiSiteData, member} = await this.fetchApiData();
        const {site: devSiteData, ...restDevData} = this.fetchDevData();
        const {site: linkSiteData, ...restLinkData} = this.fetchLinkData();
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
        if (hasMode(['dev'])) {
            return DEV_MODE_DATA;
        }
        return {};
    }

    /** Fetch state from Query String */
    fetchQueryStrData(qs = '') {
        const qsParams = new URLSearchParams(qs);
        const data = {
            site: {
                plans: {}
            }
        };

        const allowedPlans = [];

        // Handle the query params key/value pairs
        for (let pair of qsParams.entries()) {
            const key = pair[0];
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
            } else if (key === 'plans') {
                data.site.portal_plans = value ? value.split(',') : [];
            } else if (key === 'page' && value) {
                data.page = value;
            } else if (key === 'accentColor' && (value === '' || value)) {
                data.site.accent_color = value;
            } else if (key === 'buttonIcon' && value) {
                data.site.portal_button_icon = value;
            } else if (key === 'signupButtonText') {
                data.site.portal_button_signup_text = value || '';
            } else if (key === 'buttonStyle' && value) {
                data.site.portal_button_style = value;
            } else if (key === 'monthlyPrice' && !isNaN(Number(value))) {
                data.site.plans.monthly = Number(value);
            } else if (key === 'yearlyPrice' && !isNaN(Number(value))) {
                data.site.plans.yearly = Number(value);
            } else if (key === 'currency' && value) {
                const currencyValue = value.toUpperCase();
                data.site.plans.currency = currencyValue;
                data.site.plans.currency_symbol = getCurrencySymbol(currencyValue);
            } else if (key === 'disableBackground' && JSON.parse(value)) {
                data.site.disableBackground = JSON.parse(value);
            } else if (key === 'allowSelfSignup' && JSON.parse(value)) {
                data.site.allow_self_signup = JSON.parse(value);
            }
        }
        data.site.portal_plans = allowedPlans;
        return data;
    }

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
    fetchLinkData() {
        const [path] = window.location.hash.substr(1).split('?');
        const linkRegex = /^\/portal\/?(?:\/(\w+(?:\/\w+)?))?\/?$/;
        if (path && linkRegex.test(path)) {
            const [,pagePath] = path.match(linkRegex);
            const {page, pageQuery} = this.getPageFromLinkPath(pagePath) || {};
            const lastPage = ['accountPlan', 'accountProfile'].includes(page) ? 'accountHome' : null;
            return {
                showPopup: ['monthly', 'yearly'].includes(pageQuery) ? false : true,
                ...(page ? {page} : {}),
                ...(pageQuery ? {pageQuery} : {}),
                ...(lastPage ? {lastPage} : {})
            };
        }
        return {};
    }

    /** Fetch state from Preview mode */
    fetchPreviewData() {
        const [, qs] = window.location.hash.substr(1).split('?');
        if (hasMode(['preview'])) {
            const data = this.fetchQueryStrData(qs);
            data.showPopup = true;
            return data;
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
        try {
            const {siteUrl} = this.props;
            this.GhostApi = setupGhostApi({siteUrl});
            const {site, member} = await this.GhostApi.init();
            this.setupFirstPromoter({site, member});
            const colorOverride = this.getColorOverride();
            if (colorOverride) {
                site.accent_color = colorOverride;
            }
            return {site, member};
        } catch (e) {
            if (hasMode(['dev', 'test'])) {
                return {};
            }
            throw e;
        }
    }

    setupFirstPromoter({site, member}) {
        const firstPromoterId = getFirstpromoterId({site});
        const siteDomain = getSiteDomain({site});
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
                        if (member) {
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

    /** Handle actions from across App and update state */
    async onAction(action, data) {
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

    /**Handle state update for preview url changes */
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

        if (!this.state.member && ['monthly', 'yearly'].includes(updatedState.pageQuery) && hasPlan({site: updatedState.site, plan: updatedState.pageQuery})) {
            removePortalLinkFromUrl();
            this.onAction('signup', {plan: capitalize(updatedState.pageQuery)});
        }

        this.setState(updatedState);
    }

    /**Fetch Stripe param from site url after redirect from Stripe page*/
    getStripeUrlParam() {
        const url = new URL(window.location.href);
        return (url.searchParams.get('stripe') || url.searchParams.get('portal-stripe'));
    }

    /**Get Portal page from Link/Data-attribute path*/
    getPageFromPath(path) {
        if (path === 'signup') {
            return 'signup';
        } else if (path === 'signin') {
            return 'signin';
        } else if (path === 'account') {
            return 'accountHome';
        } else if (path === 'account/plans') {
            return 'accountPlan';
        } else if (path === 'account/profile') {
            return 'accountProfile';
        }
    }

    /**Get Portal page from Link/Data-attribute path*/
    getPageFromLinkPath(path) {
        if (path === 'signup') {
            return {
                page: 'signup'
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
        }
        return {};
    }

    /**Get Accent color from site data, fallback to default*/
    getAccentColor() {
        const {accent_color: accentColor} = this.state.site || {};
        return accentColor;
    }

    /**Get final page set in App context from state data*/
    getContextPage({page, member}) {
        /**Set default page based on logged-in status */
        if (!page) {
            page = member ? 'accountHome' : 'signup';
        }

        if (page === 'accountPlan' && isComplimentaryMember({member})) {
            page = 'accountHome';
        }

        return getActivePage({page});
    }

    /**Get final member set in App context from state data*/
    getContextMember({page, member}) {
        if (hasMode(['dev', 'preview'])) {
            /** Use dummy member(free or paid) for account pages in dev/preview mode*/
            if (isAccountPage({page})) {
                if (hasMode(['dev'])) {
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

    /**Get final App level context from data/state*/
    getContextFromState() {
        const {site, member, action, page, lastPage, showPopup, pageQuery, popupNotification} = this.state;
        const contextPage = this.getContextPage({page, member});
        const contextMember = this.getContextMember({page: contextPage, member});
        return {
            site,
            action,
            brandColor: this.getAccentColor(),
            page: contextPage,
            pageQuery,
            member: contextMember,
            lastPage,
            showPopup,
            popupNotification,
            onAction: (_action, data) => this.onAction(_action, data)
        };
    }

    render() {
        if (this.state.initStatus === 'success') {
            return (
                <AppContext.Provider value={this.getContextFromState()}>
                    <PopupModal />
                    <TriggerButton />
                    <Notification />
                </AppContext.Provider>
            );
        }
        return null;
    }
}
