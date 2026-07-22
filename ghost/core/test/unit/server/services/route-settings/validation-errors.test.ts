import assert from 'node:assert/strict';
import {z} from 'zod';
import {describeValue, formatLocation, humanList, toValidationError} from '../../../../../core/server/services/route-settings/validation-errors';

const errorFor = (schema: z.ZodType, value: unknown) => schema.safeParse(value).error as z.ZodError;

describe('UNIT: services/route-settings/validation-errors', function () {
    describe('formatLocation', function () {
        it('names the file when there is no path', function () {
            assert.equal(formatLocation([]), 'routes.yaml');
        });

        it('uses dots for plain keys and brackets for everything else', function () {
            assert.equal(formatLocation(['taxonomies', 'tag']), 'taxonomies.tag');
            assert.equal(formatLocation(['routes', '/about/', 'content_type']), 'routes[\'/about/\'].content_type');
            assert.equal(formatLocation(['routes', '/x/', 'template', 1]), 'routes[\'/x/\'].template[1]');
        });

        it('escapes quotes and backslashes in a path', function () {
            assert.equal(formatLocation(['routes', '/it\'s/']), 'routes[\'/it\\\'s/\']');
            assert.equal(formatLocation(['routes', '/a\\b/']), 'routes[\'/a\\\\b/\']');
            assert.equal(formatLocation(['routes', '/a\\\'b/']), 'routes[\'/a\\\\\\\'b/\']');
        });
    });

    describe('describeValue', function () {
        it('names each kind of value', function () {
            assert.equal(describeValue(null), 'nothing');
            assert.equal(describeValue(undefined), 'nothing');
            assert.equal(describeValue([1]), 'a list');
            assert.equal(describeValue(new Date()), 'a date');
            assert.equal(describeValue({}), 'a map');
            assert.equal(describeValue('hi'), 'the text "hi"');
            assert.equal(describeValue(5), '5');
            assert.equal(describeValue(false), 'false');
            assert.equal(describeValue(Symbol('x')), 'an unsupported value');
        });
    });

    describe('humanList', function () {
        it('reads as a sentence', function () {
            assert.equal(humanList([]), '');
            assert.equal(humanList(['posts']), 'posts');
            assert.equal(humanList(['posts', 'pages']), 'posts or pages');
            assert.equal(humanList(['posts', 'pages', 'tags']), 'posts, pages or tags');
        });
    });

    describe('toValidationError', function () {
        it('falls back to the schema message for keys it has no advice for', function () {
            const err = toValidationError(errorFor(z.string(), 5), ['routes', '/x/', 'mystery'], {});

            assert.match(err.message, /^The following definition "routes\['\/x\/'\]\.mystery" is invalid: /);
            assert.equal(err.help, 'https://ghost.org/docs/themes/routing/');
        });

        it('does not mistake inherited object properties for known keys', function () {
            const err = toValidationError(errorFor(z.string(), 5), ['routes', '/x/', 'data', 'toString'], {});

            assert.doesNotMatch(err.message, /native code/);
        });

        it('names the key when the failure is on a list entry', function () {
            const err = toValidationError(errorFor(z.string(), 5), ['routes', '/x/', 'template', 0], {});

            assert.match(err.message, /template must be a template name, or a list of template names/);
        });

        it('describes a missing value when the path runs through a scalar', function () {
            const error = errorFor(z.object({filter: z.string()}), {filter: 5});

            assert.equal(
                toValidationError(error, ['routes', '/x/'], 'a string route').message,
                'The following definition "routes[\'/x/\'].filter" is invalid: filter must be a filter string (e.g. filter: featured:true), but nothing was provided.'
            );
        });
    });
});
