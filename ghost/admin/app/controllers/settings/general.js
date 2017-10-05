import $ from 'jquery';
import Controller from '@ember/controller';
import randomPassword from 'ghost-admin/utils/random-password';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {computed} from '@ember/object';
import {inject as injectService} from '@ember/service';
import {observer} from '@ember/object';
import {run} from '@ember/runloop';
import {task} from 'ember-concurrency';

export default Controller.extend({
    config: injectService(),
    ghostPaths: injectService(),
    notifications: injectService(),
    session: injectService(),

    availableTimezones: null,
    iconExtensions: ['ico', 'png'],
    iconMimeTypes: 'image/png,image/x-icon',
    imageExtensions: IMAGE_EXTENSIONS,
    imageMimeTypes: IMAGE_MIME_TYPES,

    _scratchFacebook: null,
    _scratchTwitter: null,

    isDatedPermalinks: computed('model.permalinks', {
        set(key, value) {
            this.set('model.permalinks', value ? '/:year/:month/:day/:slug/' : '/:slug/');

            let slugForm = this.get('model.permalinks');
            return slugForm !== '/:slug/';
        },

        get() {
            let slugForm = this.get('model.permalinks');

            return slugForm !== '/:slug/';
        }
    }),

    generatePassword: observer('model.isPrivate', function () {
        this.get('model.errors').remove('password');
        if (this.get('model.isPrivate') && this.get('model.hasDirtyAttributes')) {
            this.get('model').set('password', randomPassword());
        }
    }),

    privateRSSUrl: computed('config.blogUrl', 'model.publicHash', function () {
        let blogUrl = this.get('config.blogUrl');
        let publicHash = this.get('model.publicHash');

        return `${blogUrl}/${publicHash}/rss`;
    }),

    _deleteTheme() {
        let theme = this.get('store').peekRecord('theme', this.get('themeToDelete').name);

        if (!theme) {
            return;
        }

        return theme.destroyRecord().catch((error) => {
            this.get('notifications').showAPIError(error);
        });
    },

    save: task(function* () {
        let notifications = this.get('notifications');
        let config = this.get('config');

        try {
            let model = yield this.get('model').save();
            config.set('blogTitle', model.get('title'));

            // this forces the document title to recompute after
            // a blog title change
            this.send('collectTitleTokens', []);

            return model;

        } catch (error) {
            if (error) {
                notifications.showAPIError(error, {key: 'settings.save'});
            }
            throw error;
        }
    }),

    actions: {
        save() {
            this.get('save').perform();
        },

        setTimezone(timezone) {
            this.set('model.activeTimezone', timezone.name);
        },

        removeImage(image) {
            // setting `null` here will error as the server treats it as "null"
            this.get('model').set(image, '');
        },

        /**
         * Opens a file selection dialog - Triggered by "Upload Image" buttons,
         * searches for the hidden file input within the .gh-setting element
         * containing the clicked button then simulates a click
         * @param  {MouseEvent} event - MouseEvent fired by the button click
         */
        triggerFileDialog(event) {
            let fileInput = $(event.target)
                .closest('.gh-setting')
                .find('input[type="file"]');

            if (fileInput.length > 0) {
                // reset file input value before clicking so that the same image
                // can be selected again
                fileInput.val('');

                // simulate click to open file dialog
                // using jQuery because IE11 doesn't support MouseEvent
                $(fileInput).click();
            }
        },

        /**
         * Fired after an image upload completes
         * @param  {string} property - Property name to be set on `this.model`
         * @param  {UploadResult[]} results - Array of UploadResult objects
         * @return {string} The URL that was set on `this.model.property`
         */
        imageUploaded(property, results) {
            if (results[0]) {
                // Note: We have to reset the file input after upload, otherwise you can't upload the same image again
                // See https://github.com/thefrontside/emberx-file-input/blob/master/addon/components/x-file-input.js#L37
                // See https://github.com/TryGhost/Ghost/issues/8545
                $('.x-file--input').val('');
                return this.get('model').set(property, results[0].url);
            }
        },

        toggleLeaveSettingsModal(transition) {
            let leaveTransition = this.get('leaveSettingsTransition');

            if (!transition && this.get('showLeaveSettingsModal')) {
                this.set('leaveSettingsTransition', null);
                this.set('showLeaveSettingsModal', false);
                return;
            }

            if (!leaveTransition || transition.targetName === leaveTransition.targetName) {
                this.set('leaveSettingsTransition', transition);

                // if a save is running, wait for it to finish then transition
                if (this.get('save.isRunning')) {
                    return this.get('save.last').then(() => {
                        transition.retry();
                    });
                }

                // we genuinely have unsaved data, show the modal
                this.set('showLeaveSettingsModal', true);
            }
        },

        leaveSettings() {
            let transition = this.get('leaveSettingsTransition');
            let model = this.get('model');

            if (!transition) {
                this.get('notifications').showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // roll back changes on model props
            model.rollbackAttributes();

            return transition.retry();
        },

        validateFacebookUrl() {
            let newUrl = this.get('_scratchFacebook');
            let oldUrl = this.get('model.facebook');
            let errMessage = '';

            if (newUrl === '') {
                // Clear out the Facebook url
                this.set('model.facebook', '');
                this.get('model.errors').remove('facebook');
                return;
            }

            // _scratchFacebook will be null unless the user has input something
            if (!newUrl) {
                newUrl = oldUrl;
            }

            // If new url didn't change, exit
            if (newUrl === oldUrl) {
                this.get('model.errors').remove('facebook');
                return;
            }

            if (newUrl.match(/(?:facebook\.com\/)(\S+)/) || newUrl.match(/([a-z\d.]+)/i)) {
                let username = [];

                if (newUrl.match(/(?:facebook\.com\/)(\S+)/)) {
                    [, username] = newUrl.match(/(?:facebook\.com\/)(\S+)/);
                } else {
                    [, username] = newUrl.match(/(?:https:\/\/|http:\/\/)?(?:www\.)?(?:\w+\.\w+\/+)?(\S+)/mi);
                }

                // check if we have a /page/username or without
                if (username.match(/^(?:\/)?(pages?\/\S+)/mi)) {
                    // we got a page url, now save the username without the / in the beginning

                    [, username] = username.match(/^(?:\/)?(pages?\/\S+)/mi);
                } else if (username.match(/^(http|www)|(\/)/) || !username.match(/^([a-z\d.]{1,50})$/mi)) {
                    errMessage = !username.match(/^([a-z\d.]{1,50})$/mi) ? 'Your Page name is not a valid Facebook Page name' : 'The URL must be in a format like https://www.facebook.com/yourPage';

                    this.get('model.errors').add('facebook', errMessage);
                    this.get('model.hasValidated').pushObject('facebook');
                    return;
                }

                newUrl = `https://www.facebook.com/${username}`;

                this.get('model.errors').remove('facebook');
                this.get('model.hasValidated').pushObject('facebook');

                this.set('model.facebook', '');
                run.schedule('afterRender', this, function () {
                    this.set('model.facebook', newUrl);
                });
            } else {
                errMessage = 'The URL must be in a format like '
                           + 'https://www.facebook.com/yourPage';
                this.get('model.errors').add('facebook', errMessage);
                this.get('model.hasValidated').pushObject('facebook');
                return;
            }
        },

        validateTwitterUrl() {
            let newUrl = this.get('_scratchTwitter');
            let oldUrl = this.get('model.twitter');
            let errMessage = '';

            if (newUrl === '') {
                // Clear out the Twitter url
                this.set('model.twitter', '');
                this.get('model.errors').remove('twitter');
                return;
            }

            // _scratchTwitter will be null unless the user has input something
            if (!newUrl) {
                newUrl = oldUrl;
            }

            // If new url didn't change, exit
            if (newUrl === oldUrl) {
                this.get('model.errors').remove('twitter');
                return;
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

                    this.get('model.errors').add('twitter', errMessage);
                    this.get('model.hasValidated').pushObject('twitter');
                    return;
                }

                newUrl = `https://twitter.com/${username}`;

                this.get('model.errors').remove('twitter');
                this.get('model.hasValidated').pushObject('twitter');

                this.set('model.twitter', '');
                run.schedule('afterRender', this, function () {
                    this.set('model.twitter', newUrl);
                });
            } else {
                errMessage = 'The URL must be in a format like '
                           + 'https://twitter.com/yourUsername';
                this.get('model.errors').add('twitter', errMessage);
                this.get('model.hasValidated').pushObject('twitter');
                return;
            }
        }
    }
});
