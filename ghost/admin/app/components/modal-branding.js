/* eslint-disable ghost/ember/alias-model-in-controller */
import $ from 'jquery';
import ModalComponent from 'ghost-admin/components/modal-base';
import RSVP from 'rsvp';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {timeout} from 'ember-concurrency';

const ICON_EXTENSIONS = ['ico', 'png'];

export default ModalComponent.extend({
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    imageExtensions: IMAGE_EXTENSIONS,
    imageMimeTypes: IMAGE_MIME_TYPES,
    iconExtensions: null,
    iconMimeTypes: 'image/png,image/x-icon',

    dirtyAttributes: false,

    previewGuid: (new Date()).valueOf(),

    accentColorPickerValue: computed('settings.accentColor', function () {
        return this.get('settings.accentColor') || '#ffffff';
    }),

    accentColor: computed('settings.accentColor', function () {
        let color = this.get('settings.accentColor');
        if (color && color[0] === '#') {
            return color.slice(1);
        }
        return color;
    }),

    accentColorBgStyle: computed(function () {
        return htmlSafe(`background-color: ${this.accentColorPickerValue}`);
    }),

    init() {
        this._super(...arguments);
        this.iconExtensions = ICON_EXTENSIONS;
        this.refreshPreview();
    },

    actions: {
        save() {
            this.save.perform();
        },

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
                if (this.save.isRunning) {
                    return this.save.last.then(() => {
                        transition.retry();
                    });
                }

                // we genuinely have unsaved data, show the modal
                this.set('showLeaveSettingsModal', true);
            }
        },

        leaveSettings() {
            let transition = this.leaveSettingsTransition;
            let settings = this.settings;

            if (!transition) {
                this.notifications.showAlert('Sorry, there was an error in the application. Please let the Ghost team know what happened.', {type: 'error'});
                return;
            }

            // roll back changes on settings props
            settings.rollbackAttributes();
            this.set('dirtyAttributes', false);

            return transition.retry();
        },

        reset() {},

        async removeImage(image) {
            // setting `null` here will error as the server treats it as "null"
            this.settings.set(image, '');
            await this.save.perform();
            this.refreshPreview();
        },

        /**
         * Opens a file selection dialog - Triggered by "Upload Image" buttons,
         * searches for the hidden file input within the .gh-setting element
         * containing the clicked button then simulates a click
         * @param  {MouseEvent} event - MouseEvent fired by the button click
         */
        triggerFileDialog(event) {
            // simulate click to open file dialog
            // using jQuery because IE11 doesn't support MouseEvent
            $(event.target)
                .closest('.gh-uploadbutton-container')
                .find('input[type="file"]')
                .click();
        },

        /**
         * Fired after an image upload completes
         * @param  {string} property - Property name to be set on `this.settings`
         * @param  {UploadResult[]} results - Array of UploadResult objects
         * @return {string} The URL that was set on `this.settings.property`
         */
        async imageUploaded(property, results) {
            if (results[0]) {
                let result = this.settings.set(property, results[0].url);
                await this.save.perform();
                this.refreshPreview();
                return result;
            }
        },

        updateAccentColor(event) {
            this._updateAccentColor(event);
        }
    },

    debounceUpdateAccentColor: task(function* (event) {
        yield timeout(500);
        this._updateAccentColor(event);
    }).restartable(),

    save: task(function* () {
        let notifications = this.notifications;
        let validationPromises = [];

        try {
            yield RSVP.all(validationPromises);
            this.set('dirtyAttributes', false);
            return yield this.settings.save();
        } catch (error) {
            if (error) {
                notifications.showAPIError(error);
                throw error;
            }
        }
    }),

    async _updateAccentColor(event) {
        let newColor = event.target.value;
        let oldColor = this.get('settings.accentColor');

        // reset errors and validation
        this.get('settings.errors').remove('accentColor');
        this.get('settings.hasValidated').removeObject('accentColor');

        if (newColor === '') {
            if (newColor === oldColor) {
                return;
            }

            // clear out the accent color
            this.settings.set('accentColor', '');
            await this.save.perform();
            this.refreshPreview();
            return;
        }

        // accentColor will be null unless the user has input something
        if (!newColor) {
            newColor = oldColor;
        }

        if (newColor[0] !== '#') {
            newColor = `#${newColor}`;
        }

        if (newColor.match(/#[0-9A-Fa-f]{6}$/)) {
            if (newColor === oldColor) {
                return;
            }

            this.set('settings.accentColor', newColor);
            await this.save.perform();
            this.refreshPreview();
        } else {
            this.get('settings.errors').add('accentColor', 'The colour should be in valid hex format');
            this.get('settings.hasValidated').pushObject('accentColor');
            return;
        }
    },

    refreshPreview() {
        this.set('previewGuid',(new Date()).valueOf());
    }
});