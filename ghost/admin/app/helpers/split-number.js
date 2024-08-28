import {formatNumber} from './format-number';
import {helper} from '@ember/component/helper';
import {htmlSafe} from '@ember/template';

export function splitNumber([number, previousNumber]) {
    let formattedNewNumber = formatNumber(number);
    let formattedOldNumber = formatNumber(previousNumber);

    let oldChars = formattedOldNumber.split('').map(char => `<span class="old-char">${char}</span>`).join('');

    let newChars = formattedNewNumber.split('').map(char => `<span class="new-char">${char}</span>`).join('');

    return htmlSafe(`
        <div class="number-group old-number">${oldChars}</div>
        <div class="number-group new-number">${newChars}</div>
    `);
}

export default helper(splitNumber);
