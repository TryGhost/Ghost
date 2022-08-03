import classic from 'ember-classic-decorator';
import {computed} from '@ember/object';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';

@classic
export default class ApplicationController extends Controller {
    @service billing;
    @service config;
    @service dropdown;
    @service feature;
    @service router;
    @service session;
    @service settings;
    @service ui;

    @reads('config.hostSettings.billing.enabled')
        showBilling;

    @computed(
        'router.currentRouteName',
        'session.{isAuthenticated,user}',
        'ui.isFullScreen'
    )
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
