/* eslint-disable ghost/ember/alias-model-in-controller */
import $ from 'jquery';
import Controller from '@ember/controller';
import NavigationItem from 'ghost-admin/models/navigation-item';
import RSVP from 'rsvp';
import {
    IMAGE_EXTENSIONS,
    IMAGE_MIME_TYPES
} from 'ghost-admin/components/gh-image-uploader';
import {computed} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const ICON_EXTENSIONS = ['ico', 'png'];

export default Controller.extend({
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
    newNavItem: null,
    newSecondaryNavItem: null,
    
    init() {
        this._super(...arguments);
        this.set('newNavItem', NavigationItem.create({isNew: true}));
        this.set('newSecondaryNavItem', NavigationItem.create({isNew: true, isSecondary: true}));
        this.iconExtensions = ICON_EXTENSIONS;
    },

    colorPickerValue: computed('settings.accentColor', function () {
        return this.get('settings.accentColor') || '#ffffff';
    }),

    accentColor: computed('settings.accentColor', function () {
        let color = this.get('settings.accentColor');
        if (color && color[0] === '#') {
            return color.slice(1);
        }
        return color;
    }),

    blogUrl: computed('config.blogUrl', function () {
        let url = this.get('config.blogUrl');

        return url.slice(-1) !== '/' ? `${url}/` : url;
    }),

    actions: {
        save() {
            this.save.perform();
        },

        addNavItem(item) {
            // If the url sent through is blank (user never edited the url)
            if (item.get('url') === '') {
                item.set('url', '/');
            }

            return item.validate().then(() => {
                this.addNewNavItem(item);
            });
        },

        deleteNavItem(item) {
            if (!item) {
                return;
            }

            let navItems = item.isSecondary ? this.get('settings.secondaryNavigation') : this.get('settings.navigation');

            navItems.removeObject(item);
            this.set('dirtyAttributes', true);
        },

        updateLabel(label, navItem) {
            if (!navItem) {
                return;
            }

            if (navItem.get('label') !== label) {
                navItem.set('label', label);
                this.set('dirtyAttributes', true);
            }
        },

        updateUrl(url, navItem) {
            if (!navItem) {
                return;
            }

            if (navItem.get('url') !== url) {
                navItem.set('url', url);
                this.set('dirtyAttributes', true);
            }

            return url;
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

        reset() {
            this.set('newNavItem', NavigationItem.create({isNew: true}));
            this.set('newSecondaryNavItem', NavigationItem.create({isNew: true, isSecondary: true}));
        },

        removeImage(image) {
            // setting `null` here will error as the server treats it as "null"
            this.settings.set(image, '');
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
                .closest('.gh-setting-action')
                .find('input[type="file"]')
                .click();
        },

        /**
         * Fired after an image upload completes
         * @param  {string} property - Property name to be set on `this.settings`
         * @param  {UploadResult[]} results - Array of UploadResult objects
         * @return {string} The URL that was set on `this.settings.property`
         */
        imageUploaded(property, results) {
            if (results[0]) {
                return this.settings.set(property, results[0].url);
            }
        },

        updateAccentColor(color) {
            this._validateAccentColor(color);
        },

        validateAccentColor() {
            this._validateAccentColor(this.get('accentColor'));
        }
    },

    save: task(function* () {
        let navItems = this.get('settings.navigation');
        let secondaryNavItems = this.get('settings.secondaryNavigation');

        let notifications = this.notifications;
        let validationPromises = [];

        if (!this.newNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addNavItem', this.newNavItem));
        }

        if (!this.newSecondaryNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addNavItem', this.newSecondaryNavItem));
        }

        navItems.map((item) => {
            validationPromises.pushObject(item.validate());
        });

        secondaryNavItems.map((item) => {
            validationPromises.pushObject(item.validate());
        });

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

    _validateAccentColor(color) {
        let newColor = color;
        let oldColor = this.get('settings.accentColor');
        let errMessage = '';

        // reset errors and validation
        this.get('settings.errors').remove('accentColor');
        this.get('settings.hasValidated').removeObject('accentColor');

        if (newColor === '') {
            // Clear out the accent color
            run.schedule('afterRender', this, function () {
                this.settings.set('accentColor', '');
                this.set('accentColor', '');
            });
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
            this.set('settings.accentColor', '');
            run.schedule('afterRender', this, function () {
                this.set('settings.accentColor', newColor);
                this.set('accentColor', newColor.slice(1));
            });
        } else {
            errMessage = 'The color should be in valid hex format';
            this.get('settings.errors').add('accentColor', errMessage);
            this.get('settings.hasValidated').pushObject('accentColor');
            return;
        }
    },

    addNewNavItem(item) {
        let navItems = item.isSecondary ? this.get('settings.secondaryNavigation') : this.get('settings.navigation');

        item.set('isNew', false);
        navItems.pushObject(item);
        this.set('dirtyAttributes', true);

        if (item.isSecondary) {
            this.set('newSecondaryNavItem', NavigationItem.create({isNew: true, isSecondary: true}));
            $('.gh-blognav-container:last .gh-blognav-line:last input:first').focus();
        } else {
            this.set('newNavItem', NavigationItem.create({isNew: true}));
            $('.gh-blognav-container:first .gh-blognav-line:last input:first').focus();
        }
    }
});
