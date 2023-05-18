import Controller from '@ember/controller';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class ApplicationController extends Controller {
    @service billing;
    @service explore;
    @service router;
    @service session;
    @service settings;
    @service ui;
    @service upgradeStatus;

    @inject config;

    get showBilling() {
        return this.config.hostSettings?.billing?.enabled;
    }

    get showScriptExtension() {
        const {session} = this;

        if (!session.isAuthenticated || !session.user) {
            return false;
        }

        return this.config.clientExtensions?.script;
    }

    get showNavMenu() {
        let {router, session, ui} = this;

        // if we're in fullscreen mode don't show the nav menu
        if (ui.isFullScreen) {
            return false;
        }

        // we need to defer showing the navigation menu until the session.user
        // is populated so that gh-user-can-admin has the correct data
        if (!session.isAuthenticated || !session.user) {
            return false;
        }

        return (router.currentRouteName !== 'error404' || session.isAuthenticated)
                && !router.currentRouteName.match(/(signin|signup|setup|reset)/);
    }
}
