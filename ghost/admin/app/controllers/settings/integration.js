import Controller from '@ember/controller';
import DeleteIntegrationModal from '../../components/settings/integrations/delete-integration-modal';
import DeleteWebhookModal from '../../components/settings/integrations/delete-webhook-modal';
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
    @service modals;

    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    @tracked showRegenerateKeyModal = false;
    @tracked selectedApiKey = null;
    @tracked isApiKeyRegenerated = false;

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
    confirmIntegrationDeletion(event) {
        event?.preventDefault();
        return this.modals.open(DeleteIntegrationModal, {
            integration: this.integration
        });
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
        return this.modals.open(DeleteWebhookModal, {webhook});
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
