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
            apiSchema.get('posts-edit', 'v1');
        } catch (err) {
            err.errorType.should.equal('IncorrectUsageError');
        }
    });

    it('Can check validations in different API contexts', async function () {
        try {
            const v2Post = {
                posts: [{
                    title: 'Eggmeister'
                }]
            };

            await apiSchema.validate({data: v2Post, schema: 'posts-add', version: 'v2'});
        } catch (err) {
            throw new Error('should not throw an error');
        }

        try {
            const v3Post = {
                posts: [{
                    title: 'Donny is the king',
                    email_subject: 'Merlin\'s housewarming party'
                }]
            };

            await apiSchema.validate({data: v3Post, schema: 'posts-add', version: 'v3'});
        } catch (err) {
            throw new Error('should not throw an error');
        }
    });

    describe('default version (canary)', function () {
        describe('get', function () {
            it('Returns schema definition by name', function () {
                const postsDefinition = apiSchema.get('posts-edit');
                postsDefinition.title.should.eql('posts.edit');
                postsDefinition.properties.posts.items.allOf[0].$ref.should.equal('posts.canary#/definitions/post');
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

    describe('v2 version', function () {
        describe('get', function () {
            it('Returns schema definition by name', function () {
                const postsDefinition = apiSchema.get('posts-edit', 'v2');
                postsDefinition.title.should.eql('posts.edit');
                postsDefinition.properties.posts.items.allOf[0].$ref.should.equal('posts.v2#/definitions/post');
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

            it('Incorrect use throws an error', async function () {
                const data = {
                    posts: [{
                        title: 'valid'
                    }]
                };

                try {
                    await apiSchema.validate({data, version: 'v2'});
                    throw new Error('should throw an error');
                } catch (err) {
                    err.errorType.should.equal('IncorrectUsageError');
                }
            });
        });
    });
});
