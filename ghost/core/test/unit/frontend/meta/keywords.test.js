const should = require('should');
const sinon = require('sinon');
const models = require('../../../../core/server/models');
const getKeywords = require('../../../../core/frontend/meta/keywords');

describe('getKeywords', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should return tags as keywords if post has tags', function () {
        const keywords = getKeywords({
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

    it('should only return visible tags', function () {
        const keywords = getKeywords({
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

    it('should return null if post has tags is empty array', function () {
        const keywords = getKeywords({
            post: {
                tags: []
            }
        });
        should.equal(keywords, null);
    });

    it('should return null if post has no tags', function () {
        const keywords = getKeywords({
            post: {}
        });
        should.equal(keywords, null);
    });

    it('should return null if not a post', function () {
        const keywords = getKeywords({
            author: {}
        });
        should.equal(keywords, null);
    });
});
