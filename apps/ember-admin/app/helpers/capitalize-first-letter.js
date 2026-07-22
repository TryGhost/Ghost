import {helper} from '@ember/component/helper';

export function capitalizeFirstLetter(string) {
    if (typeof string !== 'string' || string.length === 0) {
        return string;
    }
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export default helper(([string]) => capitalizeFirstLetter(string));
