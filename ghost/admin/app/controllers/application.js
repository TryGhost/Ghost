import Controller from '@ember/controller';
import {inject} from 'ghost-admin/decorators/inject';
import {action, computed} from '@ember/object';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default class ApplicationController extends Controller {
    @service billing;
    @service explore;
    @service router;
    @service session;
    @service settings;
    @service ui;

    @inject config;

    @reads('config.hostSettings.update.enabled')
        showUpdateLink;

    get showBilling() {
        return this.config.hostSettings?.billing?.enabled;
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

    @action
    openUpdateTab() {
        const updateWindow = window.open('', '_blank');

        updateWindow.document.write('Loading...');

        const updateUrl = new URL(this.config.get('hostSettings.update.url'));
        const ghostIdentityUrl = this.ghostPaths.url.api('identities');

        this.ajax.request(ghostIdentityUrl).then((response) => {
            const token = response?.identities?.[0]?.token;
            updateUrl.searchParams.append('jwt', token);
            updateWindow.location.href = updateUrl.toString();
        });
    }
}
