import AdminRoute from 'ghost-admin/routes/admin';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class ChangeThemeRoute extends AdminRoute {
    @service store;

    model() {
        return this.store.findAll('theme');
    }

    @action
    willTransition() {
        this.controllerFor('settings.design.change-theme').reset();
    }
}
