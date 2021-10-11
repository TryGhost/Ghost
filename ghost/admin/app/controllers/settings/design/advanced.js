import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

export default class AdvancedThemeSettingsController extends Controller {
    @service store;
    @service themeManagement;

    get themes() {
        return this.store.peekAll('theme');
    }
}
