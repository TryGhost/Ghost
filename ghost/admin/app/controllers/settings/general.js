import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import generatePassword from 'ghost-admin/utils/password-generator';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {TrackedObject} from 'tracked-built-ins';
import {run} from '@ember/runloop';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

function randomPassword() {
    let word = generatePassword(6);
    let randomN = Math.floor(Math.random() * 1000);

    return word + randomN;
}

@classic
export default class GeneralController extends Controller {
    @service config;
    @service ghostPaths;
    @service notifications;
    @service session;
    @service settings;
    @service frontend;
    @service ui;

    @tracked scratchValues = new TrackedObject();

    availableTimezones = null;
    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;

    @computed('config.blogUrl', 'settings.publicHash')
    get privateRSSUrl() {
        let blogUrl = this.get('config.blogUrl');
        let publicHash = this.get('settings.publicHash');

        return `${blogUrl}/${publicHash}/rss`;
    }

    @action
    save() {
        this.saveTask.perform();
    }

    @action
    setTimezone(timezone) {
        this.set('settings.timezone', timezone.name);
    }

    @action
    removeImage(image) {
        // setting `null` here will error as the server treats it as "null"
        this.settings.set(image, '');
    }

    /**
     * Opens a file selection dialog - Triggered by "Upload Image" buttons,
     * searches for the hidden file input within the .gh-setting element
     * containing the clicked button then simulates a click
     * @param  {MouseEvent} event - MouseEvent fired by the button click
     */
    @action
    triggerFileDialog(event) {
        event?.target.closest('.gh-setting-action')?.querySelector('input[type="file"]')?.click();
    }

    /**
     * Fired after an image upload completes
     * @param  {string} property - Property name to be set on `this.settings`
     * @param  {UploadResult[]} results - Array of UploadResult objects
     * @return {string} The URL that was set on `this.settings.property`
     */
    @action
    imageUploaded(property, results) {
        if (results[0]) {
            return this.settings.set(property, results[0].url);
        }
    }

    @action
    toggleIsPrivate(isPrivate) {
        let settings = this.settings;

        settings.set('isPrivate', isPrivate);
        settings.get('errors').remove('password');

        let changedAttrs = settings.changedAttributes();

        // set a new random password when isPrivate is enabled
        if (isPrivate && changedAttrs.isPrivate) {
            settings.set('password', randomPassword());

        // reset the password when isPrivate is disabled
        } else if (changedAttrs.password) {
            settings.set('password', changedAttrs.password[0]);
        }
    }

    @action
    setScratchValue(property, value) {
        this.scratchValues[property] = value;
    }

    clearScratchValues() {
        this.scratchValues = new TrackedObject();
    }

    _deleteTheme() {
        let theme = this.store.peekRecord('theme', this.themeToDelete.name);

        if (!theme) {
            return;
        }

        return theme.destroyRecord().catch((error) => {
            this.notifications.showAPIError(error);
        });
    }

    @task
    *saveTask() {
        let notifications = this.notifications;
        let config = this.config;

        try {
            let changedAttrs = this.settings.changedAttributes();
            let settings = yield this.settings.save();

            this.clearScratchValues();

            config.set('blogTitle', settings.get('title'));

            if (changedAttrs.password) {
                this.frontend.loginIfNeeded();
            }

            // this forces the document title to recompute after a blog title change
            this.ui.updateDocumentTitle();

            return settings;
        } catch (error) {
            if (error) {
                notifications.showAPIError(error, {key: 'settings.save'});
            }
            throw error;
        }
    }

    @action
    saveViaKeyboard(event) {
        event.preventDefault();

        // trigger any set-on-blur actions
        const focusedElement = document.activeElement;
        focusedElement?.blur();

        // schedule save for when set-on-blur actions have finished
        run.schedule('actions', this, function () {
            focusedElement?.focus();
            this.saveTask.perform();
        });
    }
}
