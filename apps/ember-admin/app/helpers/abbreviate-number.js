import {formatNumber} from './format-number';
import {helper} from '@ember/component/helper';

export function abbreviateNumber(number, options = {}) {
    if (number === '' || number === null || number === undefined) {
        return;
    }

    const num = Number(number);

    if (num < 1000) {
        return formatNumber(num, options);
    }

    // For numbers >= 1000, show as x.yk format
    const abbreviated = num / 1000;
    const rounded = Math.round(abbreviated * 10) / 10; // Round to 1 decimal place

    // Remove .0 if it's a whole number
    const formatted = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);

    return `${formatted}k`;
}

export default helper(function ([number]/*, hash*/) {
    return abbreviateNumber(number);
});
