import {useCallback} from 'react';

// adapted from lexical-react/src/LexicalTypeaheadMenuPlugin
//  we need the ability to match on punctuation, as well as a leading space, which was not possible using lexical's version

export default function useBasicTypeaheadTriggerMatch(trigger,{minLength = 1, maxLength = 75}) {
    return useCallback(
        (text) => {
            const invalidChars = '[^' + trigger + '\\s]'; // escaped set - these cannot be present in the matched string
            const TypeaheadTriggerRegex = new RegExp(
                '[' + trigger + ']' +
                '(' +
                    '(?:' + invalidChars + ')' +
                    '{0,' + maxLength + '}' +
                ')$',
            );
            const match = TypeaheadTriggerRegex.exec(text);
            if (match !== null) {
                const matchingString = match[1];
                if (matchingString.length >= minLength) {
                    return {
                        leadOffset: match.index,
                        matchingString,
                        replaceableString: match[0]
                    };
                }
            }
            return null;
        },
        [maxLength, minLength, trigger],
    );
}