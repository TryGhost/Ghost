import Ember from 'ember';
const lowerWords = ['of', 'a', 'the', 'and', 'an', 'or', 'nor', 'but', 'is', 'if',
                    'then', 'else', 'when', 'at', 'from', 'by', 'on', 'off', 'for',
                    'in', 'out', 'over', 'to', 'into', 'with'];

export default function (input) {
    let words = input.split(' ').map((word, index) => {
        if (index === 0 || lowerWords.indexOf(word) === -1) {
            word = Ember.String.capitalize(word);
        }

        return word;
    });

    return words.join(' ');
}
