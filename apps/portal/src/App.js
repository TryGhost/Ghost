import React from 'react';
import * as Sentry from '@sentry/react';
import i18n, {t} from './utils/i18n';
import {chooseBestErrorMessage} from './utils/errors';
import TriggerButton from './components/TriggerButton';
import Notification from './components/Notification';
import PopupModal from './components/PopupModal';
import AppContext from './AppContext';
import * as Fixtures from './utils/fixtures';
import {hasMode} from './utils/check-mode';
import {transformPortalAnchorToRelative} from './utils/transform-portal-anchor-to-relative';
import {getActivePage, isAccountPage, isOfferPage} from './pages';
import ActionHandler from './actions';
import './App.css';
import {allowCompMemberUpgrade, createPopupNotification, hasAvailablePrices, getPriceIdFromPageQuery, getProductCadenceFromPrice, getProductFromId, getQueryPrice, isActiveOffer, isComplimentaryMember, isInviteOnly, isPaidMember, removePortalLinkFromUrl} from './utils/helpers';
import {handleDataAttributes} from './data-attributes';
import {parsePortalLinkPath} from './utils/url-parsers';
import {getScrollbarWidth, sendPortalReadyEvent, setupRecommendationButtons, showLexicalSignupForms} from './utils/dom-utils';
import {fetchAllData, fetchLinkData, fetchPreviewData} from './utils/data-fetchers';
import {lockBodyScroll, unlockBodyScroll} from './utils/body-scroll-lock';

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
            actionErrorMessage: null,
            initStatus: 'running',
            lastPage: null,
            customSiteUrl: props.customSiteUrl,
            locale: props.locale,
            scrollbarWidth: 0,
            labs: props.labs || {}
        };
    }

    componentDidMount() {
        const scrollbarWidth = getScrollbarWidth();
        this.setState({scrollbarWidth});

        this.initSetup();
    }

    componentDidUpdate(prevProps, prevState) {
        /**Handle custom trigger class change on popup open state change */
        if (prevState.showPopup !== this.state.showPopup) {
            this.handleCustomTriggerClassUpdate();

            /** Manage body scroll lock when popup opens/closes */
            if (this.state.showPopup) {
                this.bodyScrollState = lockBodyScroll(this.state.scrollbarWidth);
            } else {
                unlockBodyScroll(this.bodyScrollState || {previousOverflow: '', previousMargin: '0px'});
            }
        }

        if (this.state.initStatus === 'success' && prevState.initStatus !== this.state.initStatus) {
            const {siteUrl} = this.props;
            const contextState = this.getContextFromState();
            sendPortalReadyEvent();
            handleDataAttributes({
                siteUrl,
                site: contextState.site,
                member: contextState.member,
                labs: contextState.labs,
                doAction: contextState.doAction,
                captureException: Sentry.captureException
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

    /** Setup custom trigger buttons handling on page */
    setupCustomTriggerButton() {
        // Handler for custom buttons
        this.clickHandler = (event) => {
            event.preventDefault();
            const target = event.currentTarget;
            const pagePath = (target && target.dataset.portal);
            const {page, pageQuery, pageData} = parsePortalLinkPath(pagePath) || {};
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
            const {GhostApi, site, member, page, showPopup, popupNotification, lastPage, pageQuery, pageData} = await fetchAllData({
                apiConfig: {
                    siteUrl: this.props.siteUrl,
                    customSiteUrl: this.props.customSiteUrl,
                    apiUrl: this.props.apiUrl,
                    apiKey: this.props.apiKey,
                    api: this.props.api
                },
                customSiteUrl: this.state.customSiteUrl,
                showPopup: this.props.showPopup,
                getColorOverride: () => this.getColorOverride()
            });
            this.GhostApi = GhostApi;
            const i18nLanguage = this.props.siteI18nEnabled ? this.props.locale || site.locale || 'en' : 'en';
            i18n.changeLanguage(i18nLanguage);

            const state = {
                site,
                member,
                page,
                lastPage,
                pageQuery,
                showPopup,
                pageData,
                popupNotification,
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
                showLexicalSignupForms();
            }

            setupRecommendationButtons((recommendationId) => {
                return this.dispatchAction('trackRecommendationClicked', {recommendationId});
            });

            // avoid portal links switching to homepage (e.g. from absolute link copy/pasted from Admin)
            document.querySelectorAll('a[href*="#/portal"]').forEach(transformPortalAnchorToRelative);
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

    /* Get the accent color from data attributes */
    getColorOverride() {
        const scriptTag = document.querySelector('script[data-ghost]');
        if (scriptTag && scriptTag.dataset.accentColor) {
            return scriptTag.dataset.accentColor;
        }
        return false;
    }


    /** Handle actions from across App and update App state */
    async dispatchAction(action, data) {
        clearTimeout(this.timeoutId);
        this.setState({
            action: `${action}:running`,
            actionErrorMessage: null
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
                actionErrorMessage: chooseBestErrorMessage(error, t('An unexpected error occured. Please try again or <a>contact support</a> if the error persists.')),
                popupNotification
            });
        }
    }

    /**Handle state update for preview url and Portal Link changes */
    updateStateForPreviewLinks() {
        const {site: previewSite, ...restPreviewData} = fetchPreviewData();
        const {site: linkSite, ...restLinkData} = fetchLinkData(this.state.site, this.state.member);

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
    async handleOfferQuery({site, offerId, member}) {
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

    /**Get Accent color from site data*/
    getAccentColor(site) {
        const {accent_color: accentColor} = site || {};
        return accentColor;
    }

    /**Get final page set in App context from state data*/
    getContextPage({site, page, member}) {
        /**Set default page based on logged-in status */
        if (!page || page === 'default') {
            const loggedOutPage = isInviteOnly({site}) || !hasAvailablePrices({site}) ? 'signin' : 'signup';
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
        const {site, member, action, actionErrorMessage, page, lastPage, showPopup, pageQuery, pageData, popupNotification, customSiteUrl, dir, scrollbarWidth, labs, otcRef} = this.state;
        const contextPage = this.getContextPage({site, page, member});
        const contextMember = this.getContextMember({page: contextPage, member, customSiteUrl});
        return {
            api: this.GhostApi,
            site,
            action,
            actionErrorMessage,
            brandColor: this.getAccentColor(site),
            page: contextPage,
            pageQuery,
            pageData,
            member: contextMember,
            lastPage,
            showPopup,
            popupNotification,
            customSiteUrl,
            dir,
            scrollbarWidth,
            labs,
            otcRef,
            doAction: (_action, data) => this.dispatchAction(_action, data)
        };
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
