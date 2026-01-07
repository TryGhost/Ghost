import Component from '@glimmer/component';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
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
        try {
            const response = await this.migrate.postMessagePayload();

            this.migrate.getMigrateIframe().contentWindow.postMessage({
                request: 'initialData',
                response
            }, new URL(this.migrate.getIframeURL()).origin);
        } catch (err) {
            // Close the iframe so the user can see the notification
            this.migrate.closeMigrateWindow();
            this.notifications.showAlert(htmlSafe(`Error initialising migration. Please try again later.`), {type: 'error', key: 'migrate.iframe-postMessage.error'});
        }
    }

    _handleSiteDataUpdate(data) {
        this.migrate.siteData = data?.siteData ?? {};

        if (this.migrate.siteData?.migrationComplete) {
            // If we want to show a notification, this is where to do it
            // this.notifications.showAlert(htmlSafe(`Migration complete!`), {type: 'success', key: 'migrate.completed'}); // Green persistent banner at the top
        }
    }
}
