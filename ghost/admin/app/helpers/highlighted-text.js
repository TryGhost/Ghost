import Ember from 'ember';

const {
    Helper,
    String: {htmlSafe}
} = Ember;

export function highlightedText([text, termToHighlight]) {
    return htmlSafe(text.replace(new RegExp(termToHighlight, 'ig'), '<span class="highlight">$&</span>'));
}

export default Helper.helper(highlightedText);
