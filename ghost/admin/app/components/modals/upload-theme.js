import ModalComponent from 'ghost-admin/components/modals/base';
import computed, {mapBy, or} from 'ember-computed';
import {invokeAction} from 'ember-invoke-action';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import {
    UnsupportedMediaTypeError,
    isThemeValidationError
} from 'ghost-admin/services/ajax';
import {isBlank} from 'ember-utils';
import run from 'ember-runloop';
import injectService from 'ember-service/inject';

export default ModalComponent.extend({

    accept: ['application/zip', 'application/x-zip-compressed'],
    availableThemes: null,
    closeDisabled: false,
    file: null,
    theme: false,
    displayOverwriteWarning: false,

    eventBus: injectService(),

    hideUploader: or('theme', 'displayOverwriteWarning'),

    uploadUrl: computed(function () {
        return `${ghostPaths().apiRoot}/themes/upload/`;
    }),

    themeName: computed('theme.{name,package.name}', function () {
        let t = this.get('theme');

        return t.package ? `${t.package.name} - ${t.package.version}` : t.name;
    }),

    availableThemeNames: mapBy('model.availableThemes', 'name'),

    fileThemeName: computed('file', function () {
        let file = this.get('file');
        return file.name.replace(/\.zip$/, '');
    }),

    canActivateTheme: computed('theme', function () {
        let theme = this.get('theme');
        return theme && !theme.active;
    }),

    actions: {
        validateTheme(file) {
            let accept = this.get('accept');
            let themeName = file.name.replace(/\.zip$/, '');
            let availableThemeNames = this.get('availableThemeNames');

            this.set('file', file);

            if (!isBlank(accept) && file && accept.indexOf(file.type) === -1) {
                return new UnsupportedMediaTypeError();
            }

            if (file.name.match(/^casper\.zip$/i)) {
                return {errors: [{message: 'Sorry, the default Casper theme cannot be overwritten.<br>Please rename your zip file and try again.'}]};
            }

            if (!this._allowOverwrite && availableThemeNames.includes(themeName)) {
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
            this.set('theme', response.themes[0]);
            // invoke the passed in confirm action
            invokeAction(this, 'model.uploadSuccess', this.get('theme'));
        },

        uploadFailed(error) {
            if (isThemeValidationError(error)) {
                this.set('validationErrors', error.errors[0].errorDetails);
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
            this.set('validationErrors', null);
        }
    }
});
