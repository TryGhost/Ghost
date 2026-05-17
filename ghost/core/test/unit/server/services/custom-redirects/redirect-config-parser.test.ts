import assert from 'node:assert/strict';

import {
    parseJson,
    parseYaml,
    serializeToYaml
} from '../../../../../core/server/services/custom-redirects/redirect-config-parser';

describe('UNIT: redirect-config-parser', function () {
    describe('parseJson', function () {
        it('parses a JSON string into a RedirectConfig[]', function () {
            const content = JSON.stringify([
                {from: '/old/', to: '/new/', permanent: true},
                {from: '/temp/', to: '/dest/'}
            ]);

            assert.deepEqual(parseJson(content), [
                {from: '/old/', to: '/new/', permanent: true},
                {from: '/temp/', to: '/dest/'}
            ]);
        });

        it('throws BadRequestError on an empty input', function () {
            assert.throws(
                () => parseJson(''),
                {errorType: 'BadRequestError'}
            );
        });

        it('throws BadRequestError on malformed JSON', function () {
            assert.throws(
                () => parseJson('{not json'),
                {
                    errorType: 'BadRequestError',
                    message: /Could not parse JSON:/
                }
            );
        });

        it('throws BadRequestError when JSON parses to a non-array', function () {
            for (const input of ['null', '42', '"hello"', '{"from":"/a","to":"/b"}']) {
                assert.throws(
                    () => parseJson(input),
                    {errorType: 'BadRequestError', message: /must be an array/},
                    `expected rejection for: ${input}`
                );
            }
        });
    });

    describe('parseYaml', function () {
        it('parses 301 and 302 sections into a RedirectConfig[]', function () {
            const content = `
301:
  /old/: /new/
  /old2/: /new2/

302:
  /temp/: /dest/
`;

            assert.deepEqual(parseYaml(content), [
                {from: '/temp/', to: '/dest/', permanent: false},
                {from: '/old/', to: '/new/', permanent: true},
                {from: '/old2/', to: '/new2/', permanent: true}
            ]);
        });

        it('handles a YAML file with only a 301 section', function () {
            const content = '301:\n  /a: /b';

            assert.deepEqual(parseYaml(content), [
                {from: '/a', to: '/b', permanent: true}
            ]);
        });

        it('handles a YAML file with only a 302 section', function () {
            const content = '302:\n  /a: /b';

            assert.deepEqual(parseYaml(content), [
                {from: '/a', to: '/b', permanent: false}
            ]);
        });

        it('throws BadRequestError on an empty input', function () {
            assert.throws(
                () => parseYaml(''),
                {errorType: 'BadRequestError'}
            );
        });

        it('tolerates an empty status-code section as zero redirects in that group', function () {
            assert.deepEqual(
                parseYaml('301:\n302:\n  /a: /b'),
                [{from: '/a', to: '/b', permanent: false}]
            );
        });

        it('throws BadRequestError when YAML parses to a non-object', function () {
            assert.throws(
                () => parseYaml('plain string'),
                {
                    errorType: 'BadRequestError',
                    message: /YAML input is invalid/
                }
            );
        });

        it('throws BadRequestError when YAML parses to a top-level array', function () {
            assert.throws(
                () => parseYaml('- /a: /b\n- /c: /d'),
                {
                    errorType: 'BadRequestError',
                    message: /YAML input is invalid/
                }
            );
        });

        it('throws BadRequestError when neither 301 nor 302 is present', function () {
            assert.throws(
                () => parseYaml('foo: bar'),
                {
                    errorType: 'BadRequestError',
                    message: /YAML input is invalid/
                }
            );
        });

        it('throws BadRequestError when a status-code section is not a mapping', function () {
            assert.throws(
                () => parseYaml('301:\n  - /a\n  - /b'),
                {
                    errorType: 'BadRequestError',
                    message: /YAML input is invalid/
                }
            );
        });

        it('throws BadRequestError when a redirect target is not a string', function () {
            assert.throws(
                () => parseYaml('301:\n  /a: 123'),
                {
                    errorType: 'BadRequestError',
                    message: /YAML input is invalid/
                }
            );
            assert.throws(
                () => parseYaml('301:\n  /a: ~'),
                {
                    errorType: 'BadRequestError',
                    message: /YAML input is invalid/
                }
            );
        });

        it('throws BadRequestError on malformed YAML', function () {
            const content = `
                301:
                    /a: /b
                    /a: /b
            `;

            assert.throws(
                () => parseYaml(content),
                {
                    errorType: 'BadRequestError',
                    message: /Could not parse YAML:/
                }
            );
        });
    });

    describe('serializeToYaml', function () {
        it('groups redirects by status code with 301 first', function () {
            const yaml = serializeToYaml([
                {from: '/temp/', to: '/dest/', permanent: false},
                {from: '/old/', to: '/new/', permanent: true}
            ]);

            assert.match(yaml, /^301:[\s\S]*\n302:/);
            assert.match(yaml, /\/old\/.*: \/new\//);
            assert.match(yaml, /\/temp\/.*: \/dest\//);
        });

        it('treats redirects without `permanent` as 302', function () {
            const yaml = serializeToYaml([{from: '/a', to: '/b'}]);

            assert.match(yaml, /302:/);
            assert.doesNotMatch(yaml, /301:/);
        });

        it('preserves relative order within each status code group', function () {
            const yaml = serializeToYaml([
                {from: '/p1', to: '/q1', permanent: true},
                {from: '/t1', to: '/u1', permanent: false},
                {from: '/p2', to: '/q2', permanent: true},
                {from: '/t2', to: '/u2', permanent: false}
            ]);

            const p1 = yaml.indexOf('/p1');
            const p2 = yaml.indexOf('/p2');
            const t1 = yaml.indexOf('/t1');
            const t2 = yaml.indexOf('/t2');

            assert.ok(p1 < p2, 'permanent redirects keep their relative order');
            assert.ok(t1 < t2, 'temporary redirects keep their relative order');
        });

        it('returns a self-documenting placeholder for an empty array', function () {
            const yamlString = serializeToYaml([]);

            assert.match(yamlString, /^301: \{\}/m);
            assert.match(yamlString, /^302: \{\}/m);
            assert.deepEqual(parseYaml(yamlString), []);
        });

        it('round-trips through parseYaml without losing fields', function () {
            const redirects = [
                {from: '/old/', to: '/new/', permanent: true},
                {from: '/temp/', to: '/dest/', permanent: false}
            ];

            const roundTripped = parseYaml(serializeToYaml(redirects));

            // Cross-group order is lost in serialise+parse; compare by content not order.
            assert.deepEqual(
                [...roundTripped].sort((a, b) => a.from.localeCompare(b.from)),
                [...redirects].sort((a, b) => a.from.localeCompare(b.from))
            );
        });

        it('round-trips redirects whose fields require YAML escaping', function () {
            const redirects = [
                {from: '/has:colon', to: '/dest', permanent: true},
                {from: '/has#hash', to: '/dest', permanent: true},
                {from: '-leading-dash', to: '/dest', permanent: true},
                {from: '/multi', to: 'has\nnewline\nvalue', permanent: false},
                {from: '/quote', to: 'has "quotes" inside', permanent: false},
                {from: '301', to: '/numeric-key', permanent: true}
            ];

            const yamlString = serializeToYaml(redirects);
            const roundTripped = parseYaml(yamlString);

            assert.deepEqual(
                [...roundTripped].sort((a, b) => a.from.localeCompare(b.from)),
                [...redirects].sort((a, b) => a.from.localeCompare(b.from))
            );
        });

        it('emits unquoted 301 / 302 section headers', function () {
            // Self-hosters diff downloaded files against VCS-tracked
            // originals — quoted numeric keys would create spurious diffs.
            const yamlString = serializeToYaml([
                {from: '/a', to: '/b', permanent: true},
                {from: '/c', to: '/d', permanent: false}
            ]);

            assert.match(yamlString, /^301:\n/m);
            assert.match(yamlString, /^302:\n/m);
            assert.doesNotMatch(yamlString, /^"301":/m);
            assert.doesNotMatch(yamlString, /^"302":/m);
        });
    });
});
