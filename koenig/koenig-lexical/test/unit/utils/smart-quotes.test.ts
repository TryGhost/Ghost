import {closesAfterSpace, findMistypedQuote, getQuoteStyle, getSmartQuote, mayHaveMistypedQuote, smartenQuotes} from '../../../src/utils/smart-quotes';
import {describe, expect, test} from 'vitest';

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

    describe('getQuoteStyle', () => {
        test('falls back to English quotes for unknown or missing locales', () => {
            expect(getQuoteStyle()).toEqual(getQuoteStyle('en'));
            expect(getQuoteStyle('xx')).toEqual(getQuoteStyle('en'));
            expect(getQuoteStyle('en-GB')).toEqual(getQuoteStyle('en'));
        });

        test('matches the language when the region has no style of its own', () => {
            expect(getQuoteStyle('de-AT')).toEqual(getQuoteStyle('de'));
            expect(getQuoteStyle('de_at')).toEqual(getQuoteStyle('de'));
        });

        test('uses regional styles when they differ', () => {
            expect(getQuoteStyle('de-CH').double).toEqual(['«', '»']);
            expect(getQuoteStyle('pt-BR').double).toEqual(['“', '”']);
            expect(getQuoteStyle('pt').double).toEqual(['«', '»']);
        });
    });

    describe('locale-specific quotes', () => {
        const de = getQuoteStyle('de');
        const fr = getQuoteStyle('fr');
        const sv = getQuoteStyle('sv');

        test('uses low-high quotes in German', () => {
            expect(smartenQuotes('"Hallo," sagte sie. \'Ja\'', '', de)).toEqual('„Hallo,“ sagte sie. ‚Ja‘');
        });

        test('keeps apostrophes as ’ in every language', () => {
            expect(smartenQuotes('Wie geht\'s? ‚It\'s fine\'', '', de)).toEqual('Wie geht’s? ‚It’s fine‘');
            expect(smartenQuotes('l\'homme a dit "oui"', '', fr)).toEqual('l’homme a dit « oui »');
            expect(smartenQuotes('\'s avonds en \'t is', '', getQuoteStyle('nl'))).toEqual('’s avonds en ’t is');
            expect(smartenQuotes('\'nen Kaffee', '', de)).toEqual('’nen Kaffee');
        });

        test('closes a German single quote after a word when typing', () => {
            expect(getSmartQuote('\'', '‚fein', '', de)).toEqual('‘');
            expect(getSmartQuote('\'', 'geht', '', de)).toEqual('’');
        });

        test('flips a German closing quote back to an apostrophe when a letter follows', () => {
            expect(findMistypedQuote('‚it‘', 's', de)).toEqual({index: 3, replacement: '’'});
            expect(findMistypedQuote('‚fein‘', ' ', de)).toEqual(null);
            expect(mayHaveMistypedQuote('‚it‘', de)).toEqual(true);
            expect(mayHaveMistypedQuote('it’', getQuoteStyle('en'))).toEqual(false);
        });

        test('flips a German leading apostrophe at the end of the word', () => {
            expect(findMistypedQuote('die ‚90er', ' ', de)).toEqual({index: 4, replacement: '’'});
        });

        test('uses guillemets with narrow no-break spaces in French', () => {
            expect(smartenQuotes('"Bonjour", dit-elle', '', fr)).toEqual('« Bonjour », dit-elle');
            expect(getSmartQuote('"', '', '', fr)).toEqual('« ');
            expect(getSmartQuote('"', '« Bonjour', '', fr)).toEqual(' »');
        });

        test('replaces plain spaces inside French quotes with its own', () => {
            expect(smartenQuotes('" Bonjour "', '', fr)).toEqual('« Bonjour »');
            expect(closesAfterSpace('"', '« Bonjour ', fr)).toEqual(true);
            expect(closesAfterSpace('"', 'Bonjour ', fr)).toEqual(false);
            expect(closesAfterSpace('"', '«Bonjour ', getQuoteStyle('fr-CH'))).toEqual(false);
        });

        test('flips a German year suffix at the end of the word', () => {
            expect(smartenQuotes('die \'90er', '', de)).toEqual('die ’90er');
        });

        test('uses guillemets without spaces in Swiss French', () => {
            expect(smartenQuotes('"Bonjour"', '', getQuoteStyle('fr-CH'))).toEqual('«Bonjour»');
        });

        test('keeps primes in every language', () => {
            expect(smartenQuotes('5\'10"', '', de)).toEqual('5′10″');
            expect(smartenQuotes('5\'10"', '', fr)).toEqual('5′10″');
        });

        test('uses the same mark on both sides in Swedish', () => {
            expect(smartenQuotes('"Hej," sa hon. Det \'är\' 5"', '', sv)).toEqual('”Hej,” sa hon. Det ’är’ 5″');
            expect(getSmartQuote('"', '”I was 25', '', sv)).toEqual('”');
            expect(getSmartQuote('"', 'a 12', '', sv)).toEqual('″');
        });

        test('leaves leading apostrophes alone in Swedish', () => {
            expect(findMistypedQuote('’90s', ' ', sv)).toEqual(null);
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
