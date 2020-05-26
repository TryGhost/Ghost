import {helper} from '@ember/component/helper';

export function formatNumber(number) {
    return Number(number).toLocaleString();
}

export default helper(function ([number]/*, hash*/) {
    return formatNumber(number);
});
