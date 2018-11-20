const should = require('should');
const MembersApi = require('../../../server/lib/members');

describe('MembersApi lib', function () {
    it('exports a function', function () {
        should.equal(typeof MembersApi, 'function');
    });

    describe('MembersApi()', function () {
        it('returns a function', function () {
            should.equal(typeof MembersApi(), 'function');
        });
    });
});
