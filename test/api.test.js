// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const fs = require('fs');
const path = require('path');
const apiSchema = require('../index');

describe('Exposes a correct API', function () {
    it('Has all expected methods defined', function () {
        apiSchema.get.should.not.be.undefined;
        apiSchema.list.should.not.be.undefined;
        apiSchema.validate.should.not.be.undefined;
    });

    describe('get', function () {
        it('Returns schema definition by name', function () {
            const postsDefinition = apiSchema.get('posts-edit');
            postsDefinition.title.should.eql('posts.edit');
            postsDefinition.properties.posts.items.allOf[0].$ref.should.equal('posts#/definitions/post');
        });

        it('Returns null when schema definition does not exist', function () {
            const nonExistantSchema = apiSchema.get('imaginary');
            should.equal(nonExistantSchema, null);
        });
    });

    describe('list', function () {
        it('Returns names of all available definitions for default version', async function () {
            const definitions = apiSchema.list();
            const files = fs.readdirSync(path.resolve(__dirname, '../lib/schemas'));
            // We only export the "action" files rather than definition, e.g. posts-add.json, not posts.json
            const exportedFiles = files.filter(file => /\w+-\w+.json/.test(file));
            definitions.length.should.eql(exportedFiles.length);
            definitions.includes('posts-add').should.equal(true);
        });
    });

    describe('validate', function () {
        it('Validates data', async function () {
            const data = {
                posts: [{
                    title: 'valid'
                }]
            };

            try {
                await apiSchema.validate({data, schema: 'posts-add'});
            } catch (err) {
                throw new Error('should not throw an error');
            }
        });

        it('Invalidates data', async function () {
            const data = {
                posts: [{
                    status: 'invalid status'
                }]
            };

            try {
                await apiSchema.validate({data, schema: 'posts-add', definition: 'posts'});
                throw new Error('should throw an error');
            } catch (err) {
                err.errorType.should.equal('ValidationError');
            }
        });

        it('Unknown fields get ignored and trimmed', async function () {
            const data = {
                posts: [{
                    title: 'valid',
                    author: 'Beccy',
                    something: 'else'
                }]
            };

            try {
                should.equal(data.posts[0].something, 'else');
                should.equal(data.posts[0].author, 'Beccy');
                await apiSchema.validate({data, schema: 'posts-add', definition: 'posts'});
                should.equal(data.posts[0].something, undefined);
                should.equal(data.posts[0].author, undefined);
            } catch (err) {
                throw new Error('should not throw an error');
            }
        });

        it('Incorrect use throws an error', async function () {
            const data = {
                posts: [{
                    title: 'valid'
                }]
            };

            try {
                await apiSchema.validate({data});
                throw new Error('should throw an error');
            } catch (err) {
                err.errorType.should.equal('IncorrectUsageError');
            }
        });
    });
});
