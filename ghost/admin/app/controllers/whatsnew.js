import Controller from '@ember/controller';
import {inject as service} from '@ember/service';

export default class WhatsNewController extends Controller {
    @service config;
    @service upgradeStatus;
    @service whatsNew;

    queryParams = ['entry'];

    get copyrightYear() {
        const date = new Date();
        return date.getFullYear();
    }

    get showDatabaseWarning() {
        const isProduction = !!this.config.get('environment').match?.(/production/i);
        const isPro = !!this.config.get('hostSettings')?.siteId;

        if (isProduction && !isPro) {
            return true;
        }

        return false;
    }
}
