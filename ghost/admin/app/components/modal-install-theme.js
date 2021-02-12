import ModalBase from 'ghost-admin/components/modal-base';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {isThemeValidationError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

// TODO: update modals to work fully with Glimmer components
@classic
export default class ModalInstallThemeComponent extends ModalBase {
    @service ajax;
    @service ghostPaths;
    @service store;

    @tracked model;
    @tracked theme;
    @tracked installError = '';
    @tracked validationWarnings = [];
    @tracked validationErrors = [];
    @tracked fatalValidationErrors = [];

    get themeName() {
        return this.model.ref.split('/')[1];
    }

    get currentThemeNames() {
        return this.model.themes.mapBy('name');
    }

    get willOverwriteDefault() {
        return this.themeName.toLowerCase() === 'casper';
    }

    get willOverwriteExisting() {
        return this.model.themes.findBy('name', this.themeName.toLowerCase());
    }

    get installSuccess() {
        return !!this.theme;
    }

    get installFailure() {
        return !this.installSuccess && (this.validationErrors.length || this.fatalValidationErrors.length);
    }

    get isReady() {
        return !this.installSuccess && !this.installError && !this.installFailure;
    }

    get hasWarningsOrErrors() {
        return this.validationWarnings.length > 0 || this.validationErrors.length > 0;
    }

    get shouldShowInstall() {
        return !this.installSuccess && !this.installFailure && !this.willOverwriteDefault;
    }

    get shouldShowActivate() {
        return this.installSuccess && !this.theme.active;
    }

    get hasActionButton() {
        return this.shouldShowInstall || this.shouldShowActivate;
    }

    @action
    close() {
        this.closeModal();
    }

    @action
    reset() {
        this.theme = null;
        this.resetErrors();
    }

    actions = {
        confirm() {
            // noop - needed to override ModalBase.actions.confirm
        },

        // needed because ModalBase uses .send() for keyboard events
        closeModal() {
            this.closeModal();
        }
    }

    @task({drop: true})
    *installTask() {
        try {
            const url = this.ghostPaths.url.api('themes/install') + `?source=github&ref=${this.model.ref}`;
            const result = yield this.ajax.post(url);

            this.installError = '';

            if (result.themes) {
                // show theme in list immediately
                this.store.pushPayload(result);

                this.theme = this.store.peekRecord('theme', result.themes[0].name);

                this.validationWarnings = this.theme.warnings || [];
                this.validationErrors = this.theme.errors || [];
                this.fatalValidationErrors = [];

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

    @task({drop: true})
    *activateTask() {
        yield this.theme.activate();
        this.closeModal();
    }

    resetErrors() {
        this.installError = '';
        this.validationWarnings = [];
        this.validationErrors = [];
        this.fatalValidationErrors = [];
    }
}
