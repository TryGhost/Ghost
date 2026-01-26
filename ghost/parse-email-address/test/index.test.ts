import assert from 'node:assert/strict';
import {parseEmailAddress} from '../src';

describe('parseEmailAddress', function () {
    it('returns null for invalid email addresses', function () {
        const invalid = [
            // These aren't email addresses
            '',
            'foo',
            'example.com',
            '@example.com',
            // Bad spacing
            ' foo@example.com',
            'foo@example.com ',
            'foo @example.com',
            'foo@example .com',
            // Too many @s
            'foo@bar@example.com',
            // Invalid user
            'a"b(c)d,e:f;g<h>i[j\\k]l@example.com',
            'just"not"right@example.com',
            'this is"not\\allowed@example.com',
            'x'.repeat(975) + '@example.com',
            // Invalid domains
            'foo@example',
            'foo@no_underscores.example',
            'foo@xn--iñvalid.com',
            'foo@' + 'x'.repeat(253) + '.yz',
            // IP domains
            'foo@[127.0.0.1]',
            'foo@[IPv6:::1]',
            'foo@[ipv6:::1]',
            // Tag domains
            'foo@[bar:Baz]'
        ];
        for (const input of invalid) {
            assert.equal(parseEmailAddress(input), null, input);
        }
    });

    it('returns the local and domain part of domains', function () {
        const testCases: [string, string, string][] = [
            // Basic cases
            ['foo@example.com', 'foo', 'example.com'],
            ['foo.bar@example.com', 'foo.bar', 'example.com'],
            ['foo.bar+baz@example.com', 'foo.bar+baz', 'example.com'],
            // Unusual usernames
            ['" "@example.com', '" "', 'example.com'],
            ['"foo..bar"@example.com', '"foo..bar"', 'example.com'],
            ['"<foo>"@example.com', '"<foo>"', 'example.com'],
            ['"\\<foo\\>"@example.com', '"\\<foo\\>"', 'example.com'],
            ['"foo@bar.example"@example.com', '"foo@bar.example"', 'example.com'],
            // Lowercasing
            ['Foo@Example.COM', 'Foo', 'example.com'],
            // Non-ASCII
            ['foo@中文.example', 'foo', 'xn--fiq228c.example'],
            ['中文@example.com', '中文', 'example.com']
        ];
        for (const [input, local, domain] of testCases) {
            assert.deepEqual(parseEmailAddress(input), {local, domain}, input);
        }
    });
});
