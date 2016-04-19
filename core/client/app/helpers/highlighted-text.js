import Ember from 'ember';

export function highlightedText([text, termToHighlight]) {
    return Ember.String.htmlSafe(text.replace(new RegExp(termToHighlight, 'ig'), '<span class="highlight">$&</span>'));
}

export default Ember.Helper.helper(highlightedText);
