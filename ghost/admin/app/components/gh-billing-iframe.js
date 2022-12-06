import Component from '@glimmer/component';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class GhBillingIframe extends Component {
    @service ajax;
    @service billing;
    @service ghostPaths;
    @service notifications;
    @service session;

    @inject config;

    @tracked isOwner = null;

    willDestroy() {
        super.willDestroy(...arguments);
        window.removeEventListener('message', this.handleIframeMessage);
    }

    @action
    setup() {
        this.billing.getBillingIframe().src = this.billing.getIframeURL();
        window.addEventListener('message', this.handleIframeMessage);
    }

    @action
    async handleIframeMessage(event) {
        if (this.isDestroyed || this.isDestroying) {
            return;
        }

        // only process messages coming from the billing iframe
        if (event?.data && this.billing.getIframeURL().includes(event?.origin)) {
            if (event.data?.request === 'token') {
                this._handleTokenRequest();
            }

            if (event.data?.request === 'forceUpgradeInfo') {
                this._handleForceUpgradeRequest();
            }

            if (event.data?.subscription) {
                this._handleSubscriptionUpdate(event.data);
            }
        }
    }

    _handleTokenRequest() {
        const handleNoPermission = () => {
            // no permission means the current user requesting the token is not the owner of the site.
            this.isOwner = false;

            // Avoid letting the BMA waiting for a message and send an empty token response instead
            this.billing.getBillingIframe().contentWindow.postMessage({
                request: 'token',
                response: null
            }, '*');
        };

        if (!this.session.user?.isOwnerOnly) {
            handleNoPermission();
            return;
        }

        const ghostIdentityUrl = this.ghostPaths.url.api('identities');
        this.ajax.request(ghostIdentityUrl).then((response) => {
            const token = response?.identities?.[0]?.token;
            this.billing.getBillingIframe().contentWindow.postMessage({
                request: 'token',
                response: token
            }, '*');

            this.isOwner = true;
        }).catch((error) => {
            if (error.payload?.errors?.[0]?.type === 'NoPermissionError') {
                handleNoPermission();
            } else {
                throw error;
            }
        });
    }

    _handleForceUpgradeRequest() {
        // Send BMA requested information about forceUpgrade and owner name/email
        let ownerUser = null;
        const owner = this.billing.ownerUser;

        if (owner) {
            ownerUser = {
                name: owner?.name,
                email: owner?.email
            };
        }
        this.billing.getBillingIframe().contentWindow.postMessage({
            request: 'forceUpgradeInfo',
            response: {
                forceUpgrade: this.config.hostSettings?.forceUpgrade,
                isOwner: this.isOwner,
                ownerUser
            }
        }, '*');
    }

    _handleSubscriptionUpdate(data) {
        this.billing.subscription = data.subscription;
        this.billing.checkoutRoute = data?.checkoutRoute ?? '/plans';

        if (data.subscription.status === 'active' && this.config.hostSettings?.forceUpgrade) {
            // config might not be updated after a subscription has been set to active.
            // Until then assume the forceUpgrade is over and the subscription
            // was activated successfully.
            this.config.hostSettings.forceUpgrade = false;
        }

        // Detect if the current subscription is in a grace state and render a notification
        if (data.subscription.status === 'past_due' || data.subscription.status === 'unpaid') {
            // This notification needs to be shown to every user regardless their permissions to see billing
            this.notifications.showAlert('Billing error: This site is queued for suspension. The owner of this site must update payment information.', {type: 'error', key: 'billing.overdue'});
        } else {
            this.notifications.closeAlerts('billing.overdue');
        }
        // Detect if the current member limits are exceeded and render a notification
        if (
            data?.exceededLimits
            && data?.exceededLimits.length
            && data?.exceededLimits.indexOf('members') >= 0
            && data?.checkoutRoute
        ) {
            // The action param will be picked up on a transition from the router and can
            // then send the destination route as a message to the BMA, which then handles the redirect.
            const checkoutAction = this.billing.billingRouteRoot + '?action=checkout';

            this.notifications.showAlert(htmlSafe(`Your audience has grown! To continue publishing, the site owner must confirm pricing for this number of members <a href="${checkoutAction}">here</a>`), {type: 'warn', key: 'billing.exceeded'});
        } else {
            this.notifications.closeAlerts('billing.exceeded');
        }
    }
}
