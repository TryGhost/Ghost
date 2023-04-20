import Controller from '@ember/controller';
import config from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const JS_EXTENSION = ['js'];
const JS_MIME_TYPE = ['application/javascript'];
const CSS_EXTENSION = ['css'];
const CSS_MIME_TYPE = ['text/css'];
export default class PinturaController extends Controller {
    @service notifications;
    @service settings;
    @service utils;

    @inject config;

    @tracked jsSuccess;
    @tracked jsFailure;
    @tracked cssSuccess;
    @tracked cssFailure;

    get showUploadSettings() {
        return this.settings.pintura && !this.config.pintura;
    }

    constructor() {
        super(...arguments);
        this.jsExtension = JS_EXTENSION;
        this.jsMimeType = JS_MIME_TYPE;
        this.jsAccept = [...this.jsMimeType, ...Array.from(this.jsExtension, extension => '.' + extension)];
        this.cssExtension = CSS_EXTENSION;
        this.cssMimeType = CSS_MIME_TYPE;
        this.cssAccept = [...this.cssMimeType, ...Array.from(this.cssExtension, extension => '.' + extension)];
    }

    /**
     * Opens a file selection dialog - Triggered by "Upload x" buttons,
     * searches for the hidden file input within the .gh-setting element
     * containing the clicked button then simulates a click
     * @param  {MouseEvent} event - MouseEvent fired by the button click
     */
    @action
    triggerFileDialog(event) {
        // simulate click to open file dialog
        event?.target.closest('.gh-setting-action')?.querySelector('input[type="file"]')?.click();
    }

    @action
    async fileUploadCompleted(fileType, [uploadedFile]) {
        let successKey = `${fileType}Success`;
        let failureKey = `${fileType}Failure`;

        if (!uploadedFile || !uploadedFile.url && !uploadedFile.fileName) {
            this[successKey] = false;
            this[failureKey] = true;
            return; // upload failed
        }
        this[successKey] = true;
        this[failureKey] = false;

        window.setTimeout(() => {
            this[successKey] = null;
            this[failureKey] = null;
        }, config.environment === 'test' ? 100 : 5000);

        // Save the uploaded file url to the settings
        if (fileType === 'js') {
            this.settings.pinturaJsUrl = uploadedFile.url;
        } else if (fileType === 'css') {
            this.settings.pinturaCssUrl = uploadedFile.url;
        }
    }

    @action
    update(event) {
        this.settings.pintura = event.target.checked;
    }

    @action
    save() {
        this.saveTask.perform();
    }

    @task({drop: true})
    *saveTask() {
        try {
            yield this.settings.validate();
            return yield this.settings.save();
        } catch (error) {
            this.notifications.showAPIError(error);
            throw error;
        }
    }
}
