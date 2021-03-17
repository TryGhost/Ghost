/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

export default class ApplicationController extends Controller {
    @service billing;
    @service customViews;
    @service config;
    @service dropdown;
    @service router;
    @service session;
    @service settings;
    @service ui;

    get showBilling() {
        return this.config.get('hostSettings.billing.enabled');
    }

    get showNavMenu() {
        // if we're in fullscreen mode don't show the nav menu
        if (this.ui.isFullScreen) {
            return false;
        }

        // we need to defer showing the navigation menu until the session.user
        // promise has fulfilled so that gh-user-can-admin has the correct data
        if (!this.session.isAuthenticated || !this.session.user.isFulfilled) {
            return false;
        }

        return (this.router.currentRouteName !== 'error404' || this.session.isAuthenticated)
                && !this.router.currentRouteName.match(/(signin|signup|setup|reset)/);
    }
}
