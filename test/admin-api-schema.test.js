// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const adminApiSchema = require('../lib');

describe('Admin API Schema', function () {
    it('returns validation result for invalid data', function () {
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
