import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import generatePassword from 'ghost-admin/utils/password-generator';
import validator from 'validator';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {task} from 'ember-concurrency';

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

    availableTimezones = null;
    imageExtensions = IMAGE_EXTENSIONS;
    imageMimeTypes = IMAGE_MIME_TYPES;
    _scratchFacebook = null;
    _scratchTwitter = null;

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
    toggleLeaveSettingsModal(transition) {
        let leaveTransition = this.leaveSettingsTransition;

        if (!transition && this.showLeaveSettingsModal) {
            this.set('leaveSettingsTransition', null);
            this.set('showLeaveSettingsModal', false);
            return;
        }

        if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
            this.set('leaveSettingsTransition', transition);

            // if a save is running, wait for it to finish then transition
            if (this.saveTask.isRunning) {
                return this.saveTask.last.then(() => {
                    transition.retry();
                });
            }

            // we genuinely have unsaved data, show the modal
            this.set('showLeaveSettingsModal', true);
        }
    }

    @action
    leaveSettings() {
        let transition = this.leaveSettingsTransition;
        let settings = this.settings;

        if (!transition) {
            this.notifications.showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
            return;
        }

        // roll back changes on settings props
        settings.rollbackAttributes();

        return transition.retry();
    }

    @action
    validateFacebookUrl() {
        let newUrl = this._scratchFacebook;
        let oldUrl = this.get('settings.facebook');
        let errMessage = '';

        // reset errors and validation
        this.get('settings.errors').remove('facebook');
        this.get('settings.hasValidated').removeObject('facebook');

        if (newUrl === '') {
            // Clear out the Facebook url
            this.set('settings.facebook', '');
            return;
        }

        // _scratchFacebook will be null unless the user has input something
        if (!newUrl) {
            newUrl = oldUrl;
        }

        try {
            // strip any facebook URLs out
            newUrl = newUrl.replace(/(https?:\/\/)?(www\.)?facebook\.com/i, '');

            // don't allow any non-facebook urls
            if (newUrl.match(/^(http|\/\/)/i)) {
                throw 'invalid url';
            }

            // strip leading / if we have one then concat to full facebook URL
            newUrl = newUrl.replace(/^\//, '');
            newUrl = `https://www.facebook.com/${newUrl}`;

            // don't allow URL if it's not valid
            if (!validator.isURL(newUrl)) {
                throw 'invalid url';
            }

            this.settings.set('facebook', newUrl);
            this.settings.notifyPropertyChange('facebook');
        } catch (e) {
            if (e === 'invalid url') {
                errMessage = 'The URL must be in a format like '
                           + 'https://www.facebook.com/yourPage';
                this.get('settings.errors').add('facebook', errMessage);
                return;
            }

            throw e;
        } finally {
            this.get('settings.hasValidated').pushObject('facebook');
        }
    }

    @action
    validateTwitterUrl() {
        let newUrl = this._scratchTwitter;
        let oldUrl = this.get('settings.twitter');
        let errMessage = '';

        // reset errors and validation
        this.get('settings.errors').remove('twitter');
        this.get('settings.hasValidated').removeObject('twitter');

        if (newUrl === '') {
            // Clear out the Twitter url
            this.set('settings.twitter', '');
            return;
        }

        // _scratchTwitter will be null unless the user has input something
        if (!newUrl) {
            newUrl = oldUrl;
        }

        if (newUrl.match(/(?:twitter\.com\/)(\S+)/) || newUrl.match(/([a-z\d.]+)/i)) {
            let username = [];

            if (newUrl.match(/(?:twitter\.com\/)(\S+)/)) {
                [, username] = newUrl.match(/(?:twitter\.com\/)(\S+)/);
            } else {
                [username] = newUrl.match(/([^/]+)\/?$/mi);
            }

            // check if username starts with http or www and show error if so
            if (username.match(/^(http|www)|(\/)/) || !username.match(/^[a-z\d._]{1,15}$/mi)) {
                errMessage = !username.match(/^[a-z\d._]{1,15}$/mi) ? 'Your Username is not a valid Twitter Username' : 'The URL must be in a format like https://twitter.com/yourUsername';

                this.get('settings.errors').add('twitter', errMessage);
                this.get('settings.hasValidated').pushObject('twitter');
                return;
            }

            newUrl = `https://twitter.com/${username}`;

            this.settings.get('hasValidated').pushObject('twitter');
            this.settings.set('twitter', newUrl);
            this.settings.notifyPropertyChange('twitter');
        } else {
            errMessage = 'The URL must be in a format like '
                       + 'https://twitter.com/yourUsername';
            this.get('settings.errors').add('twitter', errMessage);
            this.get('settings.hasValidated').pushObject('twitter');
            return;
        }
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

    @task(function* () {
        let notifications = this.notifications;
        let config = this.config;

        if (this.settings.get('twitter') !== this._scratchTwitter) {
            this.send('validateTwitterUrl');
        }

        if (this.settings.get('facebook') !== this._scratchFacebook) {
            this.send('validateFacebookUrl');
        }

        try {
            let changedAttrs = this.settings.changedAttributes();
            let settings = yield this.settings.save();
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
    })
        saveTask;
}
