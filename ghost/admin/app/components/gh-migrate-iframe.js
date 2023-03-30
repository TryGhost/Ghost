import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class GhMigrateIframe extends Component {
    @service migrate;
    @service router;
    @service feature;
    @service notifications;

    willDestroy() {
        super.willDestroy(...arguments);
        window.removeEventListener('message', this.handleIframeMessage);
    }

    @action
    setup() {
        this.migrate.getMigrateIframe().src = this.migrate.getIframeURL();
        window.addEventListener('message', this.handleIframeMessage);
    }

    @action
    async handleIframeMessage(event) {
        if (this.isDestroyed || this.isDestroying) {
            return;
        }

        // Only process messages coming from the migrate iframe
        const url = new URL(this.migrate.getIframeURL());
        if (event.origin === url.origin) {
            if (event.data?.request === 'apiUrl') {
                await this._handleUrlRequest();
                return;
            }

            if (event.data?.route) {
                this._handleRouteUpdate(event.data);
                return;
            }

            if (event.data?.siteData) {
                this._handleSiteDataUpdate(event.data);
                return;
            }
        }
    }

    // The iframe can send route updates to navigate to within Admin, as some routes
    // have to be rendered within the iframe and others require to break out of it.
    _handleRouteUpdate(data) {
        const route = data.route;
        this.migrate.isIframeTransition = route?.includes('/migrate');
        this.migrate.toggleMigrateWindow(this.migrate.isIframeTransition);
        this.router.transitionTo(route);
    }

    async _handleUrlRequest() {
        const theToken = await this.migrate.apiToken();

        this.migrate.getMigrateIframe().contentWindow.postMessage({
            request: 'initialData',
            response: {
                apiUrl: this.migrate.apiUrl,
                apiToken: theToken,
                darkMode: this.feature.nightShift,
                stripe: this.migrate.isStripeConnected
            }
        }, new URL(this.migrate.getIframeURL()).origin);
    }

    _handleSiteDataUpdate(data) {
        this.migrate.siteData = data?.siteData ?? {};

        if (this.migrate.siteData?.migrationComplete) {
            // If we want to show a notification, this is where to do it
            // this.notifications.showAlert(htmlSafe(`Migration complete!`), {type: 'success', key: 'migrate.completed'}); // Green persistent banner at the top
        }
    }
}
