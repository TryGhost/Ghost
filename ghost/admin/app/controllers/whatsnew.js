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

    get showSystemInfo() {
        const isPro = !!this.config.get('hostSettings')?.siteId;

        // Don't show any system info for Pro
        if (isPro) {
            return false;
        }

        return true;
    }

    get showDatabaseWarning() {
        const isProduction = !!this.config.get('environment').match?.(/production/i);
        const database = this.config.get('database');

        // Show a warning if we're in production and not using MySQL 8
        if (isProduction && database !== 'mysql8') {
            return true;
        }

        // Show a warning if we're in development and using MySQL 5
        if (!isProduction && database === 'mysql5') {
            return true;
        }

        return false;
    }
}
