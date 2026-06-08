import Model, {attr} from '@ember-data/model';
import {computed} from '@ember/object';
import {isBlank} from '@ember/utils';

export default Model.extend({
    active: attr('boolean'),
    gscanErrors: attr('raw', {defaultValue: () => []}), // renamed from 'errors' to avoid clash with Ember Data Model's `errors` property
    name: attr('string'),
    package: attr('raw'),
    templates: attr('raw', {defaultValue: () => []}),
    warnings: attr('raw', {defaultValue: () => []}),

    customTemplates: computed('templates.[]', function () {
        let templates = this.templates || [];

        return templates.filter(function (template) {
            return isBlank(template.slug);
        });
    }),

    slugTemplates: computed('templates.[]', function () {
        let templates = this.templates || [];

        return templates.filter(function (template) {
            return !isBlank(template.slug);
        });
    }),

    codedWarnings: computed('warnings.[]', function () {
        const codedWarnings = {};

        this.warnings.forEach((warning) => {
            if (!codedWarnings[warning.code]) {
                codedWarnings[warning.code] = [];
            }

            codedWarnings[warning.code].push(warning);
        });

        return codedWarnings;
    }),

    codedErrors: computed('gscanErrors.[]', function () {
        const codedErrors = {};

        this.gscanErrors.forEach((error) => {
            if (!codedErrors[error.code]) {
                codedErrors[error.code] = [];
            }

            codedErrors[error.code].push(error);
        });

        return codedErrors;
    }),

    codedErrorsAndWarnings: computed('codedErrors.[]', 'codedWarnings.[]', function () {
        const codedErrorsAndWarnings = {};

        Object.keys(this.codedErrors).forEach((code) => {
            if (!codedErrorsAndWarnings[code]) {
                codedErrorsAndWarnings[code] = [];
            }
            codedErrorsAndWarnings[code] = [...codedErrorsAndWarnings[code], ...this.codedErrors[code]];
        });

        Object.keys(this.codedWarnings).forEach((code) => {
            if (!codedErrorsAndWarnings[code]) {
                codedErrorsAndWarnings[code] = [];
            }
            codedErrorsAndWarnings[code] = [...codedErrorsAndWarnings[code], ...this.codedWarnings[code]];
        });

        return codedErrorsAndWarnings;
    }),

    hasPageBuilderFeature(feature) {
        const failures = this.codedErrorsAndWarnings;

        if (!failures['GS110-NO-MISSING-PAGE-BUILDER-USAGE']) {
            return true;
        }

        return !failures['GS110-NO-MISSING-PAGE-BUILDER-USAGE'].some((failure) => {
            return failure.failures.some(({message}) => message.includes(`@page.${feature}`));
        });
    }
});
