import assert from 'node:assert/strict';
import fs from 'node:fs';
import {describe, it} from 'vitest';
import * as apiSchema from '../src/index.js';

const hasErrorType = (error: unknown, errorType: string): boolean => {
    return typeof error === 'object' && error !== null && 'errorType' in error && error.errorType === errorType;
};

describe('Exposes a correct API', function () {
    it('Has all expected methods defined', function () {
        assert.notEqual(apiSchema.get, undefined);
        assert.notEqual(apiSchema.list, undefined);
        assert.notEqual(apiSchema.validate, undefined);
    });

    describe('get', function () {
        it('Returns schema definition by name', function () {
            const postsDefinition = apiSchema.get('posts-edit');
            assert.ok(postsDefinition);
            assert.equal(postsDefinition.title, 'posts.edit');
            assert.equal(postsDefinition.properties.posts.items.allOf[0].$ref, 'posts#/definitions/post');
        });

        it('Returns null when schema definition does not exist', function () {
            const nonexistentSchema = apiSchema.get('imaginary');
            assert.equal(nonexistentSchema, null);
        });

        it('Returns null for inherited object properties', function () {
            assert.equal(apiSchema.get('toString'), null);
        });
    });

    describe('list', function () {
        it('Returns names of all available definitions for default version', function () {
            const definitions = apiSchema.list();
            const files = fs.readdirSync(new URL('../src/schemas', import.meta.url));
            // We only export the "action" files rather than definition, e.g. posts-add.json, not posts.json
            const exportedFiles = files
                .filter(file => /\w+-\w+.json/.test(file))
                .map(file => file.replace(/\.json$/, ''))
                .sort();
            assert.deepEqual([...definitions].sort(), exportedFiles);
        });
    });

    describe('validate', function () {
        it('Validates data', async function () {
            const data = {
                posts: [{
                    title: 'valid'
                }]
            };

            await assert.doesNotReject(() => apiSchema.validate({data, schema: 'posts-add'}));
        });

        it('Invalidates data', async function () {
            const data = {
                posts: [{
                    status: 'invalid status'
                }]
            };

            await assert.rejects(
                () => apiSchema.validate({data, schema: 'posts-add', definition: 'posts'}),
                error => hasErrorType(error, 'ValidationError')
            );
        });

        it('Unknown fields get ignored and trimmed', async function () {
            const data = {
                posts: [{
                    title: 'valid',
                    author: 'Beccy',
                    something: 'else'
                }]
            };

            assert.equal(data.posts[0]!.something, 'else');
            assert.equal(data.posts[0]!.author, 'Beccy');
            await assert.doesNotReject(() => apiSchema.validate({data, schema: 'posts-add', definition: 'posts'}));
            assert.equal(data.posts[0]!.something, undefined);
            assert.equal(data.posts[0]!.author, undefined);
        });

        it('Incorrect use throws an error', async function () {
            const data = {
                posts: [{
                    title: 'valid'
                }]
            };

            assert.throws(
                () => apiSchema.validate({data}),
                error => hasErrorType(error, 'IncorrectUsageError')
            );
        });

        it('Throws when an explicit definition does not exist', function () {
            assert.throws(
                () => apiSchema.validate({data: {}, schema: 'posts-add', definition: 'imaginary'}),
                error => hasErrorType(error, 'IncorrectUsageError')
            );
        });

        it('Accepts valid JSON string in mobiledoc field', async function () {
            const data = {
                posts: [{
                    title: 'test',
                    mobiledoc: '{"version":"0.3.1","atoms":[]}'
                }]
            };

            await apiSchema.validate({data, schema: 'posts-add', definition: 'posts'});
        });

        it('Rejects invalid JSON string in mobiledoc field', async function () {
            const data = {
                posts: [{
                    title: 'test',
                    mobiledoc: 'not valid json'
                }]
            };

            await assert.rejects(
                () => apiSchema.validate({data, schema: 'posts-add', definition: 'posts'}),
                (error) => {
                    assert.equal(hasErrorType(error, 'ValidationError'), true);
                    return true;
                }
            );
        });

        it('Accepts lowercase event in webhook', async function () {
            const data = {
                webhooks: [{
                    event: 'post.added',
                    target_url: 'https://example.com/hook'
                }]
            };

            await apiSchema.validate({data, schema: 'webhooks-add', definition: 'webhooks'});
        });

        it('Rejects uppercase event in webhook', async function () {
            const data = {
                webhooks: [{
                    event: 'Post.Added',
                    target_url: 'https://example.com/hook'
                }]
            };

            await assert.rejects(
                () => apiSchema.validate({data, schema: 'webhooks-add', definition: 'webhooks'}),
                (error) => {
                    assert.equal(hasErrorType(error, 'ValidationError'), true);
                    return true;
                }
            );
        });

        it('Passes isLowercase check when data is falsy (empty string)', async function () {
            const data = {
                webhooks: [{
                    event: '',
                    target_url: 'https://example.com/hook'
                }]
            };

            await apiSchema.validate({data, schema: 'webhooks-edit', definition: 'webhooks'});
        });

        it('Uses schema $id for error key when dataPath is empty', async function () {
            const data = {};

            await assert.rejects(
                () => apiSchema.validate({data, schema: 'posts-add', definition: 'posts'}),
                (error) => {
                    assert.equal(hasErrorType(error, 'ValidationError'), true);
                    assert.equal(typeof error === 'object' && error !== null && 'property' in error ? error.property : undefined, 'posts');
                    return true;
                }
            );
        });
    });
});
