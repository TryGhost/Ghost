// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const apiSchema = require('@tryghost/admin-api-schema');

describe('Exposes a correct API', function () {
    it('Has all expected methods defined', function () {
        apiSchema.get.should.not.be.undefined;
        apiSchema.list.should.not.be.undefined;
        apiSchema.validate.should.not.be.undefined;
    });

    it('Throws when incorrect api version is passed in', function () {
        try {
            apiSchema.get('posts', 'v1');
        } catch (err) {
            err.errorType.should.equal('IncorrectUsageError');
        }
    });

    describe('default version (canary)', function () {
        describe('get', function () {
            it('Returns schema definition by name', function () {
                const postsDefinition = apiSchema.get('posts');
                postsDefinition.title.should.eql('posts');
                Object.keys(postsDefinition.definitions.post.properties).length.should.equal(44);
            });

            it('Returns null when schema definition does not exist', function () {
                const nonExistantSchema = apiSchema.get('imaginary');
                should.equal(nonExistantSchema, null);
            });
        });

        describe('list', function () {
            it('Returns names of all available definitions for default version', function () {
                const definitions = apiSchema.list();
                definitions.length.should.eql(14);
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
        });
    });

    describe('v2 version', function () {
        describe('get', function () {
            it('Returns schema definition by name', function () {
                const postsDefinition = apiSchema.get('posts', 'v2');
                postsDefinition.title.should.eql('posts');
                Object.keys(postsDefinition.definitions.post.properties).length.should.equal(41);
            });

            it('Returns null when schema definition does not exist', function () {
                const nonExistantSchema = apiSchema.get('imaginary', 'v2');
                should.equal(nonExistantSchema, null);
            });
        });

        describe('list', function () {
            it('Returns names of all available definitions for default version', function () {
                const definitions = apiSchema.list('v2');
                definitions.length.should.eql(7);
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
                    await apiSchema.validate({data, schema: 'posts-add', version: 'v2'});
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
                    await apiSchema.validate({data, schema: 'posts-add', version: 'v2'});
                    throw new Error('should throw an error');
                } catch (err) {
                    err.errorType.should.equal('ValidationError');
                }
            });
        });
    });
});
