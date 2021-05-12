import {helper} from '@ember/component/helper';
import {htmlSafe} from '@ember/template';

export function highlightedText([text, termToHighlight]) {
    // replace any non-word character with an escaped character
    let sanitisedTerm = termToHighlight.replace(new RegExp(/\W/ig), '\\$&');

    return htmlSafe(text.replace(new RegExp(sanitisedTerm, 'ig'), '<span class="highlight">$&</span>'));
}

export default helper(highlightedText);
