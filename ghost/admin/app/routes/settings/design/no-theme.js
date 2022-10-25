import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsDesignNoThemeRoute extends AuthenticatedRoute {
    @service store;

    themes = this.store.peekAll('theme');

    afterModel() {
        super.afterModel(...arguments);
        let activeTheme = this.themes.findBy('active', true);
        if (typeof activeTheme !== 'undefined') {
            return this.transitionTo('settings.design.index');
        }
    }
}
