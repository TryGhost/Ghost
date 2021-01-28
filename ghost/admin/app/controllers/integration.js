import Controller from '@ember/controller';
import config from 'ghost-admin/config/environment';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

export default Controller.extend({
    config: service(),
    ghostPaths: service(),

    imageExtensions: IMAGE_EXTENSIONS,
    imageMimeTypes: IMAGE_MIME_TYPES,
    showRegenerateKeyModal: false,
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

    allWebhooks: computed(function () {
        return this.store.peekAll('webhook');
    }),

    filteredWebhooks: computed('integration.id', 'allWebhooks.@each.{isNew,isDeleted}', function () {
        return this.allWebhooks.filter((webhook) => {
            let matchesIntegration = webhook.belongsTo('integration').id() === this.integration.id;

            return matchesIntegration
                && !webhook.isNew
                && !webhook.isDeleted;
        });
    }),

    iconImageStyle: computed('integration.iconImage', function () {
        let url = this.integration.iconImage;
        if (url) {
            let styles = [
                `background-image: url(${url})`,
                'background-size: 50%',
                'background-position: 50%',
                'background-repeat: no-repeat'
            ];
            return htmlSafe(styles.join('; '));
        }

        return htmlSafe('');
    }),

    actions: {
        triggerIconFileDialog() {
            let input = document.querySelector('input[type="file"][name="iconImage"]');
            input.click();
        },

        setIconImage([image]) {
            this.integration.set('iconImage', image.url);
        },

        save() {
            return this.save.perform();
        },

        toggleUnsavedChangesModal(transition) {
            let leaveTransition = this.leaveScreenTransition;

            if (!transition && this.showUnsavedChangesModal) {
                this.set('leaveScreenTransition', null);
                this.set('showUnsavedChangesModal', false);
                return;
            }

            if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
                this.set('leaveScreenTransition', transition);

                // if a save is running, wait for it to finish then transition
                if (this.save.isRunning) {
                    return this.save.last.then(() => {
                        transition.retry();
                    });
                }

                // we genuinely have unsaved data, show the modal
                this.set('showUnsavedChangesModal', true);
            }
        },

        leaveScreen() {
            let transition = this.leaveScreenTransition;

            if (!transition) {
                this.notifications.showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // roll back changes on model props
            this.integration.rollbackAttributes();

            return transition.retry();
        },

        deleteIntegration() {
            this.integration.destroyRecord();
        },

        confirmIntegrationDeletion() {
            this.set('showDeleteIntegrationModal', true);
        },

        cancelIntegrationDeletion() {
            this.set('showDeleteIntegrationModal', false);
        },

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
        },

        confirmWebhookDeletion(webhook) {
            this.set('webhookToDelete', webhook);
        },

        cancelWebhookDeletion() {
            this.set('webhookToDelete', null);
        },

        deleteWebhook() {
            return this.webhookToDelete.destroyRecord();
        }
    },

    save: task(function* () {
        return yield this.integration.save();
    }),

    copyContentKey: task(function* () {
        copyTextToClipboard(this.integration.contentKey.secret);
        yield timeout(this.isTesting ? 50 : 3000);
    }),

    copyAdminKey: task(function* () {
        copyTextToClipboard(this.integration.adminKey.secret);
        yield timeout(this.isTesting ? 50 : 3000);
    }),

    copyApiUrl: task(function* () {
        copyTextToClipboard(this.apiUrl);
        yield timeout(this.isTesting ? 50 : 3000);
    })
});
