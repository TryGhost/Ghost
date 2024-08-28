import * as Validator from './validator';

export const FormInputError = ({field, t}) => {
    if (field.required && !field.value) {
        switch (field.name) {
        case 'name':
            return t(`Enter your name`);

        case 'email':
            return t(`Enter your email address`);

        default:
            return t(`Please enter {{fieldName}}`, {fieldName: field.name});
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
 * @param {Function} t
 * @returns {Object} errors
 */
export const ValidateInputForm = ({fields, t}) => {
    const errors = {};
    fields.forEach((field) => {
        const name = field.name;
        const fieldError = FormInputError({field, t});
        errors[name] = fieldError;
    });
    return errors;
};
