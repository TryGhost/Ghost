/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import config from 'ghost-admin/config/environment';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default Controller.extend({
    ghostPaths: service(),

    selectedApiKey: null,
    isApiKeyRegenerated: false,

    init() {
        this._super(...arguments);
        if (this.isTesting === undefined) {
            this.isTesting = config.environment === 'test';
        }
    },

    integration: alias('model'),

    apiUrl: computed(function () {
        let origin = window.location.origin;
        let subdir = this.ghostPaths.subdir;
        let url = this.ghostPaths.url.join(origin, subdir);

        return url.replace(/\/$/, '');
    }),

    regeneratedKeyType: computed('isApiKeyRegenerated', 'selectedApiKey', function () {
        if (this.isApiKeyRegenerated) {
            return this.get('selectedApiKey.type');
        }
        return null;
    }),

    actions: {
        confirmRegenerateKeyModal(apiKey) {
            this.set('showRegenerateKeyModal', true);
            this.set('isApiKeyRegenerated', false);
            this.set('selectedApiKey', apiKey);
        },

        cancelRegenerateKeyModal() {
            this.set('showRegenerateKeyModal', false);
        },

        regenerateKey() {
            this.set('isApiKeyRegenerated', true);
        }
    },

    copyAdminKey: task(function* () {
        copyTextToClipboard(this.integration.adminKey.secret);
        yield timeout(this.isTesting ? 50 : 3000);
    }),

    copyApiUrl: task(function* () {
        copyTextToClipboard(this.apiUrl);
        yield timeout(this.isTesting ? 50 : 3000);
    })
});
