/* eslint-disable ghost/ember/alias-model-in-controller */
import $ from 'jquery';
import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {isThemeValidationError} from 'ghost-admin/services/ajax';
import {notEmpty} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Controller.extend({
    config: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    dirtyAttributes: false,
    newNavItem: null,
    newSecondaryNavItem: null,
    themes: null,
    themeToDelete: null,

    init() {
        this._super(...arguments);
    },

    showDeleteThemeModal: notEmpty('themeToDelete'),

    blogUrl: computed('config.blogUrl', function () {
        let url = this.get('config.blogUrl');

        return url.slice(-1) !== '/' ? `${url}/` : url;
    }),

    actions: {
        activateTheme(theme) {
            return theme.activate().then((activatedTheme) => {
                if (!isEmpty(activatedTheme.get('warnings'))) {
                    this.set('themeWarnings', activatedTheme.get('warnings'));
                    this.set('showThemeWarningsModal', true);
                }

                if (!isEmpty(activatedTheme.get('errors'))) {
                    this.set('themeErrors', activatedTheme.get('errors'));
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

        reset() {}
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
