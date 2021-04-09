import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

export default class UploadThemeController extends Controller {
    @service limit;

    get isAllowed() {
        return !this.limit.limiter.isLimited('customThemes');
    }
}
