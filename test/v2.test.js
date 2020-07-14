// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const postSchema = require('@tryghost/admin-api-schema/v2/posts.json');

describe('Exposes v2 schemas', function () {
    it('Can access posts resource schema', function () {
        postSchema.title.should.eql('posts');
        Object.keys(postSchema.definitions.post.properties).length.should.equal(39);
    });
});
