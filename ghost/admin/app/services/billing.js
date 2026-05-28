import * as Sentry from '@sentry/ember';
import Service, {inject as service} from '@ember/service';
import {inject} from 'ghost-admin/decorators/inject';
import {tracked} from '@glimmer/tracking';

const BILLING_APP_LOAD_TIMEOUT_MS = 10_000;
const BILLING_APP_LOAD_RETRY_DELAYS_MS = [1_000];
const BILLING_APP_LOAD_FAILURE_MESSAGE = 'Billing app failed to become ready';
const BILLING_APP_ATTEMPT_SOURCE_PRELOAD = 'preload';
const BILLING_APP_ATTEMPT_SOURCE_USER_OPEN = 'user_open';
const BILLING_APP_ATTEMPT_SOURCE_RETRY = 'retry';

export default class BillingService extends Service {
    @service ghostPaths;
    @service router;
    @service store;

    @inject config;

    billingRouteRoot = '#/pro';

    @tracked billingWindowOpen = false;
    @tracked subscription = null;
    @tracked previousRoute = null;
    @tracked action = null;
    @tracked ownerUser = null;

    @tracked billingAppLoaded = false;
    @tracked billingAppLoadFailureReported = false;
    @tracked billingAppPreReadyMessageCount = 0;
    @tracked billingAppPreReadyMessageTypes = [];
    @tracked billingAppLastPreReadyMessageType = null;
    @tracked billingAppReadyReceivedAt = null;
    @tracked billingAppReadyPayload = null;
    @tracked billingAppPreloadFailure = null;

    billingAppLoadTimeout = null;
    billingAppRetryTimeout = null;
    billingAppLoadAttempts = 0;
    billingAppLoadTimeoutMs = BILLING_APP_LOAD_TIMEOUT_MS;
    billingAppLoadRetryDelaysMs = BILLING_APP_LOAD_RETRY_DELAYS_MS;
    billingAppLoadAttemptId = null;
    billingAppLoadAttemptSource = BILLING_APP_ATTEMPT_SOURCE_PRELOAD;
    billingAppIframeReloadReason = null;
    billingAppLoadAttemptSequence = 0;
    billingAppIframeSrcSetAt = null;
    billingAppIframeLoadFired = false;

    _loadListenerAttachedTo = null;

    willDestroy() {
        super.willDestroy(...arguments);
        this.clearBillingAppLoadMonitor();
    }

    handleRouteChangeInIframe(destinationRoute) {
        if (this.billingWindowOpen) {
            let billingRoute = this.billingRouteRoot;

            if (destinationRoute !== '/') {
                billingRoute += destinationRoute;
            }

            if (window.location.hash !== billingRoute) {
                window.history.replaceState(window.history.state, '', billingRoute);
            }
        }
    }

    _isBillingIframeLoaded() {
        return this.getBillingIframe() !== null && this.getBillingIframe().contentWindow;
    }

    startBillingAppLoadMonitor(options = {}) {
        const {source = this.billingAppLoadAttemptSource} = options;

        if (this.billingAppLoadTimeout || this.billingAppRetryTimeout) {
            this.billingAppLoadAttemptSource = source;
            return;
        }

        if (this.billingAppLoaded || this.billingAppLoadFailureReported) {
            this.billingAppLoaded = false;
            this.billingAppLoadAttempts = 0;
            this.billingAppLoadFailureReported = false;
            this.resetBillingAppLoadDiagnostics();
        }

        this.billingAppLoadAttemptSource = source;
        this.billingAppLoadAttempts += 1;
        this.billingAppLoadTimeout = setTimeout(() => {
            this.billingAppLoadTimeout = null;
            this.handleBillingAppLoadTimeout();
        }, this.billingAppLoadTimeoutMs);
    }

    handleBillingAppLoadTimeout() {
        const retryDelay = this.billingAppLoadRetryDelaysMs[this.billingAppLoadAttempts - 1];

        if (retryDelay !== undefined) {
            this.billingAppRetryTimeout = setTimeout(() => {
                this.billingAppRetryTimeout = null;
                const source = this.billingWindowOpen ? BILLING_APP_ATTEMPT_SOURCE_RETRY : this.billingAppLoadAttemptSource;

                this.reloadBillingIframe({source, reloadReason: 'timeout_retry'});
                this.startBillingAppLoadMonitor({source});
            }, retryDelay);
            return;
        }

        this.reportBillingAppLoadFailure();
    }

    setBillingIframeSrc(options = {}) {
        const iframe = this.getBillingIframe();
        if (!iframe) {
            return;
        }

        const {
            source = this.billingAppLoadAttemptSource || BILLING_APP_ATTEMPT_SOURCE_PRELOAD,
            reloadReason = 'set_src'
        } = options;

        if (this._loadListenerAttachedTo !== iframe && typeof iframe.addEventListener === 'function') {
            iframe.addEventListener('load', () => {
                this.billingAppIframeLoadFired = true;
            });
            this._loadListenerAttachedTo = iframe;
        }
        this.billingAppLoadAttemptSequence += 1;
        this.billingAppLoadAttemptId = `${Date.now()}-${this.billingAppLoadAttemptSequence}`;
        this.billingAppLoadAttemptSource = source;
        this.billingAppIframeReloadReason = reloadReason;
        this.billingAppIframeLoadFired = false;
        this.billingAppIframeSrcSetAt = Date.now();
        this.resetBillingAppLoadDiagnostics();
        iframe.src = this.getIframeURL();
    }

    reloadBillingIframe(options = {}) {
        const iframe = this.getBillingIframe();

        if (!iframe || this.billingAppLoaded) {
            return;
        }

        this.setBillingIframeSrc(options);
    }

    markBillingAppLoaded(payload = null) {
        this.billingAppLoaded = true;
        this.billingAppLoadFailureReported = false;
        this.billingAppPreloadFailure = null;
        this.billingAppReadyReceivedAt = Date.now();
        this.billingAppReadyPayload = payload;
        this.clearBillingAppLoadMonitor();
    }

    resetBillingAppLoadDiagnostics() {
        this.billingAppPreReadyMessageCount = 0;
        this.billingAppPreReadyMessageTypes = [];
        this.billingAppLastPreReadyMessageType = null;
        this.billingAppReadyReceivedAt = null;
        this.billingAppReadyPayload = null;
    }

    recordBillingAppPreReadyMessage(data) {
        if (this.billingAppLoaded || this.billingAppReadyReceivedAt || this.billingAppLoadFailureReported) {
            return;
        }

        if (!this.billingAppLoadTimeout && !this.billingAppRetryTimeout) {
            return;
        }

        const messageType = this.getBillingAppMessageType(data);

        this.billingAppPreReadyMessageCount += 1;
        this.billingAppLastPreReadyMessageType = messageType;

        if (!this.billingAppPreReadyMessageTypes.includes(messageType)) {
            this.billingAppPreReadyMessageTypes = [
                ...this.billingAppPreReadyMessageTypes,
                messageType
            ];
        }
    }

    getBillingAppMessageType(data) {
        if (data?.request) {
            return data.request;
        }

        if (data?.route) {
            return 'route';
        }

        if (data?.subscription) {
            return 'subscription';
        }

        if (data?.query) {
            return data.query;
        }

        return 'unknown';
    }

    getBillingAppOrigin() {
        const iframeURL = this.getIframeURL({fetchOwner: false});

        if (!iframeURL) {
            return null;
        }

        try {
            return new URL(iframeURL).origin;
        } catch (e) {
            return null;
        }
    }

    isValidBillingIframeMessage(event) {
        if (!event?.data) {
            return false;
        }

        const billingAppOrigin = this.getBillingAppOrigin();

        if (!billingAppOrigin || event.origin !== billingAppOrigin) {
            return false;
        }

        const billingIframeWindow = this.getBillingIframe()?.contentWindow;

        if (!billingIframeWindow) {
            return false;
        }

        if (event.source !== billingIframeWindow) {
            return false;
        }

        return true;
    }

    clearBillingAppLoadMonitor() {
        if (this.billingAppLoadTimeout) {
            clearTimeout(this.billingAppLoadTimeout);
            this.billingAppLoadTimeout = null;
        }

        if (this.billingAppRetryTimeout) {
            clearTimeout(this.billingAppRetryTimeout);
            this.billingAppRetryTimeout = null;
        }
    }

    ensureBillingAppReadyForVisibleUse() {
        if (this.billingAppLoaded) {
            return;
        }

        const hadPreloadFailure = !!this.billingAppPreloadFailure;
        const hadVisibleFailure = this.billingAppLoadFailureReported;

        this.billingAppLoadFailureReported = false;
        this.clearBillingAppLoadMonitor();
        this.billingAppLoadAttempts = 0;

        if (hadPreloadFailure || hadVisibleFailure) {
            this.reloadBillingIframe({
                source: BILLING_APP_ATTEMPT_SOURCE_USER_OPEN,
                reloadReason: hadPreloadFailure ? 'visible_open_after_preload_failure' : 'visible_open_after_load_failure'
            });
        } else {
            this.billingAppLoadAttemptSource = BILLING_APP_ATTEMPT_SOURCE_USER_OPEN;
        }

        this.startBillingAppLoadMonitor({source: BILLING_APP_ATTEMPT_SOURCE_USER_OPEN});
    }

    recordBillingAppPreloadFailure() {
        this.billingAppPreloadFailure = {
            attemptId: this.billingAppLoadAttemptId,
            attempts: this.billingAppLoadAttempts,
            elapsedMs: this.billingAppIframeSrcSetAt ? Date.now() - this.billingAppIframeSrcSetAt : null,
            nonReadyMessageCount: this.billingAppPreReadyMessageCount,
            nonReadyMessageTypes: [...this.billingAppPreReadyMessageTypes],
            lastNonReadyMessageType: this.billingAppLastPreReadyMessageType
        };
    }

    reportBillingAppLoadFailure() {
        if (this.billingAppLoadFailureReported) {
            return;
        }

        if (!this.billingWindowOpen) {
            this.recordBillingAppPreloadFailure();
            return;
        }

        this.billingAppLoadFailureReported = true;

        if (!this.config.sentry_dsn) {
            return;
        }

        const iframe = this.getBillingIframe();
        const visibilityState = document.visibilityState;
        const iframeSrc = iframe?.src || null;
        const configuredBillingOrigin = this.getBillingAppOrigin();

        // Fields are kept flat on `billing_monitor` because Sentry's default
        // `normalizeDepth` of 3 stringifies anything deeper to '[Object]',
        // dropping the diagnostic data entirely.
        let bmaBootAccessible = false;
        let bmaBootHasMarkReady = false;
        let bmaBootThrew = false;
        try {
            const bootObj = iframe?.contentWindow?.__bmaBoot;
            bmaBootAccessible = bootObj !== undefined && bootObj !== null;
            bmaBootHasMarkReady = typeof bootObj?.markReady === 'function';
        } catch (e) {
            // cross-origin access throws — capturing that is itself a signal
            bmaBootThrew = true;
        }
        let computedDisplay = null;
        let computedVisibility = null;
        let rectWidth = null;
        let rectHeight = null;
        if (iframe) {
            try {
                const computed = window.getComputedStyle(iframe);
                computedDisplay = computed.display;
                computedVisibility = computed.visibility;
                const rect = iframe.getBoundingClientRect();
                rectWidth = rect.width;
                rectHeight = rect.height;
            } catch (e) {
                // diagnostic collection must never throw
            }
        }

        Sentry.captureException(BILLING_APP_LOAD_FAILURE_MESSAGE, {
            // not surfaced to the user (the error UI is rendered separately), so warning is correct severity
            level: 'warning',
            fingerprint: ['billing-app-load-failure', visibilityState, String(this.billingAppLoadAttempts)],
            contexts: {
                ghost: {
                    billing_monitor: {
                        attempts: this.billingAppLoadAttempts,
                        attempt_id: this.billingAppLoadAttemptId,
                        attempt_source: this.billingAppLoadAttemptSource,
                        attempt_phase: 'shell_ready',
                        iframe_reload_reason: this.billingAppIframeReloadReason,
                        has_billing_url: !!this.config.hostSettings?.billing?.url,
                        is_force_upgrade: !!this.config.hostSettings?.forceUpgrade,
                        location_hash: window.location.hash,
                        retry_delays_ms: this.billingAppLoadRetryDelaysMs,
                        iframe_src: iframeSrc,
                        configured_billing_origin: configuredBillingOrigin,
                        document_visibility_state: visibilityState,
                        iframe_offset_parent_visible: iframe ? iframe.offsetParent !== null : null,
                        iframe_computed_display: computedDisplay,
                        iframe_computed_visibility: computedVisibility,
                        iframe_rect_width: rectWidth,
                        iframe_rect_height: rectHeight,
                        iframe_load_fired: this.billingAppIframeLoadFired,
                        ms_since_src_set: this.billingAppIframeSrcSetAt ? Date.now() - this.billingAppIframeSrcSetAt : null,
                        non_ready_message_count: this.billingAppPreReadyMessageCount,
                        non_ready_message_types: this.billingAppPreReadyMessageTypes.join(','),
                        last_non_ready_message_type: this.billingAppLastPreReadyMessageType,
                        has_preload_failure: !!this.billingAppPreloadFailure,
                        preload_failure_elapsed_ms: this.billingAppPreloadFailure?.elapsedMs ?? null,
                        preload_non_ready_message_count: this.billingAppPreloadFailure?.nonReadyMessageCount ?? null,
                        preload_non_ready_message_types: this.billingAppPreloadFailure?.nonReadyMessageTypes?.join(',') ?? null,
                        preload_last_non_ready_message_type: this.billingAppPreloadFailure?.lastNonReadyMessageType ?? null,
                        ready_received: false,
                        navigator_online: navigator.onLine,
                        connection_effective_type: navigator.connection?.effectiveType ?? null,
                        bma_boot_accessible: bmaBootAccessible,
                        bma_boot_has_mark_ready: bmaBootHasMarkReady,
                        bma_boot_threw: bmaBootThrew,
                        billing_window_open: this.billingWindowOpen
                    }
                }
            },
            tags: {
                source: 'billing-app-load-monitor',
                attempt_source: this.billingAppLoadAttemptSource,
                attempt_phase: 'shell_ready',
                route: this.router.currentRouteName,
                path: window.location.hash
            }
        });
    }

    getIframeURL(options = {}) {
        const {fetchOwner = true} = options;

        // initiate getting owner user in the background
        if (fetchOwner) {
            this.getOwnerUser();
        }

        let url = this.config.hostSettings?.billing?.url;

        if (window.location.hash && window.location.hash.includes(this.billingRouteRoot)) {
            let destinationRoute = window.location.hash.replace(this.billingRouteRoot, '');

            if (destinationRoute) {
                url += destinationRoute;
            }
        }

        return this.addBillingAppAttemptIdToURL(url);
    }

    addBillingAppAttemptIdToURL(url) {
        if (!url || !this.billingAppLoadAttemptId) {
            return url;
        }

        try {
            const billingUrl = new URL(url);
            billingUrl.searchParams.set('bmaAttemptId', this.billingAppLoadAttemptId);
            return billingUrl.toString();
        } catch (e) {
            return url;
        }
    }

    async getOwnerUser() {
        if (!this.ownerUser) {
            // Try to receive the owner user from the store
            let user = this.store.peekAll('user').findBy('isOwnerOnly', true);

            if (!user) {
                // load it when it's not there yet
                await this.store.findAll('user', {reload: true});
                user = this.store.peekAll('user').findBy('isOwnerOnly', true);
            }
            this.ownerUser = user;
        }
        return this.ownerUser;
    }

    // Sends a route update to a child route in the BMA, because we can't control
    // navigating to it otherwise
    sendRouteUpdate() {
        const action = this.action;

        if (action) {
            if (action === 'checkout' && this._isBillingIframeLoaded()) {
                this.getBillingIframe().contentWindow.postMessage({
                    query: 'routeUpdate',
                    response: this.checkoutRoute
                }, '*');
            }

            this.action = null;
        }
    }

    sendUpdateLimits() {
        if (!this._isBillingIframeLoaded()) {
            return;
        }

        // Send Billing app message to fetch fresh limit usage
        this.getBillingIframe().contentWindow.postMessage({
            query: 'limitUpdate'
        }, '*');
    }

    // Controls billing window modal visibility and sync of the URL visible in browser
    // and the URL opened on the iframe. It is responsible to non user triggered iframe opening,
    // for example: by entering "/pro" route in the URL or using history navigation (back and forward)
    toggleProWindow(value) {
        if (this.billingWindowOpen && value && !this.action) {
            // don't attempt to open again
            return;
        }

        this.sendRouteUpdate();

        this.billingWindowOpen = value;

        if (value) {
            this.ensureBillingAppReadyForVisibleUse();
        }
    }

    // Controls navigation to billing window modal which is triggered from the application UI.
    // For example: pressing "View Billing" link in navigation menu. It's main side effect is
    // remembering the route from which the action has been triggered - "previousRoute" so it
    // could be reused when closing billing window
    openBillingWindow(currentRoute, childRoute) {
        // initiate getting owner user in the background
        this.getOwnerUser();

        if (this.billingWindowOpen) {
            // don't attempt to open again
            return;
        }

        this.previousRoute = currentRoute;

        // Ensures correct "getIframeURL" calculation when syncing iframe location
        // in toggleProWindow
        window.location.hash = childRoute || '/pro';

        this.sendRouteUpdate();
        this.sendUpdateLimits();

        this.router.transitionTo(childRoute || '/pro');
    }

    getBillingIframe() {
        return document.getElementById('billing-frame');
    }
}
