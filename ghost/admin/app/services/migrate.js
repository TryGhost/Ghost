import Service, {inject as service} from '@ember/service';
import {SignJWT} from 'jose';
import {tracked} from '@glimmer/tracking';

export default class MigrateService extends Service {
    @service ajax;
    @service router;
    @service ghostPaths;
    @service settings;

    migrateUrl = 'https://migrate.ghost.org';
    migrateRouteRoot = '#/migrate';

    @tracked migrateWindowOpen = false;
    @tracked siteData = null;
    @tracked previousRoute = null;
    @tracked isIframeTransition = false;

    get apiUrl() {
        const origin = window.location.origin;
        const subdir = this.ghostPaths.subdir;
        const rootURL = this.router.rootURL;
        let url = this.ghostPaths.url.join(origin, subdir, rootURL);
        url = url.replace(/\/$/, ''); // Strips the trailing slash
        return url;
    }

    async apiToken() {
        // TODO: Getting the token can be improved
        const ghostIntegrationsUrl = this.ghostPaths.url.api('integrations') + '?include=api_keys';
        return this.ajax.request(ghostIntegrationsUrl).then(async (response) => {
            const ssmIntegration = response.integrations.find(r => r.slug === 'self-serve-migration');

            const key = ssmIntegration.api_keys[0].secret;
            const [id, secret] = key.split(':');

            function hexToBytes(hex) {
                let bytes = [];
                for (let c = 0; c < hex.length; c += 2) {
                    bytes.push(parseInt(hex.substr(c, 2), 16));
                }
                return new Uint8Array(bytes);
            }

            const encodedSecret = hexToBytes(secret);

            const token = await new SignJWT({})
                .setProtectedHeader({
                    alg: 'HS256',
                    typ: 'JWT',
                    kid: id
                })
                .setIssuedAt()
                .setExpirationTime('5m')
                .setAudience('/admin/')
                .sign(encodedSecret);

            return token;
        }).catch((error) => {
            throw error;
        });
    }

    get isStripeConnected() {
        return (this.settings.stripeConnectAccountId && this.settings.stripeConnectPublishableKey && this.settings.stripeConnectLivemode) ? true : false;
    }

    constructor() {
        super(...arguments);
    }

    getIframeURL() {
        let url = this.migrateUrl;

        return url;
    }

    // Sends a route update to a child route in the BMA, because we can't control
    // navigating to it otherwise
    sendRouteUpdate(route) {
        this.getMigrateIframe().contentWindow.postMessage({
            query: 'routeUpdate',
            response: route
        }, '*');
    }

    // Controls migrate window modal visibility and sync of the URL visible in browser
    // and the URL opened on the iframe. It is responsible to non user triggered iframe opening,
    // for example: by entering "/migrate" route in the URL or using history navigation (back and forward)
    toggleMigrateWindow(value) {
        if (this.migrateWindowOpen && value) {
            // don't attempt to open again
            return;
        }
        this.migrateWindowOpen = value;
    }

    // Controls navigation to migrate window modal which is triggered from the application UI.
    // For example: pressing "View migrate" link in navigation menu. It's main side effect is
    // remembering the route from which the action has been triggered - "previousRoute" so it
    // could be reused when closing the migrate window
    openMigrateWindow(currentRoute, childRoute) {
        if (this.migrateWindowOpen) {
            // don't attempt to open again
            return;
        }

        this.previousRoute = currentRoute;

        // Ensures correct "getIframeURL" calculation when syncing iframe location
        // in toggleMigrateWindow
        window.location.hash = childRoute || '/migrate';

        this.router.transitionTo(childRoute || '/migrate');
        this.toggleMigrateWindow(true);
    }

    getMigrateIframe() {
        return document.getElementById('migrate-frame');
    }
}
