import Service from '@ember/service';
import {isEmpty} from '@ember/utils';
import {isThemeValidationError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class ThemeManagementService extends Service {
    @service limit;
    @service modals;

    @task
    *activateTask(theme) {
        let resultModal = null;

        try {
            const isOverLimit = yield this.limit.checkWouldGoOverLimit('customThemes', {value: theme.name});

            if (isOverLimit) {
                try {
                    yield this.limit.limiter.errorIfWouldGoOverLimit('customThemes', {value: theme.name});
                } catch (error) {
                    if (error.errorType !== 'HostLimitError') {
                        throw error;
                    }

                    resultModal = this.modals.open('modals/limits/custom-theme', {
                        message: error.message
                    });

                    yield resultModal;
                    return;
                }
            }

            try {
                const activatedTheme = yield theme.activate();

                const {warnings, errors} = activatedTheme;

                if (!isEmpty(warnings) || !isEmpty(errors)) {
                    resultModal = this.modals.open('modals/design/theme-errors', {
                        title: 'Activation successful',
                        canActivate: true,
                        warnings,
                        errors
                    });

                    yield resultModal;
                }
            } catch (error) {
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

                    resultModal = this.modals.open('modals/design/theme-errors', {
                        title: 'Activation failed',
                        canActivate: false,
                        errors: normalErrors,
                        fatalErrors
                    });

                    yield resultModal;
                }

                throw error;
            }
        } finally {
            // finally is always called even if the task is cancelled which gives
            // consumers the ability to cancel the task to clear any opened modals
            resultModal?.close();
        }
    }
}
