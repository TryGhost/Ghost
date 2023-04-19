import Controller from '@ember/controller';
import config from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

const JS_EXTENSION = ['js'];
const JS_MIME_TYPE = ['application/javascript'];
export default class PinturaController extends Controller {
    @service notifications;
    @service settings;
    @tracked routesSuccess;
    @tracked routesFailure;

    constructor() {
        super(...arguments);
        this.jsExtension = JS_EXTENSION;
        this.jsMimeType = JS_MIME_TYPE;
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
    async fileUploadStarted() {
        this.routesSuccess = null;
        this.routesFailure = null;
    }

    @action
    async fileUploadCompleted([uploadedFile]) {
        if (!uploadedFile || !uploadedFile.url && !uploadedFile.fileName) {
            this.routesSuccess = false;
            this.routesFailure = true;
            return; // upload failed
        }
        this.routesSuccess = true;
        this.routesFailure = false;

        window.setTimeout(() => {
            this.routesSuccess = null;
            this.routesFailure = null;
        }, config.environment === 'test' ? 100 : 5000);

        // Save the uploaded file url to the settings
        this.settings.pinturaJsUrl = uploadedFile.url;
    }

    @action
    fileUploadFailed() {
        this.routesSuccess = null;
        this.routesFailure = null;
    }

    @action
    update(value) {
        this.settings.pintura = value;
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
