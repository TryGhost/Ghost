import Component from '@glimmer/component';
import {
    UnsupportedMediaTypeError,
    isThemeValidationError
} from 'ghost-admin/services/ajax';
import {action} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class UploadThemeModal extends Component {
    @service eventBus;
    @service ghostPaths;
    @service store;
    @service themeManagement;

    static modalOptions = {
        beforeClose: () => {
            if (this.themeManagement.isUploading) {
                return false;
            }
        }
    };

    @tracked displayOverwriteWarning = false;
    @tracked file;
    @tracked theme;
    @tracked validationErrors;
    @tracked validationWarnings;
    @tracked fatalValidationErrors;

    accept = ['application/zip', 'application/x-zip-compressed'];
    extensions = ['zip'];

    get themes() {
        return this.store.peekAll('theme');
    }

    get currentThemeNames() {
        return this.themes.map(theme => theme.name);
    }

    get themeName() {
        let themePackage = this.theme.package;
        let name = this.theme.name;

        return themePackage ? `${themePackage.name} - ${themePackage.version}` : name;
    }

    get fileThemeName() {
        return this.file?.name.replace(/\.zip$/, '');
    }

    get canActivateTheme() {
        return this.theme && !this.theme.active;
    }

    get uploadUrl() {
        return `${this.ghostPaths.apiRoot}/themes/upload/`;
    }

    get hasWarningsOrErrors() {
        return this.validationWarnings?.length || this.validationErrors?.length;
    }

    get closeDisabled() {
        return this.themeManagement.isUploading;
    }

    constructor() {
        super(...arguments);
        this.refreshThemesTask.perform();
    }

    @task
    *refreshThemesTask() {
        yield this.store.findAll('theme');
    }

    @action
    validateTheme(file) {
        const themeName = file.name.replace(/\.zip$/, '').replace(/[^\w@.]/gi, '-').toLowerCase();

        this.file = file;

        const [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);
        const extensions = this.extensions;

        if (!extension || extensions.indexOf(extension.toLowerCase()) === -1) {
            return new UnsupportedMediaTypeError();
        }

        if (file.name.match(/^casper\.zip$/i)) {
            return {payload: {errors: [{message: 'Sorry, the default Casper theme cannot be overwritten.<br>Please rename your zip file to continue.'}]}};
        }

        if (!this._allowOverwrite && this.currentThemeNames.includes(themeName)) {
            this.displayOverwriteWarning = true;
            return false;
        }

        return true;
    }

    @action
    confirmOverwrite() {
        this._allowOverwrite = true;
        this.displayOverwriteWarning = false;

        // we need to schedule afterRender so that the upload component is
        // displayed again in order to subscribe/respond to the event bus
        run.schedule('afterRender', this, function () {
            this.eventBus.publish('themeUploader:upload', this.file);
        });
    }

    @action
    uploadSuccess(response) {
        this.store.pushPayload(response);

        const theme = this.store.peekRecord('theme', response.themes[0].name);

        this.theme = theme;

        if (theme.warnings?.length > 0) {
            this.validationWarnings = theme.warnings;
        }

        // Ghost differentiates between errors and fatal errors
        // You can't activate a theme with fatal errors, but with errors.
        if (theme.gscanErrors?.length > 0) {
            this.validationErrors = theme.gscanErrors;
        }
    }

    @action
    uploadFailed(errorResponse) {
        if (isThemeValidationError(errorResponse)) {
            const errors = errorResponse.payload.errors[0].details.errors;
            const fatalErrors = [];
            const normalErrors = [];

            // to have a proper grouping of fatal errors and none fatal, we need to check
            // our errors for the fatal property
            errors.forEach?.((error) => {
                if (error.fatal) {
                    fatalErrors.push(error);
                } else {
                    normalErrors.push(error);
                }
            });

            this.fatalValidationErrors = fatalErrors;
            this.validationErrors = normalErrors;
            this.validationWarnings = errorResponse.payload.errors[0].details.warnings || [];
        }
    }

    @action
    activate() {
        this.themeManagement.activateTask.perform(this.theme);
        this.args.data.onActivationSuccess?.();
        this.args.close();
    }

    @action
    reset() {
        this.theme = null;
        this.validationWarnings = [];
        this.validationErrors = [];
        this.fatalValidationErrors = [];
    }
}
