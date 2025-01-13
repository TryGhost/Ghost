import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsXRoute extends AuthenticatedRoute {
    @service session;
    @service feature;
    @service ui;
    @service modals;

    activate() {
        super.activate(...arguments);
        this.ui.set('isFullScreen', true);
    }

    deactivate() {
        super.deactivate(...arguments);
        this.ui.set('isFullScreen', false);
    }

    buildRouteInfoMetadata() {
        return {
            bodyClasses: ['gh-body-fullscreen']
        };
    }
}
