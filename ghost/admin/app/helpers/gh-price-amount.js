import {helper} from '@ember/component/helper';

export function ghPriceAmount(amount) {
    if (amount) {
        let price = amount / 100;
        if (price % 1 === 0) {
            return price;
        } else {
            return (Math.round(price * 100) / 100).toFixed(2);
        }
    }
    return 0;
}

// like {{pluralize}} but formats the number according to current locale
export default helper(function ([amount]) {
    return ghPriceAmount(amount);
});
