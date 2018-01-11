import ModalComponent from 'ghost-admin/components/modal-base';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {
    UnsupportedMediaTypeError,
    isThemeValidationError
} from 'ghost-admin/services/ajax';
import {computed} from '@ember/object';
import {get} from '@ember/object';
import {invokeAction} from 'ember-invoke-action';
import {mapBy, or} from '@ember/object/computed';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

const DEFAULTS = {
    accept: ['application/zip', 'application/x-zip-compressed'],
    extensions: ['zip']
};

export default ModalComponent.extend({
    eventBus: service(),
    store: service(),

    accept: null,
    extensions: null,
    themes: null,
    closeDisabled: false,
    file: null,
    theme: false,
    displayOverwriteWarning: false,

    hideUploader: or('theme', 'displayOverwriteWarning'),
    currentThemeNames: mapBy('model.themes', 'name'),

    uploadUrl: computed(function () {
        return `${ghostPaths().apiRoot}/themes/upload/`;
    }),

    themeName: computed('theme.{name,package.name}', function () {
        let themePackage = this.get('theme.package');
        let name = this.get('theme.name');

        return themePackage ? `${themePackage.name} - ${themePackage.version}` : name;
    }),

    fileThemeName: computed('file', function () {
        let file = this.get('file');
        return file.name.replace(/\.zip$/, '');
    }),

    canActivateTheme: computed('theme', function () {
        let theme = this.get('theme');
        return theme && !theme.get('active');
    }),

    init() {
        this._super(...arguments);

        this.accept = this.accept || DEFAULTS.accept;
        this.extensions = this.extensions || DEFAULTS.extensions;
    },

    actions: {
        validateTheme(file) {
            let themeName = file.name.replace(/\.zip$/, '').replace(/[^\w@.]/gi, '-').toLowerCase();

            let currentThemeNames = this.get('currentThemeNames');

            this.set('file', file);

            let [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);
            let extensions = this.get('extensions');

            if (!extension || extensions.indexOf(extension.toLowerCase()) === -1) {
                return new UnsupportedMediaTypeError();
            }

            if (file.name.match(/^casper\.zip$/i)) {
                return {payload: {errors: [{message: 'Sorry, the default Casper theme cannot be overwritten.<br>Please rename your zip file and try again.'}]}};
            }

            if (!this._allowOverwrite && currentThemeNames.includes(themeName)) {
                this.set('displayOverwriteWarning', true);
                return false;
            }

            return true;
        },

        confirmOverwrite() {
            this._allowOverwrite = true;
            this.set('displayOverwriteWarning', false);

            // we need to schedule afterRender so that the upload component is
            // displayed again in order to subscribe/respond to the event bus
            run.schedule('afterRender', this, function () {
                this.get('eventBus').publish('themeUploader:upload', this.get('file'));
            });
        },

        uploadStarted() {
            this.set('closeDisabled', true);
        },

        uploadFinished() {
            this.set('closeDisabled', false);
        },

        uploadSuccess(response) {
            this.get('store').pushPayload(response);

            let theme = this.get('store').peekRecord('theme', response.themes[0].name);

            this.set('theme', theme);

            if (get(theme, 'warnings.length') > 0) {
                this.set('validationWarnings', get(theme, 'warnings'));
            }

            // Ghost differentiates between errors and fatal errors
            // You can't activate a theme with fatal errors, but with errors.
            if (get(theme, 'errors.length') > 0) {
                this.set('validationErrors', get(theme, 'errors'));
            }

            this.set('hasWarningsOrErrors', this.get('validationErrors.length') || this.get('validationWarnings.length'));

            // invoke the passed in confirm action
            invokeAction(this, 'model.uploadSuccess', theme);
        },

        uploadFailed(error) {
            if (isThemeValidationError(error)) {
                let errors = error.payload.errors[0].errorDetails;
                let fatalErrors = [];
                let normalErrors = [];

                // to have a proper grouping of fatal errors and none fatal, we need to check
                // our errors for the fatal property
                if (errors && errors.length > 0) {
                    for (let i = 0; i < errors.length; i += 1) {
                        if (errors[i].fatal) {
                            fatalErrors.push(errors[i]);
                        } else {
                            normalErrors.push(errors[i]);
                        }
                    }
                }

                this.set('fatalValidationErrors', fatalErrors);
                this.set('validationErrors', normalErrors);
            }
        },

        confirm() {
            // noop - we don't want the enter key doing anything
        },

        activate() {
            invokeAction(this, 'model.activate', this.get('theme'));
            invokeAction(this, 'closeModal');
        },

        closeModal() {
            if (!this.get('closeDisabled')) {
                this._super(...arguments);
            }
        },

        reset() {
            this.set('validationWarnings', []);
            this.set('validationErrors', []);
            this.set('fatalValidationErrors', []);
            this.set('hasWarningsOrErrors', false);
        }
    }
});
