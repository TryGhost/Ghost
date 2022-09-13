import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import {inject as service} from '@ember/service';

export default class AboutModal extends Component {
    @service config;
    @service upgradeStatus;

    constructor() {
        super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    }

    get copyrightYear() {
        const date = new Date();
        return date.getFullYear();
    }

    get linkToGitHubReleases() {
        // Don't link to GitHub Releases if the version contains the
        // pre-release identifier
        return !this.config.get('version').includes('-pre.');
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
