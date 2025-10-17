import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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
import {getAccentColorOverride, getScrollbarWidth, sendPortalReadyEvent, setupRecommendationButtons, showLexicalSignupForms} from './utils/dom-utils';
import {fetchAllData, fetchLinkData, fetchPreviewData} from './utils/data-fetchers';
import {lockBodyScroll, unlockBodyScroll} from './utils/body-scroll-lock';
import {setupCustomTriggerButtons, updateCustomTriggerClasses} from './utils/custom-trigger-buttons';

const DEFAULT_BODY_SCROLL_STATE = {previousOverflow: '', previousMargin: '0px'};

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

export default function App(props) {
    const {
        api,
        apiKey,
        apiUrl,
        customSiteUrl,
        labs: initialLabs,
        locale: initialLocale,
        showPopup: initialShowPopup,
        siteI18nEnabled,
        siteUrl
    } = props;

    const ghostApiRef = useRef();
    const timeoutIdRef = useRef();
    const bodyScrollStateRef = useRef(DEFAULT_BODY_SCROLL_STATE);
    const customTriggerButtonsRef = useRef([]);
    const cleanupCustomTriggersRef = useRef();
    const hashHandlerRef = useRef();

    const [state, setStateInternal] = useState(() => ({
        site: null,
        member: null,
        page: 'loading',
        showPopup: false,
        action: 'init:running',
        actionErrorMessage: null,
        initStatus: 'running',
        lastPage: null,
        customSiteUrl,
        locale: initialLocale,
        scrollbarWidth: 0,
        labs: initialLabs || {}
    }));

    const stateRef = useRef(state);
    stateRef.current = state;

    const setState = useCallback((update) => {
        setStateInternal((prev) => {
            const partial = typeof update === 'function' ? update(prev) : update;
            if (partial == null) {
                return prev;
            }
            const next = {...prev, ...partial};
            stateRef.current = next;
            return next;
        });
    }, []);

    const getAccentColor = useCallback((siteData) => {
        const {accent_color: accentColor} = siteData || {};
        return accentColor;
    }, []);

    const getContextPage = useCallback(({site: siteData, page: currentPage, member}) => {
        let derivedPage = currentPage;
        if (!derivedPage || derivedPage === 'default') {
            const loggedOutPage = isInviteOnly({site: siteData}) || !hasAvailablePrices({site: siteData}) ? 'signin' : 'signup';
            derivedPage = member ? 'accountHome' : loggedOutPage;
        }

        if (derivedPage === 'accountPlan' && isComplimentaryMember({member}) && !allowCompMemberUpgrade({member})) {
            derivedPage = 'accountHome';
        }

        return getActivePage({page: derivedPage});
    }, []);

    const getContextMember = useCallback(({page: contextPage, member, customSiteUrl: siteUrlOverride}) => {
        if (hasMode(['dev', 'preview'], {customSiteUrl: siteUrlOverride})) {
            if (isAccountPage({page: contextPage}) || isOfferPage({page: contextPage})) {
                if (hasMode(['dev'], {customSiteUrl: siteUrlOverride})) {
                    return member || Fixtures.member.free;
                } else if (hasMode(['preview'])) {
                    return Fixtures.member.preview;
                }
                return Fixtures.member.paid;
            }
            return null;
        }
        return member;
    }, []);

    const dispatchAction = useCallback(async (action, data = {}) => {
        clearTimeout(timeoutIdRef.current);
        const runningState = {
            action: `${action}:running`,
            actionErrorMessage: null
        };
        const stateForAction = {...stateRef.current, ...runningState};
        setState(runningState);

        try {
            const updatedState = await ActionHandler({action, data, state: stateForAction, api: ghostApiRef.current});
            setState(updatedState);

            if (updatedState && updatedState.action && !updatedState.action.includes(':failed')) {
                timeoutIdRef.current = setTimeout(() => {
                    setState({action: ''});
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
                autoHide: true,
                closeable: true,
                status: 'error',
                state: stateRef.current,
                meta: {error}
            });
            setState({
                action: `${action}:failed`,
                actionErrorMessage: chooseBestErrorMessage(
                    error,
                    t('An unexpected error occured. Please try again or <a>contact support</a> if the error persists.')
                ),
                popupNotification
            });
        }
    }, [setState]);

    const handleOfferQuery = useCallback(async ({site, offerId, member}) => {
        const {portal_button: portalButton} = site || {};
        removePortalLinkFromUrl();

        if (!ghostApiRef.current || isPaidMember({member})) {
            return;
        }

        try {
            const offerData = await ghostApiRef.current.site.offer({offerId});
            const offer = offerData?.offers?.[0];

            if (isActiveOffer({site, offer})) {
                if (!portalButton) {
                    const product = getProductFromId({site, productId: offer.tier.id});
                    const price = offer.cadence === 'month' ? product.monthlyPrice : product.yearlyPrice;

                    dispatchAction('openPopup', {page: 'loading'});

                    const {tierId, cadence} = getProductCadenceFromPrice({site, priceId: price.id});
                    if (member) {
                        dispatchAction('checkoutPlan', {plan: price.id, offerId, tierId, cadence});
                    } else {
                        dispatchAction('signup', {plan: price.id, offerId, tierId, cadence});
                    }
                } else {
                    dispatchAction('openPopup', {
                        page: 'offer',
                        pageData: offerData?.offers?.[0]
                    });
                }
            }
        } catch (e) {
            // ignore invalid portal url
        }
    }, [dispatchAction]);

    const handleSignupQuery = useCallback(({site, pageQuery, member}) => {
        const offerQueryRegex = /^offers\/(\w+?)\/?$/;
        let priceId = pageQuery;

        if (offerQueryRegex.test(pageQuery || '')) {
            const [, offerId] = pageQuery.match(offerQueryRegex);
            handleOfferQuery({site, offerId, member});
            return;
        }

        if (getPriceIdFromPageQuery({site, pageQuery})) {
            priceId = getPriceIdFromPageQuery({site, pageQuery});
        }

        const queryPrice = getQueryPrice({site, priceId});
        if (pageQuery && pageQuery !== 'free') {
            removePortalLinkFromUrl();
            const plan = queryPrice?.id || priceId;
            if (plan !== 'free') {
                dispatchAction('openPopup', {page: 'loading'});
            }
            const {tierId, cadence} = getProductCadenceFromPrice({site, priceId: plan});
            dispatchAction('signup', {plan, tierId, cadence});
        }
    }, [dispatchAction, handleOfferQuery]);

    const updateStateForPreviewLinks = useCallback(() => {
        const currentState = stateRef.current;
        const {site: previewSite, ...restPreviewData} = fetchPreviewData();
        const {site: linkSite, ...restLinkData} = fetchLinkData(currentState.site, currentState.member);

        const mergedSite = {
            ...currentState.site,
            ...(linkSite || {}),
            ...(previewSite || {}),
            plans: {
                ...(currentState.site && currentState.site.plans),
                ...(linkSite || {}).plans,
                ...(previewSite || {}).plans
            }
        };

        const updatedState = {
            site: mergedSite,
            ...restLinkData,
            ...restPreviewData
        };

        handleSignupQuery({site: mergedSite, pageQuery: updatedState.pageQuery, member: currentState.member});
        setState(updatedState);
    }, [handleSignupQuery, setState]);

    const initSetup = useCallback(async () => {
        try {
            const {GhostApi, site, member, page, showPopup, popupNotification, lastPage, pageQuery, pageData} = await fetchAllData({
                apiConfig: {
                    siteUrl,
                    customSiteUrl,
                    apiUrl,
                    apiKey,
                    api
                },
                customSiteUrl: stateRef.current.customSiteUrl,
                showPopup: initialShowPopup,
                getColorOverride: getAccentColorOverride
            });

            ghostApiRef.current = GhostApi;

            const i18nLanguage = siteI18nEnabled ? (initialLocale || site.locale || 'en') : 'en';
            i18n.changeLanguage(i18nLanguage);

            const nextState = {
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

            handleSignupQuery({site, pageQuery, member});
            setState(nextState);

            if (hashHandlerRef.current) {
                window.removeEventListener('hashchange', hashHandlerRef.current, false);
            }

            hashHandlerRef.current = () => {
                updateStateForPreviewLinks();
            };
            window.addEventListener('hashchange', hashHandlerRef.current, false);

            if (!member) {
                showLexicalSignupForms();
            }

            setupRecommendationButtons((recommendationId) => {
                return dispatchAction('trackRecommendationClicked', {recommendationId});
            });

            document.querySelectorAll('a[href*="#/portal"]').forEach(transformPortalAnchorToRelative);
        } catch (e) {
            /* eslint-disable no-console */
            console.error(`[Portal] Failed to initialize:`, e);
            /* eslint-enable no-console */
            setState({
                action: 'init:failed',
                initStatus: 'failed'
            });
        }
    }, [api, apiKey, apiUrl, customSiteUrl, dispatchAction, getAccentColorOverride, handleSignupQuery, initialLocale, initialShowPopup, setState, siteI18nEnabled, siteUrl, updateStateForPreviewLinks]);

    useEffect(() => {
        setState({scrollbarWidth: getScrollbarWidth()});
        initSetup();
    }, [initSetup, setState]);

    useEffect(() => {
        const handleCustomTriggerClick = (event) => {
            const target = event.currentTarget;
            const pagePath = target?.dataset?.portal;
            const {page: triggerPage, pageQuery, pageData} = parsePortalLinkPath(pagePath) || {};
            const currentState = stateRef.current;

            if (currentState.initStatus === 'success') {
                if (pageQuery && pageQuery !== 'free') {
                    handleSignupQuery({site: currentState.site, pageQuery, member: currentState.member});
                } else {
                    dispatchAction('openPopup', {page: triggerPage, pageQuery, pageData});
                }
            }
        };

        const {buttons, cleanup} = setupCustomTriggerButtons(handleCustomTriggerClick);
        customTriggerButtonsRef.current = buttons;
        cleanupCustomTriggersRef.current = cleanup;

        return () => {
            cleanup?.();
        };
    }, [dispatchAction, handleSignupQuery]);

    useEffect(() => {
        return () => {
            clearTimeout(timeoutIdRef.current);
            cleanupCustomTriggersRef.current?.();
            if (hashHandlerRef.current) {
                window.removeEventListener('hashchange', hashHandlerRef.current, false);
            }
            unlockBodyScroll(bodyScrollStateRef.current || DEFAULT_BODY_SCROLL_STATE);
        };
    }, []);

    const {
        site: siteState,
        member: memberState,
        page: pageState,
        lastPage,
        showPopup,
        action,
        actionErrorMessage,
        initStatus,
        pageQuery,
        pageData,
        popupNotification,
        customSiteUrl: stateCustomSiteUrl,
        dir,
        scrollbarWidth,
        labs,
        otcRef
    } = state;

    const prevShowPopupRef = useRef(showPopup);
    useEffect(() => {
        if (prevShowPopupRef.current !== showPopup) {
            updateCustomTriggerClasses(customTriggerButtonsRef.current, showPopup);

            if (showPopup) {
                bodyScrollStateRef.current = lockBodyScroll(scrollbarWidth);
            } else {
                unlockBodyScroll(bodyScrollStateRef.current || DEFAULT_BODY_SCROLL_STATE);
            }
        }

        prevShowPopupRef.current = showPopup;
    }, [scrollbarWidth, showPopup]);

    const prevInitStatusRef = useRef(initStatus);
    useEffect(() => {
        if (initStatus === 'success' && prevInitStatusRef.current !== 'success') {
            const contextPage = getContextPage({site: siteState, page: pageState, member: memberState});
            const contextMember = getContextMember({page: contextPage, member: memberState, customSiteUrl: stateCustomSiteUrl});

            sendPortalReadyEvent();
            handleDataAttributes({
                siteUrl,
                site: siteState,
                member: contextMember,
                labs,
                doAction: dispatchAction,
                captureException: Sentry.captureException
            });
        }

        prevInitStatusRef.current = initStatus;
    }, [dispatchAction, getContextMember, getContextPage, initStatus, labs, memberState, pageState, siteState, stateCustomSiteUrl, siteUrl]);

    const contextValue = useMemo(() => {
        const contextPage = getContextPage({site: siteState, page: pageState, member: memberState});
        const contextMember = getContextMember({page: contextPage, member: memberState, customSiteUrl: stateCustomSiteUrl});

        return {
            api: ghostApiRef.current,
            site: siteState,
            action,
            actionErrorMessage,
            brandColor: getAccentColor(siteState),
            page: contextPage,
            pageQuery,
            pageData,
            member: contextMember,
            lastPage,
            showPopup,
            popupNotification,
            customSiteUrl: stateCustomSiteUrl,
            dir,
            scrollbarWidth,
            labs,
            otcRef,
            doAction: dispatchAction
        };
    }, [action, actionErrorMessage, dispatchAction, dir, getAccentColor, getContextMember, getContextPage, labs, lastPage, memberState, pageData, pageQuery, pageState, popupNotification, scrollbarWidth, showPopup, siteState, stateCustomSiteUrl, otcRef]);

    if (initStatus === 'success') {
        return (
            <SentryErrorBoundary site={siteState}>
                <AppContext.Provider value={contextValue}>
                    <PopupModal />
                    <TriggerButton />
                    <Notification />
                </AppContext.Provider>
            </SentryErrorBoundary>
        );
    }

    return null;
}
