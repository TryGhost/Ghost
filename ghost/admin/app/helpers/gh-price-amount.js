import {formatNumber} from './format-number';
import {helper} from '@ember/component/helper';

export function ghPriceAmount(amount, {cents = true} = {}) {
    if (amount) {
        let price = cents ? amount / 100 : Math.round(amount / 100);
        if (price % 1 === 0) {
            return formatNumber(price);
        } else {
            return formatNumber(Math.round(price * 100) / 100, {minimumFractionDigits: 2});
        }
    }
    return 0;
}

// like {{pluralize}} but formats the number according to current locale
export default helper(function ([amount], options = {}) {
    return ghPriceAmount(amount, options);
});
