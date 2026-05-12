import Controller from '@ember/controller';
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

    get showScriptExtension() {
        const {session} = this;

        if (!session.isAuthenticated || !session.user) {
            return false;
        }

        return this.config.clientExtensions?.script;
    }
}
