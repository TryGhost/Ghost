import {describe, expect, test} from 'vitest';
import {findMistypedQuote, getSmartQuote, smartenQuotes} from '../../../src/utils/smart-quotes';

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
            expect(getSmartQuote('"', '“I was 25')).toEqual('”');
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

        test('uses primes for feet and inches', () => {
            expect(getSmartQuote('\'', 'She is 5')).toEqual('′');
            expect(getSmartQuote('"', 'She is 5′10')).toEqual('″');
            expect(getSmartQuote('"', 'a 12')).toEqual('″');
        });

        test('uses inches inside a quotation when the measurement is clear', () => {
            expect(getSmartQuote('"', '“She is 5′10')).toEqual('″');
        });

        test('closes quotes that end with a number', () => {
            expect(getSmartQuote('"', '“I was 25')).toEqual('”');
            expect(getSmartQuote('\'', 'the ‘1984')).toEqual('’');
        });

        test('uses an apostrophe after a number followed by letters', () => {
            expect(getSmartQuote('\'', 'the 1990', 's')).toEqual('’');
        });
    });

    describe('smartenQuotes', () => {
        test('converts a mixed sentence', () => {
            expect(smartenQuotes('"It\'s \'fine\'," she said.')).toEqual('“It’s ‘fine’,” she said.');
        });

        test('handles leading apostrophes', () => {
            expect(smartenQuotes('rock \'n\' roll in the \'90s')).toEqual('rock ’n’ roll in the ’90s');
        });

        test('uses the preceding text for context', () => {
            expect(smartenQuotes('" she said', '“Hello')).toEqual('” she said');
        });

        test('converts feet and inches', () => {
            expect(smartenQuotes('She\'s 5\'10" and has a 12" pizza')).toEqual('She’s 5′10″ and has a 12″ pizza');
            expect(smartenQuotes('"She\'s 5\'10"," he said')).toEqual('“She’s 5′10″,” he said');
            expect(smartenQuotes('"I was 25" in the 1990\'s')).toEqual('“I was 25” in the 1990’s');
        });

        test('leaves replacement strings alone', () => {
            expect(smartenQuotes('Hey {first_name, "there"}, it\'s "here"'))
                .toEqual('Hey {first_name, "there"}, it’s “here”');
        });

        test('returns text without quotes unchanged', () => {
            expect(smartenQuotes('No quotes here')).toEqual('No quotes here');
        });
    });

    describe('findMistypedQuote', () => {
        test('flips a ‘ that turned out to be a leading apostrophe at the end of the word', () => {
            expect(findMistypedQuote('the ‘90s', ' ')).toEqual({index: 4, replacement: '’'});
            expect(findMistypedQuote('rock ‘n', '\'')).toEqual({index: 5, replacement: '’'});
            expect(findMistypedQuote('‘til', ',')).toEqual({index: 0, replacement: '’'});
        });

        test('waits until the word has ended', () => {
            expect(findMistypedQuote('the ‘n', 'i')).toEqual(null);
        });

        test('ignores regular opening quotes', () => {
            expect(findMistypedQuote('the ‘nice', ' ')).toEqual(null);
            expect(findMistypedQuote('the ‘1984', ' ')).toEqual(null);
        });

        test('flips a prime to an apostrophe when a letter follows', () => {
            expect(findMistypedQuote('the 1990′', 's')).toEqual({index: 8, replacement: '’'});
            expect(findMistypedQuote('5′', '1')).toEqual(null);
        });
    });
});
