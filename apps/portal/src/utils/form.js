import * as Validator from './validator';
import {t} from './i18n';

export const FormInputError = ({field}) => {
    if (field.required && !field.value) {
        switch (field.name) {
        case 'name':
            return t(`Enter your name`);

        case 'email':
            return t(`Enter your email address`);

        default:
            return t(`Please enter {fieldName}`, {fieldName: field.name});
        }
    }

    if (field.type === 'email' && !Validator.isValidEmail(field.value)) {
        return t(`Invalid email address`);
    }
    return null;
};

/**
 * Validate input fields
 * @param {Array} fields
 * @returns {Object} errors
 */
export const ValidateInputForm = ({fields}) => {
    const errors = {};
    fields.forEach((field) => {
        const name = field.name;
        const fieldError = FormInputError({field});
        errors[name] = fieldError;
    });
    return errors;
};
