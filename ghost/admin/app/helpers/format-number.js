import {helper} from '@ember/component/helper';

export function formatNumber(number, options) {
    if (number === '' || number === null || number === undefined) {
        return;
    }

    return Number(number).toLocaleString(undefined, options);
}

export default helper(function ([number]/*, hash*/) {
    return formatNumber(number);
});
