import Component from '@glimmer/component';
import {isThemeValidationError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class InstallThemeModal extends Component {
    @service ajax;
    @service ghostPaths;
    @service store;
    @service themeManagement;

    @tracked installedTheme = null;
    @tracked installError = '';
    @tracked validationWarnings = [];
    @tracked validationErrors = [];
    @tracked fatalValidationErrors = [];

    themes = this.store.peekAll('theme');

    constructor() {
        super(...arguments);
        this.refreshThemesTask.perform();
    }

    get themeName() {
        return this.args.data.theme?.name || this.args.data.ref.split('/')[1];
    }

    get themeRef() {
        return this.args.data.theme?.ref || this.args.data.ref;
    }

    get isDefaultTheme() {
        return this.themeName.toLowerCase() === 'casper';
    }

    get isConfirming() {
        return !this.installSuccess && !this.installError && !this.installFailure;
    }

    get installSuccess() {
        return !!this.installedTheme;
    }

    get installFailure() {
        return !this.installSuccess && (this.validationErrors.length || this.fatalValidationErrors.length);
    }

    get willOverwriteExisting() {
        return !this.isDefaultTheme && this.themes.findBy('name', this.themeName.toLowerCase());
    }

    get hasWarningsOrErrors() {
        return this.validationWarnings.length > 0 || this.validationErrors.length > 0;
    }

    get shouldShowInstall() {
        return !this.installSuccess && !this.installFailure;
    }

    @task
    *refreshThemesTask() {
        yield this.store.findAll('theme', {reload: true});
    }

    @task
    *installThemeTask() {
        try {
            if (this.isDefaultTheme) {
                // default theme can't be installed, only activated
                const defaultTheme = this.store.peekRecord('theme', 'casper');
                yield this.themeManagement.activateTask.perform(defaultTheme, {skipErrors: true});
                this.installedTheme = defaultTheme;

                // let modal opener do any other background stuff
                this.args.data.onSuccess?.();

                return true;
            }

            const url = this.ghostPaths.url.api('themes/install') + `?source=github&ref=${this.themeRef}`;
            const result = yield this.ajax.post(url);

            this.installError = '';

            if (result.themes) {
                // show theme in list immediately
                this.store.pushPayload(result);

                this.installedTheme = this.store.peekRecord('theme', result.themes[0].name);

                this.validationWarnings = this.installedTheme.warnings || [];
                this.validationErrors = this.installedTheme.errors || [];
                this.fatalValidationErrors = [];

                // activate but prevent additional error modal from showing
                yield this.themeManagement.activateTask.perform(this.installedTheme, {skipErrors: true});

                // let modal opener do any other background stuff
                this.args.data.onSuccess?.();

                return true;
            }
        } catch (error) {
            if (isThemeValidationError(error)) {
                this.resetErrors();

                let errors = error.payload.errors[0].details.errors;
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

                this.fatalValidationErrors = fatalErrors;
                this.validationErrors = normalErrors;

                return false;
            }

            if (error.payload?.errors) {
                this.installError = error.payload.errors[0].message;
                return false;
            }

            this.installError = error.message;
            throw error;
        }
    }
}
