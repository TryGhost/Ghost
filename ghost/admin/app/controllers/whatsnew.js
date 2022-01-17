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

    get databaseWarning() {
        const isProduction = !!this.config.get('environment').match?.(/production/i);
        const isPro = !!this.config.get('hostSettings')?.siteId;
        const database = this.config.get('database');

        // Show a warning if we're in production and not using MySQL 8
        if (isProduction && !isPro && database !== 'mysql8') {
            return 'MySQL 8 will be the required database in the next major release of Ghost.';
        }

        // Show a warning if we're in development and using MySQL 5
        if (!isProduction && !isPro && database === 'mysql5') {
            return 'MySQL 5 will no longer be supported in the next major release of Ghost.';
        }

        return false;
    }
}
