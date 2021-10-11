import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsDesignAdvancedRoute extends AuthenticatedRoute {
    @service store;

    model() {
        this.store.findAll('theme');
    }
}
