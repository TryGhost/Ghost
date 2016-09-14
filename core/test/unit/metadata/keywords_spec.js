var getKeywords = require('../../../server/data/meta/keywords'),
    sinon   = require('sinon'),
    labs    = require('../../../server/utils/labs'),
    should = require('should'),
    sandbox = sinon.sandbox.create();

describe('getKeywords', function () {
    afterEach(function () {
        sandbox.restore();
    });
    it('should return tags as keywords if post has tags', function () {
        var keywords = getKeywords({
            post: {
                tags: [
                    {name: 'one'},
                    {name: 'two'},
                    {name: 'three'}
                ]
            }
        });
        should.deepEqual(keywords, ['one', 'two', 'three']);
    });

    it('should only return visible tags if internal tags are enabled in labs', function () {
        sandbox.stub(labs, 'isSet').returns(true);
        var keywords = getKeywords({
            post: {
                tags: [
                    {name: 'one', visibility: 'public'},
                    {name: 'two', visibility: 'internal'},
                    {name: 'three'},
                    {name: 'four', visibility: 'internal'}
                ]
            }
        });
        should.deepEqual(keywords, ['one', 'three']);
    });

    it('should return all tags if internal tags are disabled in labs', function () {
        sandbox.stub(labs, 'isSet').returns(false);
        var keywords = getKeywords({
            post: {
                tags: [
                    {name: 'one', visibility: 'public'},
                    {name: 'two', visibility: 'internal'},
                    {name: 'three'},
                    {name: 'four', visibility: 'internal'}
                ]
            }
        });
        should.deepEqual(keywords, ['one', 'two', 'three', 'four']);
    });

    it('should return null if post has tags is empty array', function () {
        var keywords = getKeywords({
            post: {
                tags: []
            }
        });
        should.equal(keywords, null);
    });

    it('should return null if post has no tags', function () {
        var keywords = getKeywords({
            post: {}
        });
        should.equal(keywords, null);
    });

    it('should return null if not a post', function () {
        var keywords = getKeywords({
            author: {}
        });
        should.equal(keywords, null);
    });
});
