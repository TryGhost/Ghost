import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {alias} from '@ember/object/computed';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import config from 'ghost-admin/config/environment';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {task, timeout} from 'ember-concurrency';

@classic
export default class ZapierController extends Controller {
    @service ghostPaths;

    selectedApiKey = null;
    isApiKeyRegenerated = false;

    init() {
        super.init(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    }

    @alias('model')
        integration;

    @computed
    get apiUrl() {
        let origin = window.location.origin;
        let subdir = this.ghostPaths.subdir;
        let url = this.ghostPaths.url.join(origin, subdir);

        return url.replace(/\/$/, '');
    }

    @computed('isApiKeyRegenerated', 'selectedApiKey')
    get regeneratedKeyType() {
        if (this.isApiKeyRegenerated) {
            return this.get('selectedApiKey.type');
        }
        return null;
    }

    @action
    confirmRegenerateKeyModal(apiKey) {
        this.set('showRegenerateKeyModal', true);
        this.set('isApiKeyRegenerated', false);
        this.set('selectedApiKey', apiKey);
    }

    @action
    cancelRegenerateKeyModal() {
        this.set('showRegenerateKeyModal', false);
    }

    @action
    regenerateKey() {
        this.set('isApiKeyRegenerated', true);
    }

    @task(function* () {
        copyTextToClipboard(this.integration.adminKey.secret);
        yield timeout(this.isTesting ? 50 : 3000);
    })
        copyAdminKey;

    @task(function* () {
        copyTextToClipboard(this.apiUrl);
        yield timeout(this.isTesting ? 50 : 3000);
    })
        copyApiUrl;
}
