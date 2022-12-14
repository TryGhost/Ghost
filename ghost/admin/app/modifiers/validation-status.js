import Modifier from 'ember-modifier';
import {isEmpty} from '@ember/utils';

const ERROR_CLASS = 'error';
const SUCCESS_CLASS = 'success';

export default class ValidationStatusModifier extends Modifier {
    modify(element, positional, {errors, property, hasValidated, errorClass = ERROR_CLASS, successClass = SUCCESS_CLASS}) {
        const hasError = this.hasError(errors, property, hasValidated);

        let validationClass = '';

        if (!property || hasValidated?.includes(property)) {
            validationClass = hasError ? errorClass : successClass;
        }

        element.classList.remove(errorClass);
        element.classList.remove(successClass);

        if (validationClass) {
            element.classList.add(validationClass);
        }
    }

    hasError(errors, property, hasValidated) {
        // if we aren't looking at a specific property we always want an error class
        if (!property && errors && !errors.get('isEmpty')) {
            return true;
        }

        // If we haven't yet validated this field, there is no validation class needed
        if (!hasValidated || !hasValidated.includes(property)) {
            return false;
        }

        if (errors && !isEmpty(errors.errorsFor(property))) {
            return true;
        }

        return false;
    }
}
