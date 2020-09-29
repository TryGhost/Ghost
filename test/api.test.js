// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const apiSchema = require('@tryghost/admin-api-schema');

describe('Exposes a correct API', function () {
    it('Has all expected methods defined', function () {
        apiSchema.get.should.not.be.undefined;
        apiSchema.list.should.not.be.undefined;
        apiSchema.validate.should.not.be.undefined;

        apiSchema.v2.should.not.be.undefined;
        apiSchema.v2.get.should.not.be.undefined;
        apiSchema.v2.list.should.not.be.undefined;
        apiSchema.v2.validate.should.not.be.undefined;

        apiSchema.v3.should.not.be.undefined;
        apiSchema.v3.get.should.not.be.undefined;
        apiSchema.v3.list.should.not.be.undefined;
        apiSchema.v3.validate.should.not.be.undefined;

        apiSchema.canary.should.not.be.undefined;
        apiSchema.canary.get.should.not.be.undefined;
        apiSchema.canary.list.should.not.be.undefined;
        apiSchema.canary.validate.should.not.be.undefined;
    });

    describe('default version (canary)', function () {
        it('Is the same as canary', function () {
            should.equal(apiSchema.get, apiSchema.canary.get);
            should.equal(apiSchema.list, apiSchema.canary.list);
            should.equal(apiSchema.validate, apiSchema.canary.validate);
        });

        describe('get', function () {
            it('Returns schema definition by name', function () {
                const postsDefinition = apiSchema.get('posts');
                postsDefinition.title.should.eql('posts');
                Object.keys(postsDefinition.definitions.post.properties).length.should.equal(44);
            });

            it('Returns null when schema definition does not exist', function () {
                const nonExistantSchema = apiSchema.get('imaginary');
                should.equal(nonExistantSchema, undefined);
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
                    await apiSchema.validate({data, schema: 'posts-add', definitions: 'posts'});
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
                    await apiSchema.validate({data, schema: 'posts-add', definitions: 'posts'});
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
                const postsDefinition = apiSchema.v2.get('posts');
                postsDefinition.title.should.eql('posts');
                Object.keys(postsDefinition.definitions.post.properties).length.should.equal(41);
            });

            it('Returns null when schema definition does not exist', function () {
                const nonExistantSchema = apiSchema.v2.get('imaginary');
                should.equal(nonExistantSchema, undefined);
            });
        });

        describe('list', function () {
            it('Returns names of all available definitions for default version', function () {
                const definitions = apiSchema.v2.list();
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
                    await apiSchema.v2.validate({data, schema: 'posts-add', definitions: 'posts'});
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
                    await apiSchema.v2.validate({data, schema: 'posts-add', definitions: 'posts'});
                    throw new Error('should throw an error');
                } catch (err) {
                    err.errorType.should.equal('ValidationError');
                }
            });
        });
    });

    describe('v3 version', function () {
        it('Is the same as canary', function () {
            should.equal(apiSchema.v3.get, apiSchema.canary.get);
            should.equal(apiSchema.v3.list, apiSchema.canary.list);
            should.equal(apiSchema.v3.validate, apiSchema.canary.validate);
        });
    });
});
