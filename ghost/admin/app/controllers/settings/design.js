/* eslint-disable ghost/ember/alias-model-in-controller */
import $ from 'jquery';
import Controller from '@ember/controller';
import NavigationItem from 'ghost-admin/models/navigation-item';
import RSVP from 'rsvp';
import {computed} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {isThemeValidationError} from 'ghost-admin/services/ajax';
import {notEmpty} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    dirtyAttributes: false,
    newNavItem: null,
    themes: null,
    themeToDelete: null,

    init() {
        this._super(...arguments);
        this.set('newNavItem', NavigationItem.create({isNew: true}));
    },

    showDeleteThemeModal: notEmpty('themeToDelete'),

    blogUrl: computed('config.blogUrl', function () {
        let url = this.get('config.blogUrl');

        return url.slice(-1) !== '/' ? `${url}/` : url;
    }),

    actions: {
        save() {
            this.save.perform();
        },

        addNavItem() {
            let newNavItem = this.newNavItem;

            // If the url sent through is blank (user never edited the url)
            if (newNavItem.get('url') === '') {
                newNavItem.set('url', '/');
            }

            return newNavItem.validate().then(() => {
                this.addNewNavItem();
            });
        },

        deleteNavItem(item) {
            if (!item) {
                return;
            }

            let navItems = this.get('settings.navigation');

            navItems.removeObject(item);
            this.set('dirtyAttributes', true);
        },

        updateLabel(label, navItem) {
            if (!navItem) {
                return;
            }

            navItem.set('label', label);
            this.set('dirtyAttributes', true);
        },

        updateUrl(url, navItem) {
            if (!navItem) {
                return;
            }

            navItem.set('url', url);
            this.set('dirtyAttributes', true);

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

        activateTheme(theme) {
            return theme.activate().then((theme) => {
                if (!isEmpty(theme.get('warnings'))) {
                    this.set('themeWarnings', theme.get('warnings'));
                    this.set('showThemeWarningsModal', true);
                }

                if (!isEmpty(theme.get('errors'))) {
                    this.set('themeErrors', theme.get('errors'));
                    this.set('showThemeWarningsModal', true);
                }
            }).catch((error) => {
                if (isThemeValidationError(error)) {
                    let errors = error.payload.errors[0].details.errors;
                    let fatalErrors = [];
                    let normalErrors = [];

                    // to have a proper grouping of fatal errors and none fatal, we need to check
                    // our errors for the fatal property
                    if (errors.length > 0) {
                        for (let i = 0; i < errors.length; i += 1) {
                            if (errors[i].fatal) {
                                fatalErrors.push(errors[i]);
                            } else {
                                normalErrors.push(errors[i]);
                            }
                        }
                    }

                    this.set('themeErrors', normalErrors);
                    this.set('themeFatalErrors', fatalErrors);
                    this.set('showThemeErrorsModal', true);
                    return;
                }

                throw error;
            });
        },

        downloadTheme(theme) {
            let downloadURL = `${this.get('ghostPaths.apiRoot')}/themes/${theme.name}/download/`;
            let iframe = $('#iframeDownload');

            if (iframe.length === 0) {
                iframe = $('<iframe>', {id: 'iframeDownload'}).hide().appendTo('body');
            }

            iframe.attr('src', downloadURL);
        },

        deleteTheme(theme) {
            if (theme) {
                return this.set('themeToDelete', theme);
            }

            return this._deleteTheme();
        },

        hideDeleteThemeModal() {
            this.set('themeToDelete', null);
        },

        hideThemeWarningsModal() {
            this.set('themeWarnings', null);
            this.set('themeErrors', null);
            this.set('themeFatalErrors', null);
            this.set('showThemeWarningsModal', false);
            this.set('showThemeErrorsModal', false);
        },

        reset() {
            this.set('newNavItem', NavigationItem.create({isNew: true}));
        }
    },

    save: task(function* () {
        let navItems = this.get('settings.navigation');
        let newNavItem = this.newNavItem;
        let notifications = this.notifications;
        let validationPromises = [];

        if (!newNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addNavItem'));
        }

        navItems.map((item) => {
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

    addNewNavItem() {
        let navItems = this.get('settings.navigation');
        let newNavItem = this.newNavItem;

        newNavItem.set('isNew', false);
        navItems.pushObject(newNavItem);
        this.set('dirtyAttributes', true);
        this.set('newNavItem', NavigationItem.create({isNew: true}));
        $('.gh-blognav-line:last input:first').focus();
    },

    _deleteTheme() {
        let theme = this.store.peekRecord('theme', this.themeToDelete.name);

        if (!theme) {
            return;
        }

        return theme.destroyRecord().then(() => {
            // HACK: this is a private method, we need to unload from the store
            // here so that uploading another theme with the same "id" doesn't
            // attempt to update the deleted record
            theme.unloadRecord();
        }).catch((error) => {
            this.notifications.showAPIError(error);
        });
    }
});
