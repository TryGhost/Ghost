import Ember from 'ember';
import {helper} from '@ember/component/helper';
import {htmlSafe} from '@ember/template';

const {Handlebars} = Ember;

export function highlightedText([text, termToHighlight]) {
    // replace any non-word character with an escaped character
    let sanitisedTerm = termToHighlight.replace(new RegExp(/\W/ig), '\\$&');
    let termMatcher = new RegExp(sanitisedTerm, 'ig');

    let matches = text.match(termMatcher) || [];
    let nonMatches = text.split(termMatcher);

    let htmlSafeResult = '';

    nonMatches.forEach((nonMatch, index) => {
        htmlSafeResult += Handlebars.Utils.escapeExpression(nonMatch);

        if (matches[index]) {
            htmlSafeResult += `<span class="highlight">${Handlebars.Utils.escapeExpression(matches[index])}</span>`;
        }
    });

    return htmlSafe(htmlSafeResult);
}

export default helper(highlightedText);
