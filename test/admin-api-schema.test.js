// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const adminApiSchema = require('../lib');

describe('Admin API Schema', function () {
    describe('usage basic usage', function () {
        it('does nothing when no parameters ara passed', function () {
            const validation = adminApiSchema.validate();

            should(validation).equal(undefined);
        });

        it('does nothing when no schema is passed', function () {
            const data = {};

            const validation = adminApiSchema.validate(null, null, data);

            should(validation).equal(undefined);
        });

        it('returns validation result when schema and data are passed', function () {
            const schema = require('./fixtures/basic-schema');
            const data = {};

            const validation = adminApiSchema.validate(schema, null, data);

            should(validation).not.be.undefined();
            should(validation.property).not.be.undefined();
            validation.errorDetails.should.be.an.Array();
        });
    });

    describe('basic schema', function () {
        it('passes validation', function () {
            const schema = require('./fixtures/basic-schema');
            const data = {
                first_name: 'Kate',
                last_name: 'Irrgang',
                age: 18
            };

            const validation = adminApiSchema.validate(schema, null, data);

            should(validation).equal(undefined);
        });

        it('fails validation', function () {
            const schema = require('./fixtures/basic-schema');
            const data = {
                first_name: 123,
                age: 'young'
            };

            const validation = adminApiSchema.validate(schema, null, data);

            validation.property.should.equal('first_name');
            validation.errorDetails.should.be.an.Array().and.have.lengthOf(3);
            validation.errorDetails[0].keyword.should.equal('type');
            validation.errorDetails[0].message.match('person');
            validation.errorDetails[1].keyword.should.equal('required');
            validation.errorDetails[1].message.match('person');
            validation.errorDetails[2].keyword.should.equal('type');
            validation.errorDetails[2].message.match('person');
        });
    });

    describe('predefined schema', function () {
        it('passes validation', function () {
            const schema = require(`../lib/schemas/posts-add`);
            const definitions = require('../lib/schemas/posts');

            const data = {
                posts: [{
                    title: 'Go Ghost!'
                }]
            };

            const validation = adminApiSchema.validate(schema, definitions, data);

            should(validation).equal(undefined);
        });

        it('fails validation', function () {
            const schema = require(`../lib/schemas/posts-add`);
            const definitions = require('../lib/schemas/posts');
            const data = {};

            const validation = adminApiSchema.validate(schema, definitions, data);

            validation.property.should.equal('posts');
            validation.errorDetails.should.be.an.Array().and.have.lengthOf(1);
            validation.errorDetails[0].keyword.should.equal('required');
            validation.errorDetails[0].message.match('posts');
        });
    });
});
