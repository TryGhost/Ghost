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
        // Setup custom trigger button handling
        this.setupCustomTriggerButton();

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
        this.initSetup();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.showPopup !== this.state.showPopup) {
            this.handleCustomTriggerClassUpdate();
        }
    }

    componentWillUnmount() {
        this.customTriggerButtons.forEach((customTriggerButton) => {
            customTriggerButton.removeEventListener('click', this.clickHandler);
        });
    }

    /** Setup custom trigger buttons handling on page */
    setupCustomTriggerButton() {
        // Handler for custom buttons
        this.clickHandler = (event) => {
            const target = event.currentTarget;
            const pagePath = (target && target.dataset.portal);
            const pageFromPath = this.getPageFromPath(pagePath);

            event.preventDefault();
            this.onAction('openPopup', {page: pageFromPath});
        };
        const customTriggerSelector = '[data-portal]';
        const popupCloseClass = 'gh-members-popup-close';
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
        const popupOpenClass = 'gh-members-popup-open';
        const popupCloseClass = 'gh-members-popup-close';
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
            const {site, member, page, showPopup} = await this.fetchData();
            this.setState({
                site,
                member,
                page,
                showPopup,
                action: 'init:success',
                initStatus: 'success'
            });

            // Listen to preview mode changes
            this.hashHandler = () => {
                this.updateStateForPreview();
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

        const stripeParam = this.getStripeUrlParam();
        let page = '';

        /** Set page for magic link popup on stripe success*/
        if (!member && stripeParam === 'success') {
            page = 'magiclink';
        }

        return {
            member,
            page,
            site: {
                ...apiSiteData,
                ...linkSiteData,
                ...previewSiteData,
                ...devSiteData
            },
            ...restDevData,
            ...restLinkData,
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
            site: {}
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
            } else if (key === 'accentColor' && value) {
                data.site.accent_color = value;
            } else if (key === 'buttonIcon' && value) {
                data.site.portal_button_icon = value;
            } else if (key === 'signupButtonText') {
                data.site.portal_button_signup_text = value || '';
            } else if (key === 'buttonStyle' && value) {
                data.site.portal_button_style = value;
            }
        }
        data.site.portal_plans = allowedPlans;
        return data;
    }

    /** Fetch state from Portal Links */
    fetchLinkData() {
        const [path] = window.location.hash.substr(1).split('?');
        const linkRegex = /^\/portal(?:\/(\w+(?:\/\w+)?))?$/;
        if (path && linkRegex.test(path)) {
            const [,pagePath] = path.match(linkRegex);
            const page = this.getPageFromPath(pagePath);
            return {
                showPopup: true,
                ...(page ? {page} : {})
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

    /** Fetch site and member session data with Ghost Apis  */
    async fetchApiData() {
        try {
            const {siteUrl} = this.props;
            this.GhostApi = setupGhostApi({siteUrl});
            const {site, member} = await this.GhostApi.init();
            return {site, member};
        } catch (e) {
            if (hasMode(['dev', 'test'])) {
                return {};
            }
            throw e;
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

            /** Reset action state after short timeout */
            this.timeoutId = setTimeout(() => {
                this.setState({
                    action: ''
                });
            }, 2000);
        } catch (e) {
            this.setState({
                action: `${action}:failed`
            });
        }
    }

    /**Handle state update for preview url changes */
    updateStateForPreview() {
        const {site: previewSite, ...restPreviewData} = this.fetchPreviewData();
        this.setState({
            site: {
                ...this.state.site,
                ...(previewSite || {})
            },
            ...restPreviewData
        });
    }

    /**Fetch Stripe param from site url after redirect from Stripe page*/
    getStripeUrlParam() {
        const url = new URL(window.location);
        return url.searchParams.get('stripe');
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

    /**Get Accent color from site data, fallback to default*/
    getAccentColor() {
        const {accent_color: accentColor = '#3db0ef'} = this.state.site || {};
        return accentColor || '#3db0ef';
    }

    /**Get final page set in App context from state data*/
    getContextPage({page, member}) {
        /**Set default page based on logged-in status */
        if (!page) {
            page = member ? 'accountHome' : 'signup';
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
        const {site, member, action, page, lastPage, showPopup} = this.state;
        const contextPage = this.getContextPage({page, member});
        const contextMember = this.getContextMember({page: contextPage, member});
        return {
            site,
            action,
            brandColor: this.getAccentColor(),
            page: contextPage,
            member: contextMember,
            lastPage,
            showPopup,
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
