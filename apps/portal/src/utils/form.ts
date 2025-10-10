import * as Validator from './validator';
import {t} from './i18n';

interface FormField {
    name: string;
    value: string;
    type?: string;
    required?: boolean;
}

export const FormInputError = ({field}: {field: FormField}): string | null => {
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
 * @param fields
 * @returns errors
 */
export const ValidateInputForm = ({fields}: {fields: FormField[]}): Record<string, string | null> => {
    const errors: Record<string, string | null> = {};
    fields.forEach((field) => {
        const name = field.name;
        const fieldError = FormInputError({field});
        errors[name] = fieldError;
    });
    return errors;
};
