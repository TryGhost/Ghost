import {formatNumber} from './format-number';
import {helper} from '@ember/component/helper';

export function ghPriceAmount(amount) {
    if (amount) {
        let price = amount / 100;
        if (price % 1 === 0) {
            return formatNumber(price);
        } else {
            return formatNumber(Math.round(price * 100) / 100);
        }
    }
    return 0;
}

// like {{pluralize}} but formats the number according to current locale
export default helper(function ([amount]) {
    return ghPriceAmount(amount);
});
