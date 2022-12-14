import {formatNumber} from './format-number';
import {helper} from '@ember/component/helper';
import {isBlank} from '@ember/utils';
import {pluralize} from 'ember-inflector';

export function ghPluralize(number, word, {withoutCount} = {}) {
    let output = [];

    if (!isBlank(number) && withoutCount !== true) {
        output.push(formatNumber(number));
    }

    // default {{pluralize}} allows for {{pluralize "word"}} with no number
    if (isBlank(number)) {
        output.push(pluralize(word));
    } else {
        output.push(pluralize(number, word, {withoutCount: true}));
    }

    return output.join(' ');
}

// like {{pluralize}} but formats the number according to current locale
export default helper(function ([number, word], {'without-count': withoutCount} = {}) {
    return ghPluralize(number, word, {withoutCount});
});
