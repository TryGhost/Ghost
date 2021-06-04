import {helper} from '@ember/component/helper';

export function ghPriceAmount(amount) {
    if (amount) {
        return Math.round(amount / 100);
    }
    return 0;
}

// like {{pluralize}} but formats the number according to current locale
export default helper(function ([amount]) {
    return ghPriceAmount(amount);
});
