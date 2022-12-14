import Controller from '@ember/controller';
import RegenerateKeyModal from '../../../components/settings/integrations/regenerate-key-modal';
import config from 'ghost-admin/config/environment';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class ZapierController extends Controller {
    @service ghostPaths;
    @service modals;

    @tracked regeneratedApiKey = null;

    constructor() {
        super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    }

    get integration() {
        return this.model;
    }

    get apiUrl() {
        let origin = window.location.origin;
        let subdir = this.ghostPaths.subdir;
        let url = this.ghostPaths.url.join(origin, subdir);

        return url.replace(/\/$/, '');
    }

    @action
    async confirmRegenerateKey(apiKey, event) {
        event?.preventDefault();
        this.regeneratedApiKey = null;
        this.regeneratedApiKey = await this.modals.open(RegenerateKeyModal, {
            apiKey,
            integration: this.integration,
            internalIntegration: 'zapier'
        });
    }

    @task
    *copyAdminKeyTask(event) {
        event?.preventDefault();
        copyTextToClipboard(this.integration.adminKey.secret);
        yield timeout(this.isTesting ? 50 : 3000);
    }

    @task
    *copyApiUrlTask(event) {
        event?.preventDefault();
        copyTextToClipboard(this.apiUrl);
        yield timeout(this.isTesting ? 50 : 3000);
    }
}
