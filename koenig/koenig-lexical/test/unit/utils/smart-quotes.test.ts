import {describe, expect, test} from 'vitest';
import {findMistypedLeadingApostrophe, getSmartQuote, smartenQuotes} from '../../../src/utils/smart-quotes';

describe('Utils: smart-quotes', () => {
    describe('getSmartQuote', () => {
        test('opens double quotes at the start of a block or after a space', () => {
            expect(getSmartQuote('"', '')).toEqual('“');
            expect(getSmartQuote('"', ' ')).toEqual('“');
            expect(getSmartQuote('"', '(')).toEqual('“');
            expect(getSmartQuote('"', '—')).toEqual('“');
        });

        test('closes double quotes after a word or punctuation', () => {
            expect(getSmartQuote('"', 'o')).toEqual('”');
            expect(getSmartQuote('"', '.')).toEqual('”');
            expect(getSmartQuote('"', '5')).toEqual('”');
        });

        test('uses apostrophes within words', () => {
            expect(getSmartQuote('\'', 'n')).toEqual('’');
        });

        test('opens single quotes after a space or opening double quote', () => {
            expect(getSmartQuote('\'', ' ', 'Hello')).toEqual('‘');
            expect(getSmartQuote('\'', '“', 'Hello')).toEqual('‘');
        });

        test('uses apostrophes for leading omissions', () => {
            expect(getSmartQuote('\'', ' ', '90s')).toEqual('’');
            expect(getSmartQuote('\'', ' ', 'til then')).toEqual('’');
            expect(getSmartQuote('\'', ' ', 'n\' roll')).toEqual('’');
            expect(getSmartQuote('\'', ' ', 'Tis the season')).toEqual('’');
        });

        test('does not treat longer words as leading omissions', () => {
            expect(getSmartQuote('\'', ' ', 'nice')).toEqual('‘');
            expect(getSmartQuote('\'', ' ', '1984')).toEqual('‘');
        });
    });

    describe('smartenQuotes', () => {
        test('converts a mixed sentence', () => {
            expect(smartenQuotes('"It\'s \'fine\'," she said.')).toEqual('“It’s ‘fine’,” she said.');
        });

        test('handles leading apostrophes', () => {
            expect(smartenQuotes('rock \'n\' roll in the \'90s')).toEqual('rock ’n’ roll in the ’90s');
        });

        test('uses the preceding character for context', () => {
            expect(smartenQuotes('" she said', 'd')).toEqual('” she said');
        });

        test('leaves replacement strings alone', () => {
            expect(smartenQuotes('Hey {first_name, "there"}, it\'s "here"'))
                .toEqual('Hey {first_name, "there"}, it’s “here”');
        });

        test('returns text without quotes unchanged', () => {
            expect(smartenQuotes('No quotes here')).toEqual('No quotes here');
        });
    });

    describe('findMistypedLeadingApostrophe', () => {
        test('finds a ‘ that turned out to be a leading apostrophe', () => {
            expect(findMistypedLeadingApostrophe('the ‘90s')).toEqual(4);
            expect(findMistypedLeadingApostrophe('rock ‘n')).toEqual(5);
            expect(findMistypedLeadingApostrophe('‘til')).toEqual(0);
        });

        test('ignores regular opening quotes', () => {
            expect(findMistypedLeadingApostrophe('the ‘nice')).toEqual(-1);
            expect(findMistypedLeadingApostrophe('the ‘1984')).toEqual(-1);
            expect(findMistypedLeadingApostrophe('the ‘n')).toEqual(4);
        });
    });
});
