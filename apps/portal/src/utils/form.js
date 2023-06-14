import * as Validator from './validator';

export const FormInputError = ({field}) => {
    if (field.required && !field.value) {
        switch (field.name) {
        case 'name':
            return `Enter your name`;
        
        case 'email':
            return `Enter your email address`;

        default:
            return `Please enter ${field.name}`;
        }
    }

    if (field.type === 'email' && !Validator.isValidEmail(field.value)) {
        return `Invalid email address`;
    }
    return null;
};

export const ValidateInputForm = ({fields}) => {
    const errors = {};
    fields.forEach((field) => {
        const name = field.name;
        const fieldError = FormInputError({field});
        errors[name] = fieldError;
    });
    return errors;
};