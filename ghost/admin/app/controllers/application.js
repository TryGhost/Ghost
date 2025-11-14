import Controller from '@ember/controller';
import {action} from '@ember/object';
import {getOwner} from '@ember/application';
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
    @service ghostPaths;
    @service ajax;
    @service store;

    @inject config;

    get modalDestinationElement() {
        const owner = getOwner(this);
        const app = owner.lookup('application:main');
        let rootElement = app.rootElement || 'body';

        if (typeof rootElement === 'string') {
            rootElement = document.querySelector(rootElement);
        }

        return document.getElementById('ember-modal-wormhole') || rootElement;
    }

    get showBilling() {
        return this.config.hostSettings?.billing?.enabled;
    }

    get showUpdateBanner() {
        return this.config.hostSettings?.update?.enabled
            && this.config.hostSettings.update.url
            && this.config.version.startsWith('5.');
    }

    get ownerUserNameOrEmail() {
        let user = this.store.peekAll('user').findBy('isOwnerOnly', true);

        if (user) {
            if (user.name) {
                return user.name;
            } else if (user.email) {
                return user.email;
            }
        }

        return null;
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

    @action
    async openUpdateTab() {
        if (!this.showUpdateBanner) {
            return;
        }

        const updateWindow = window.open('', '_blank');

        updateWindow.document.write('Loading...');

        const updateUrl = new URL(this.config.hostSettings.update.url);
        const ghostIdentityUrl = this.ghostPaths.url.api('identities');

        try {
            const response = await this.ajax.request(ghostIdentityUrl);
            const token = response?.identities?.[0]?.token;

            if (!token) {
                updateWindow.document.write('Error: Unable to load update page');
                return;
            }

            updateUrl.searchParams.append('jwt', token);
            updateWindow.location.href = updateUrl.toString();
        } catch (error) {
            updateWindow.document.write('Error: Unable to load update page');
            return;
        }
    }
}
