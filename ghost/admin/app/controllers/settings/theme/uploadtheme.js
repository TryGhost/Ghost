import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

export default class UploadThemeController extends Controller {
    @service config;

    get isAllowed() {
        return (!this.config.get('hostSettings')?.limits?.customThemes) || !this.config.get('hostSettings').limits.customThemes.disabled;
    }
}
