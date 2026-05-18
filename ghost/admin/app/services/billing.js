import * as Sentry from '@sentry/ember';
import Service, {inject as service} from '@ember/service';
import {inject} from 'ghost-admin/decorators/inject';
import {tracked} from '@glimmer/tracking';

const BILLING_APP_LOAD_TIMEOUT_MS = 10_000;
const BILLING_APP_LOAD_RETRY_DELAYS_MS = [1_000];
const BILLING_APP_LOAD_FAILURE_MESSAGE = 'Billing app failed to become ready';

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

    billingAppLoadTimeout = null;
    billingAppRetryTimeout = null;
    billingAppLoadAttempts = 0;
    billingAppLoadTimeoutMs = BILLING_APP_LOAD_TIMEOUT_MS;
    billingAppLoadRetryDelaysMs = BILLING_APP_LOAD_RETRY_DELAYS_MS;
    billingAppIframeSrcSetAt = null;
    billingAppIframeLoadFired = false;

    _loadListenerAttachedTo = null;

    constructor() {
        super(...arguments);

        if (this.config.hostSettings?.billing?.url) {
            window.addEventListener('message', (event) => {
                if (event && event.data && event.data.route) {
                    this.handleRouteChangeInIframe(event.data.route);
                }
            });
        }
    }

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

    startBillingAppLoadMonitor() {
        if (this.billingAppLoadTimeout || this.billingAppRetryTimeout) {
            return;
        }

        if (this.billingAppLoaded || this.billingAppLoadFailureReported) {
            this.billingAppLoaded = false;
            this.billingAppLoadAttempts = 0;
            this.billingAppLoadFailureReported = false;
        }

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
                this.reloadBillingIframe();
                this.startBillingAppLoadMonitor();
            }, retryDelay);
            return;
        }

        this.reportBillingAppLoadFailure();
    }

    setBillingIframeSrc() {
        const iframe = this.getBillingIframe();
        if (!iframe) {
            return;
        }
        if (this._loadListenerAttachedTo !== iframe && typeof iframe.addEventListener === 'function') {
            iframe.addEventListener('load', () => {
                this.billingAppIframeLoadFired = true;
            });
            this._loadListenerAttachedTo = iframe;
        }
        this.billingAppIframeLoadFired = false;
        this.billingAppIframeSrcSetAt = Date.now();
        iframe.src = this.getIframeURL();
    }

    reloadBillingIframe() {
        const iframe = this.getBillingIframe();

        if (!iframe || this.billingAppLoaded) {
            return;
        }

        this.setBillingIframeSrc();
    }

    markBillingAppLoaded() {
        this.billingAppLoaded = true;
        this.clearBillingAppLoadMonitor();
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

    reportBillingAppLoadFailure() {
        if (this.billingAppLoadFailureReported) {
            return;
        }

        this.billingAppLoadFailureReported = true;

        if (!this.config.sentry_dsn) {
            return;
        }

        const iframe = this.getBillingIframe();
        const visibilityState = document.visibilityState;

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
                        has_billing_url: !!this.config.hostSettings?.billing?.url,
                        is_force_upgrade: !!this.config.hostSettings?.forceUpgrade,
                        location_hash: window.location.hash,
                        retry_delays_ms: this.billingAppLoadRetryDelaysMs,
                        document_visibility_state: visibilityState,
                        iframe_offset_parent_visible: iframe ? iframe.offsetParent !== null : null,
                        iframe_computed_display: computedDisplay,
                        iframe_computed_visibility: computedVisibility,
                        iframe_rect_width: rectWidth,
                        iframe_rect_height: rectHeight,
                        iframe_load_fired: this.billingAppIframeLoadFired,
                        ms_since_src_set: this.billingAppIframeSrcSetAt ? Date.now() - this.billingAppIframeSrcSetAt : null,
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
                route: this.router.currentRouteName,
                path: window.location.hash
            }
        });
    }

    getIframeURL() {
        // initiate getting owner user in the background
        this.getOwnerUser();

        let url = this.config.hostSettings?.billing?.url;

        if (window.location.hash && window.location.hash.includes(this.billingRouteRoot)) {
            let destinationRoute = window.location.hash.replace(this.billingRouteRoot, '');

            if (destinationRoute) {
                url += destinationRoute;
            }
        }

        return url;
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
