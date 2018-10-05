var should = require('should'),
    testUtils = require('../../utils'),
    _ = require('lodash'),

// Stuff we are testing
    PostAPI = require('../../../server/api/v0.1/posts'),
    TagAPI = require('../../../server/api/v0.1/tags'),
    UserAPI = require('../../../server/api/v0.1/users');

describe('Advanced Browse', function () {
    // Initialise the DB just once, the tests are fetch-only
    before(testUtils.teardown);
    before(testUtils.setup('filter'));
    after(testUtils.teardown);

    should.exist(PostAPI);
    should.exist(TagAPI);
    should.exist(UserAPI);

    describe('Bad behaviour', function () {

    });
});
