import Service from '@ember/service';
import config from 'ghost-admin/config/environment';
import {action} from '@ember/object';
import {isEmpty} from '@ember/utils';
import {isThemeValidationError} from 'ghost-admin/services/ajax';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ThemeManagementService extends Service {
    @service ajax;
    @service config;
    @service customThemeSettings;
    @service limit;
    @service modals;
    @service settings;

    @tracked isUploading;
    @tracked previewHtml;

    @action
    async upload(event) {
        event?.preventDefault();

        try {
            // Sending a bad string to make sure it fails (empty string isn't valid)
            await this.limit.limiter.errorIfWouldGoOverLimit('customThemes', {value: '.'});
        } catch (error) {
            if (error.errorType === 'HostLimitError') {
                return this.modals.open('modals/limit/custom-theme', {
                    message: error.message
                });
            }

            throw error;
        }

        return this.modals.open('modals/design/upload-theme');
    }

    @task
    *activateTask(theme, options) {
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

                this.updatePreviewHtmlTask.perform();
                this.customThemeSettings.load();

                if (!options.skipErrors) {
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
                }
            } catch (error) {
                if (!options.skipErrors) {
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
                }

                throw error;
            }
        } finally {
            // finally is always called even if the task is cancelled which gives
            // consumers the ability to cancel the task to clear any opened modals
            resultModal?.close();
        }
    }

    @task
    *updatePreviewHtmlTask() {
        // skip during testing because we don't have mocks for the front-end
        if (config.environment === 'test') {
            return;
        }

        // grab the preview html
        const ajaxOptions = {
            contentType: 'text/html;charset=utf-8',
            dataType: 'text',
            headers: {
                'x-ghost-preview': this.previewData
            }
        };

        // TODO: config.blogUrl always removes trailing slash - switch to always have trailing slash
        const frontendUrl = `${this.config.get('blogUrl')}/`;
        const previewContents = yield this.ajax.post(frontendUrl, ajaxOptions);

        // inject extra CSS to disable navigation and prevent clicks
        const injectedCss = `html { pointer-events: none; }`;

        const domParser = new DOMParser();
        const htmlDoc = domParser.parseFromString(previewContents, 'text/html');

        const stylesheet = htmlDoc.querySelector('style');
        const originalCSS = stylesheet.innerHTML;
        stylesheet.innerHTML = `${originalCSS}\n\n${injectedCss}`;

        // replace the iframe contents with the doctored preview html
        this.previewHtml = htmlDoc.documentElement.outerHTML;
    }

    get previewData() {
        const params = new URLSearchParams();

        params.append('c', this.settings.get('accentColor') || '#ffffff');
        params.append('d', this.settings.get('description'));
        params.append('icon', this.settings.get('icon'));
        params.append('logo', this.settings.get('logo'));
        params.append('cover', this.settings.get('coverImage'));

        params.append('custom', JSON.stringify(this.customThemeSettings.keyValueObject));

        return params.toString();
    }
}
