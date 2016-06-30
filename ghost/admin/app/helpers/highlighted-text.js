import {helper} from 'ember-helper';
import {htmlSafe} from 'ember-string';

export function highlightedText([text, termToHighlight]) {
    return htmlSafe(text.replace(new RegExp(termToHighlight, 'ig'), '<span class="highlight">$&</span>'));
}

export default helper(highlightedText);
