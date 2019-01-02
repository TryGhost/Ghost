import {findAll} from '@ember/test-helpers';

export function elementHasText(element, text) {
    return RegExp(text).test(element.textContent);
}

export function findWithText(selector, text) {
    return Array.from(findAll(selector)).find(element => elementHasText(element, text));
}

export function findAllWithText(selector, text) {
    return Array.from(findAll(selector)).filter(element => elementHasText(element, text));
}
