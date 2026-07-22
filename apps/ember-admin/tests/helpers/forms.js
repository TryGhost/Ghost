import {find, triggerEvent} from '@ember/test-helpers';

export async function submitForm(elementOrSelector) {
    if (typeof elementOrSelector === 'string') {
        elementOrSelector = find(elementOrSelector);
    }

    const form = elementOrSelector.closest('form');
    await triggerEvent(form, 'submit');
}
