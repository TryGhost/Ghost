import Controller from '@ember/controller';
import config from 'ghost-admin/config/environment';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {action} from '@ember/object';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class IntegrationController extends Controller {
    @service config;
    @service ghostPaths;

    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    @tracked showDeleteIntegrationModal = false;
    @tracked showRegenerateKeyModal = false;
    @tracked showUnsavedChangesModal = false;
    @tracked selectedApiKey = null;
    @tracked isApiKeyRegenerated = false;
    @tracked webhookToDelete;

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

    get regeneratedKeyType() {
        if (this.isApiKeyRegenerated) {
            return this.selectedApiKey.type;
        }
        return null;
    }

    get allWebhooks() {
        return this.store.peekAll('webhook');
    }

    get filteredWebhooks() {
        return this.allWebhooks.filter((webhook) => {
            let matchesIntegration = webhook.belongsTo('integration').id() === this.integration.id;

            return matchesIntegration
                && !webhook.isNew
                && !webhook.isDeleted;
        });
    }

    get iconImageStyle() {
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
    }

    @action
    triggerIconFileDialog(event) {
        event.preventDefault();
        let input = document.querySelector('input[type="file"][name="iconImage"]');
        input.click();
    }

    @action
    updateProperty(property, event) {
        this.integration.set(property, event.target.value);
    }

    @action
    validateProperty(property) {
        this.integration.validate({property});
    }

    @action
    setIconImage([image]) {
        this.integration.set('iconImage', image.url);
    }

    @action
    save() {
        return this.saveTask.perform();
    }

    @action
    toggleUnsavedChangesModal(transition) {
        let leaveTransition = this.leaveScreenTransition;

        if (!transition && this.showUnsavedChangesModal) {
            this.leaveScreenTransition = null;
            this.showUnsavedChangesModal = false;
            return;
        }

        if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
            this.leaveScreenTransition = transition;

            // if a save is running, wait for it to finish then transition
            if (this.saveTask.isRunning) {
                return this.saveTask.last.then(() => {
                    transition.retry();
                });
            }

            // we genuinely have unsaved data, show the modal
            this.showUnsavedChangesModal = true;
        }
    }

    @action
    leaveScreen(event) {
        event?.preventDefault();
        let transition = this.leaveScreenTransition;

        if (!transition) {
            this.notifications.showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
            return;
        }

        // roll back changes on model props
        this.integration.rollbackAttributes();

        return transition.retry();
    }

    @action
    deleteIntegration(event) {
        event?.preventDefault();
        this.integration.destroyRecord();
    }

    @action
    confirmIntegrationDeletion(event) {
        event?.preventDefault();
        this.showDeleteIntegrationModal = true;
    }

    @action
    cancelIntegrationDeletion(event) {
        event?.preventDefault();
        this.showDeleteIntegrationModal = false;
    }

    @action
    confirmRegenerateKeyModal(apiKey, event) {
        event?.preventDefault();
        this.showRegenerateKeyModal = true;
        this.isApiKeyRegenerated = false;
        this.selectedApiKey = apiKey;
    }

    @action
    cancelRegenerateKeyModal(event) {
        event?.preventDefault();
        this.showRegenerateKeyModal = false;
    }

    @action
    regenerateKey(event) {
        event?.preventDefault();
        this.isApiKeyRegenerated = true;
    }

    @action
    confirmWebhookDeletion(webhook, event) {
        event?.preventDefault();
        this.webhookToDelete = webhook;
    }

    @action
    cancelWebhookDeletion(event) {
        event?.preventDefault();
        this.webhookToDelete = null;
    }

    @action
    deleteWebhook(event) {
        event?.preventDefault();
        return this.webhookToDelete.destroyRecord();
    }

    @task
    *saveTask() {
        try {
            return yield this.integration.save();
        } catch (e) {
            if (e === undefined) {
                // validation error
                return false;
            }

            throw e;
        }
    }

    @task
    *copyContentKey() {
        copyTextToClipboard(this.integration.contentKey.secret);
        yield timeout(this.isTesting ? 50 : 3000);
    }

    @task
    *copyAdminKey() {
        copyTextToClipboard(this.integration.adminKey.secret);
        yield timeout(this.isTesting ? 50 : 3000);
    }

    @task
    *copyApiUrl() {
        copyTextToClipboard(this.apiUrl);
        yield timeout(this.isTesting ? 50 : 3000);
    }
}
